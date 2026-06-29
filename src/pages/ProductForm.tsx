import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ArrowLeft, Save } from 'lucide-react';
import { Product } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useFormDraft } from '../hooks/useFormDraft';

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
  unitCost: z.coerce.number().optional(),
  packageCost: z.coerce.number().optional(),
  batch: z.string().optional(),
  manufactureDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  noExpiration: z.boolean(),
  expirationDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  initialQuantity: z.coerce.number().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useNavigation();
  const isEditing = !!id;
  const { confirm, showUndo } = useNotification();
  const [oldProductData, setOldProductData] = useState<Product | null>(null);

  const categories = useLiveQuery(() => db.categories.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());

  const { register, handleSubmit, watch, setValue, reset, clearDraft, formState: { errors, isSubmitting } } = useFormDraft<ProductFormData>({
    formId: isEditing ? `product_${id}` : 'product_new',
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      noExpiration: false,
      unitOfMeasure: 'Unidade',
      minQuantity: 5,
      initialQuantity: 0,
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
            await db.products.update(id, productData);
            
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
                <Input id="barcode" {...register('barcode')} placeholder="EAN-13, etc." />
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Input id="unitCost" type="number" step="0.01" {...register('unitCost')} />
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
                <Label htmlFor="location">Localização no Estoque</Label>
                <Input id="location" {...register('location')} placeholder="Ex: Corredor A, Prateleira 4" />
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
