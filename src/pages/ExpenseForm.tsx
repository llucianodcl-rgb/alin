import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '../db/db';
import { expenseRepository } from '../db/repository';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useFormDraft } from '../hooks/useFormDraft';
import { Expense } from '../types';
import { maskCurrency, parseCurrency } from '../utils/masks';

const expenseSchema = z.object({
  description: z.string().min(2, 'Descrição é obrigatória'),
  amount: z.preprocess((val) => typeof val === 'string' ? parseCurrency(val) : Number(val) || 0, z.number().min(0.01, 'Valor deve ser maior que 0')),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  paymentDate: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  costCenterId: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']),
  isRecurring: z.boolean(),
  recurrencePeriod: z.enum(['NONE', 'MONTHLY', 'YEARLY']),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpenseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useNavigation();
  const isEditing = !!id;
  const { confirm, showUndo } = useNotification();
  const { isReadOnly } = useAuth();
  const [oldData, setOldData] = useState<Expense | null>(null);

  const { register, handleSubmit, reset, watch, setValue, clearDraft, formState: { errors } } = useFormDraft<ExpenseFormData>({
    formId: isEditing ? `expense_${id}` : 'expense_new',
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      status: 'PENDING',
      dueDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      recurrencePeriod: 'NONE'
    } as any
  });

  const isRecurring = watch('isRecurring');

  useEffect(() => {
    if (isEditing && id) {
      expenseRepository.get(id).then(exp => {
        if (exp) {
          setOldData(exp);
          reset(exp as any);
        }
      });
    }
  }, [id, isEditing, reset]);

  const onSubmit = (data: ExpenseFormData) => {
    confirm({
      title: 'Salvar despesa',
      message: 'Deseja salvar as informações desta despesa?',
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        try {
          if (isEditing && id) {
            const previousData = { ...oldData! };
            await expenseRepository.update(id, data as any);
            
            showUndo({
              message: 'Despesa atualizada.',
              onUndo: async () => {
                await expenseRepository.update(id, previousData as any);
              }
            });
          } else {
            const newId = await expenseRepository.add(data as any, {
              monthlyExpenses: data.amount
            });
            
            showUndo({
              message: 'Despesa cadastrada.',
              onUndo: async () => {
                await expenseRepository.delete(newId, {
                  monthlyExpenses: -data.amount
                });
              }
            });
          }
          await clearDraft();
          navigate('/financeiro/despesas', { replace: true });
        } catch (error) {
          console.error('Error saving expense:', error);
          alert('Erro ao salvar despesa.');
        }
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEditing ? 'Atualize os dados da conta a pagar' : 'Registre uma nova conta a pagar'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição *</Label>
                <Input {...register('description')} error={errors.description?.message} placeholder="Ex: Aluguel do Mês, Conta de Energia..." />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input 
                  {...register('amount')} 
                  onChange={(e) => {
                    const masked = maskCurrency(e.target.value);
                    setValue('amount', masked as any, { shouldDirty: true });
                  }}
                  error={errors.amount?.message} 
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" {...register('dueDate')} error={errors.dueDate?.message} />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select {...register('status')}>
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Paga</option>
                  <option value="OVERDUE">Atrasada</option>
                  <option value="CANCELLED">Cancelada</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Pagamento</Label>
                <Input type="date" {...register('paymentDate')} />
              </div>
              <div className="space-y-2 md:col-span-2 flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isRecurring"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  {...register('isRecurring')} 
                />
                <Label htmlFor="isRecurring" className="cursor-pointer mb-0">Despesa Recorrente?</Label>
              </div>
              
              {isRecurring && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Frequência *</Label>
                  <Select {...register('recurrencePeriod')}>
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2 mt-4">
                <Label>Observações</Label>
                <Input {...register('notes')} placeholder="Informações adicionais..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={goBack}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isReadOnly}>
            <Save className="w-5 h-5 mr-2" />
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Despesa'}
          </Button>
        </div>
      </form>
    </div>
  );
}
