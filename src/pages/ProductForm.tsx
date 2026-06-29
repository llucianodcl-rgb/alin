import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, generateId } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Save, AlertTriangle, Camera } from 'lucide-react';
import { Product } from '../types';
import { ScannerDialog } from '../components/scanner/ScannerDialog';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useFormDraft } from '../hooks/useFormDraft';
import { maskCurrency, parseCurrency } from '../utils/masks';

import { auditService } from '../services/AuditService';
import { useAuth } from '../contexts/AuthContext';

const productSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  internalCode: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  supplierId: z.string().optional(),
  brand: z.string().optional(),
  unitOfMeasure: z.enum(['Unidade', 'Caixa', 'Fardo', 'Quilograma', 'Litro', 'Metro', 'Pacote', 'Outro']),
  minQuantity: z.coerce.number().min(0),
  quantityPerPackage: z.coerce.number().optional(),
  unitCost: z.preprocess((val) => typeof val === 'string' ? parseCurrency(val) : Number(val) || 0, z.number().optional()),
  packageCost: z.preprocess((val) => typeof val === 'string' ? parseCurrency(val) : Number(val) || 0, z.number().optional()),
  batch: z.string().optional(),
  manufactureDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  noExpiration: z.boolean(),
  expirationDate: z.string().optional(),
  locationId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  initialQuantity: z.coerce.number().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { goBack } = useNavigation();
  const isEditing = !!id;
  const { confirm, showUndo } = useNotification();
  const { profile } = useAuth();
  const [oldProductData, setOldProductData] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const categories = useLiveQuery(() => db.categories.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());

  const getLocationPath = useCallback((locId: string): string => {
    if (!locations) return '';
    const path: string[] = [];
    let current = locations.find(l => l.id === locId);
    while (current) {
      path.unshift(current.name);
      if (current.parentId) {
        current = locations.find(l => l.id === current!.parentId);
      } else {
        current = undefined;
      }
    }
    return path.join(' > ');
  }, [locations]);

  const { register, handleSubmit, watch, setValue, reset, clearDraft, formState: { errors, isSubmitting } } = useFormDraft<ProductFormData>({
    formId: isEditing ? `product_${id}` : 'product_new',
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      noExpiration: false,
      unitOfMeasure: searchParams.get('unit') || 'Unidade',
      minQuantity: 5,
      initialQuantity: 0,
      barcode: searchParams.get('barcode') || '',
      name: searchParams.get('name') || '',
      brand: searchParams.get('brand') || '',
    } as any
  });

  const noExpiration = watch('noExpiration');

  useEffect(() => {
    if (isEditing && id) {
      db.products.get(id).then(product => {
        if (product) {
          setOldProductData(product);
          reset({
            ...product,
            initialQuantity: undefined // Don't allow editing initial quantity
          });
        }
      });
    }
  }, [id, isEditing, reset]);

  const onSubmit = (data: ProductFormData) => {
    confirm({
      title: 'Salvar alterações',
      message: 'Deseja salvar as alterações realizadas?',
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        try {
          const { initialQuantity, ...productData } = data;
          
          if (isEditing && id) {
            const previousData = { ...oldProductData! };
            const updatedData = {
              ...productData,
              locationPath: productData.locationId ? getLocationPath(productData.locationId) : undefined
            };
            await db.products.update(id, updatedData);
            
            if (profile) {
              await auditService.log({
                userId: profile.uid,
                userName: profile.displayName || profile.email || 'Usuário',
                module: 'ALMOXARIFADO',
                action: 'UPDATE',
                targetId: id,
                targetName: updatedData.name,
                oldValue: previousData,
                newValue: updatedData,
                details: previousData.locationId !== updatedData.locationId 
                  ? `Local alterado de ${previousData.locationPath || 'Nenhum'} para ${updatedData.locationPath || 'Nenhum'}`
                  : 'Produto editado.'
              });
            }

            showUndo({
              message: 'Produto atualizado com sucesso.',
              onUndo: async () => {
                await db.products.update(id, previousData);
              }
            });
          } else {
            const newProductId = generateId();
            const productToSave = {
              id: newProductId,
              ...productData,
              locationPath: productData.locationId ? getLocationPath(productData.locationId) : undefined,
              currentStock: initialQuantity || 0
            };
            await db.products.add(productToSave as any);

            let eventId: string | null = null;
            // Add initial stock event if quantity > 0
            if (initialQuantity && initialQuantity > 0) {
              eventId = generateId();
              await db.stockEvents.add({
                id: eventId,
                productId: newProductId,
                type: 'ENTRADA',
                quantity: initialQuantity,
                date: new Date().toISOString(),
                notes: 'Estoque inicial (Cadastro)',
                unitCost: data.unitCost
              });
            }
            
            if (profile) {
              await auditService.log({
                userId: profile.uid,
                userName: profile.displayName || profile.email || 'Usuário',
                module: 'ALMOXARIFADO',
                action: 'CREATE',
                targetId: newProductId,
                targetName: productData.name,
                newValue: productToSave,
                quantityChanged: initialQuantity || 0,
                details: 'Produto cadastrado.'
              });
            }

            showUndo({
              message: 'Produto cadastrado com sucesso.',
              onUndo: async () => {
                await db.products.delete(newProductId);
                if (eventId) await db.stockEvents.delete(eventId);
              }
            });
          }
          await clearDraft();
          navigate('/produtos', { replace: true });
        } catch (error) {
          console.error('Error saving product:', error);
          alert('Erro ao salvar produto.');
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-sm text-slate-500">
            {isEditing ? 'Atualize os dados do produto.' : 'Cadastre um novo item no estoque.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Informações Básicas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input id="name" {...register('name')} placeholder="Ex: Caderno Universitário" />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" {...register('brand')} placeholder="Ex: Tilibra" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalCode">Código Interno</Label>
                <Input id="internalCode" {...register('internalCode')} placeholder="Ex: PRD-001" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <div className="flex gap-2">
                  <Input id="barcode" {...register('barcode')} placeholder="EAN-13, etc." />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="shrink-0 gap-2 border-dashed border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <Camera className="w-4 h-4" />
                    Ler Código
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ScannerDialog 
          isOpen={isScannerOpen} 
          onClose={() => setIsScannerOpen(false)}
          mode="CADASTRO"
        />

        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Classificação & Estoque</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria *</Label>
                <Select id="categoryId" {...register('categoryId')}>
                  <option value="">Selecione...</option>
                  {categories?.map(c => (
                    <option key={c.id} value={c.id!}>{c.name}</option>
                  ))}
                </Select>
                {errors.categoryId && <p className="text-red-500 text-xs">{errors.categoryId.message}</p>}
                {categories?.length === 0 && (
                  <p className="text-xs text-amber-600">Nenhuma categoria cadastrada.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierId">Fornecedor Preferencial</Label>
                <Select id="supplierId" {...register('supplierId')}>
                  <option value="">Selecione...</option>
                  {suppliers?.map(s => (
                    <option key={s.id} value={s.id!}>{s.companyName}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unidade de Medida</Label>
                <Select id="unitOfMeasure" {...register('unitOfMeasure')}>
                  <option value="Unidade">Unidade</option>
                  <option value="Caixa">Caixa</option>
                  <option value="Fardo">Fardo</option>
                  <option value="Quilograma">Quilograma</option>
                  <option value="Litro">Litro</option>
                  <option value="Metro">Metro</option>
                  <option value="Pacote">Pacote</option>
                  <option value="Outro">Outro</option>
                </Select>
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="initialQuantity">Quantidade Inicial</Label>
                  <Input id="initialQuantity" type="number" step="any" {...register('initialQuantity')} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="minQuantity">Quantidade Mínima de Alerta</Label>
                <Input id="minQuantity" type="number" step="any" {...register('minQuantity')} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unitCost">Custo Unitário (R$)</Label>
                <Input 
                  id="unitCost" 
                  {...register('unitCost')} 
                  onChange={(e) => {
                    const masked = maskCurrency(e.target.value);
                    setValue('unitCost', masked as any, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Rastreabilidade & Validade</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-center space-y-4 md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    {...register('noExpiration')}
                  />
                  <span className="text-sm font-medium text-slate-900">Produto sem validade imperecível (ex: materiais de escritório)</span>
                </label>
              </div>

              {!noExpiration && (
                <div className="space-y-2">
                  <Label htmlFor="expirationDate">Data de Validade</Label>
                  <Input id="expirationDate" type="date" {...register('expirationDate')} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="batch">Lote Padrão</Label>
                <Input id="batch" {...register('batch')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationId">Localização no Estoque</Label>
                <Select id="locationId" {...register('locationId')}>
                  <option value="">Sem localização definida</option>
                  {locations?.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {getLocationPath(loc.id!)}
                    </option>
                  ))}
                </Select>
                {locations?.length === 0 ? (
                  <p className="text-xs text-amber-600">Cadastre a estrutura do depósito no Mapa Inteligente.</p>
                ) : !watch('locationId') ? (
                  <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800">
                      <strong>Dica Inteligente:</strong> Cadastre a localização física deste produto para facilitar processos de inventário, separação de pedidos e buscas no depósito.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={goBack}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
