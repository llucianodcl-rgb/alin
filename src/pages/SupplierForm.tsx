import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, generateId } from '../db/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useFormDraft } from '../hooks/useFormDraft';
import { Supplier } from '../types';
import { maskCNPJ, maskPhone } from '../utils/masks';

const supplierSchema = z.object({
  companyName: z.string().min(2, 'Razão Social é obrigatória'),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  neighborhood: z.string().optional(),
  website: z.string().optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useNavigation();
  const isEditing = !!id;
  const { confirm, showUndo } = useNotification();
  const [oldSupplierData, setOldSupplierData] = useState<Supplier | null>(null);

  const { register, handleSubmit, reset, setValue, clearDraft, formState: { errors, isSubmitting } } = useFormDraft<SupplierFormData>({
    formId: isEditing ? `supplier_${id}` : 'supplier_new',
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {} as any
  });

  useEffect(() => {
    if (isEditing && id) {
      db.suppliers.get(id).then(supplier => {
        if (supplier) {
          setOldSupplierData(supplier);
          reset(supplier);
        }
      });
    }
  }, [id, isEditing, reset]);

  const onSubmit = (data: SupplierFormData) => {
    confirm({
      title: 'Salvar alterações',
      message: 'Deseja salvar as alterações neste fornecedor?',
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        try {
          if (isEditing && id) {
            const previousData = { ...oldSupplierData! };
            await db.suppliers.update(id, data);
            
            showUndo({
              message: 'Fornecedor atualizado com sucesso.',
              onUndo: async () => {
                await db.suppliers.update(id, previousData);
              }
            });
          } else {
            const newId = generateId();
            await db.suppliers.add({
              id: newId,
              ...data
            });
            
            showUndo({
              message: 'Fornecedor cadastrado com sucesso.',
              onUndo: async () => {
                await db.suppliers.delete(newId);
              }
            });
          }
          await clearDraft();
          navigate('/fornecedores', { replace: true });
        } catch (error) {
          console.error('Error saving supplier:', error);
          alert('Erro ao salvar fornecedor.');
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
            {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados Principais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="companyName">Razão Social / Nome da Empresa *</Label>
                <Input id="companyName" {...register('companyName')} />
                {errors.companyName && <p className="text-red-500 text-xs">{errors.companyName.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tradeName">Nome Fantasia</Label>
                <Input id="tradeName" {...register('tradeName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input 
                  id="cnpj" 
                  {...register('cnpj')} 
                  onChange={(e) => {
                    const masked = maskCNPJ(e.target.value);
                    setValue('cnpj', masked, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Contato & Endereço</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome do Contato</Label>
                <Input id="contactName" {...register('contactName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone Fixo</Label>
                <Input 
                  id="phone" 
                  {...register('phone')} 
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setValue('phone', masked, { shouldDirty: true });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input 
                  id="whatsapp" 
                  {...register('whatsapp')} 
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setValue('whatsapp', masked, { shouldDirty: true });
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://" {...register('website')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input id="zipCode" {...register('zipCode')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Logradouro (Endereço)</Label>
                <Input id="address" {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input id="number" {...register('number')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" {...register('complement')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" {...register('neighborhood')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" {...register('state')} />
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
            Salvar Fornecedor
          </Button>
        </div>
      </form>
    </div>
  );
}
