import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '../db/db';
import { employeeRepository } from '../db/repository';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, Save, MapPin, Pencil } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useFormDraft } from '../hooks/useFormDraft';
import { Employee } from '../types';

import { maskCPF, maskPhone, maskCurrency, parseCurrency } from '../utils/masks';

const employeeSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  civilStatus: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  role: z.string().min(2, 'Cargo é obrigatório'),
  department: z.string().optional(),
  admissionDate: z.string().min(1, 'Data de admissão é obrigatória'),
  terminationDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'VACATION', 'LEAVE', 'SUSPENDED', 'TERMINATED']),
  notes: z.string().optional(),
  salary: z.preprocess((val) => typeof val === 'string' ? parseCurrency(val) : Number(val) || 0, z.number().min(0, 'Salário deve ser maior que 0')),
  transportAllowance: z.preprocess((val) => val === '' || val == null ? undefined : (typeof val === 'string' ? parseCurrency(val) : Number(val)), z.number().optional()),
  foodAllowance: z.preprocess((val) => val === '' || val == null ? undefined : (typeof val === 'string' ? parseCurrency(val) : Number(val)), z.number().optional()),
  commission: z.preprocess((val) => val === '' || val == null ? undefined : (typeof val === 'string' ? parseCurrency(val) : Number(val)), z.number().optional()),
  bonus: z.preprocess((val) => val === '' || val == null ? undefined : (typeof val === 'string' ? parseCurrency(val) : Number(val)), z.number().optional()),
  deductions: z.preprocess((val) => val === '' || val == null ? undefined : (typeof val === 'string' ? parseCurrency(val) : Number(val)), z.number().optional()),
  payday: z.preprocess((val) => Number(val) || 1, z.number().min(1).max(31)),
  bank: z.string().optional(),
  agency: z.string().optional(),
  account: z.string().optional(),
  pix: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { goBack } = useNavigation();
  const isNew = !id;
  const [editMode, setEditMode] = useState(isNew);
  const { confirm, showUndo } = useNotification();
  const [oldData, setOldData] = useState<Employee | null>(null);

  const { register, handleSubmit, reset, watch, setValue, clearDraft, formState: { errors } } = useFormDraft<EmployeeFormData>({
    formId: !isNew ? `employee_${id}` : 'employee_new',
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      status: 'ACTIVE',
      admissionDate: new Date().toISOString().split('T')[0],
      payday: 5,
      salary: 0
    } as any,
    disabled: !editMode
  });

  const address = watch('address');
  const city = watch('city');
  const state = watch('state');

  useEffect(() => {
    if (!isNew && id) {
      employeeRepository.get(id).then(emp => {
        if (emp) {
          setOldData(emp);
          reset(emp as any);
        }
      });
    }
  }, [id, isNew, reset]);

  const onSubmit = (data: EmployeeFormData) => {
    confirm({
      title: 'Salvar funcionário',
      message: 'Deseja salvar as informações deste funcionário?',
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        try {
          if (!isNew && id) {
            const previousData = { ...oldData! };
            await employeeRepository.update(id, data as any);
            
            showUndo({
              message: 'Funcionário atualizado.',
              onUndo: async () => {
                await employeeRepository.update(id, previousData as any);
              }
            });
          } else {
            const newId = await employeeRepository.add(data as any, {
              totalEmployees: 1
            });
            
            showUndo({
              message: 'Funcionário cadastrado.',
              onUndo: async () => {
                await employeeRepository.delete(newId, {
                  totalEmployees: -1
                });
              }
            });
          }
          await clearDraft();
          navigate('/funcionarios', { replace: true });
        } catch (error) {
          console.error('Error saving employee:', error);
          alert('Erro ao salvar funcionário.');
        }
      }
    });
  };

  const openMap = () => {
    if (address && city) {
      const query = encodeURIComponent(`${address}, ${city} - ${state || ''}`);
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    } else {
      alert('Preencha o endereço e a cidade para abrir no mapa.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {!isNew ? 'Visualizar Funcionário' : 'Novo Funcionário'}
          </h1>
          <p className="text-slate-500 mt-1">
            {!isNew ? 'Dados do funcionário' : 'Cadastre um novo membro da equipe'}
          </p>
        </div>
      </div>
      
      {!isNew && !editMode && (
        <div className="flex justify-end">
          <Button onClick={() => setEditMode(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={!editMode} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados Pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input {...register('name')} error={errors.name?.message} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input 
                    {...register('cpf')} 
                    onChange={(e) => {
                      const masked = maskCPF(e.target.value);
                      setValue('cpf', masked, { shouldDirty: true });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input {...register('rg')} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" {...register('birthDate')} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" {...register('email')} />
                </div>
                <div className="space-y-2">
                  <Label>Celular / WhatsApp</Label>
                  <Input 
                    {...register('whatsapp')} 
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      setValue('whatsapp', masked, { shouldDirty: true });
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold text-slate-900">Endereço</h2>
                <Button type="button" variant="ghost" size="sm" onClick={openMap} className="text-blue-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  Abrir no Mapa
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Rua / Logradouro</Label>
                  <Input {...register('address')} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input {...register('number')} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input {...register('neighborhood')} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input {...register('city')} />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input {...register('state')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados Profissionais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <Input {...register('role')} error={errors.role?.message} />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input {...register('department')} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Admissão *</Label>
                  <Input type="date" {...register('admissionDate')} error={errors.admissionDate?.message} />
                </div>
                <div className="space-y-2">
                  <Label>Situação *</Label>
                  <Select {...register('status')}>
                    <option value="ACTIVE">Ativo</option>
                    <option value="VACATION">Férias</option>
                    <option value="LEAVE">Licença</option>
                    <option value="SUSPENDED">Afastado</option>
                    <option value="TERMINATED">Desligado</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados Financeiros</h2>
              <p className="text-sm text-slate-500 mb-4">
                Funcionários ativos geram automaticamente uma despesa recorrente no dia do pagamento.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Salário (R$) *</Label>
                  <Input 
                    {...register('salary')} 
                    onChange={(e) => {
                      const masked = maskCurrency(e.target.value);
                      setValue('salary', masked as any, { shouldDirty: true });
                    }}
                    error={errors.salary?.message} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia do Pagamento *</Label>
                  <Input type="number" min="1" max="31" {...register('payday')} error={errors.payday?.message} />
                </div>
                <div className="space-y-2">
                  <Label>Vale Transporte (R$)</Label>
                  <Input 
                    {...register('transportAllowance')} 
                    onChange={(e) => {
                      const masked = maskCurrency(e.target.value);
                      setValue('transportAllowance', masked as any, { shouldDirty: true });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vale Alimentação (R$)</Label>
                  <Input 
                    {...register('foodAllowance')} 
                    onChange={(e) => {
                      const masked = maskCurrency(e.target.value);
                      setValue('foodAllowance', masked as any, { shouldDirty: true });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input {...register('pix')} />
                </div>
              </div>
            </CardContent>
          </Card>
        </fieldset>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={goBack}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save className="w-5 h-5 mr-2" />
            {!isNew ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
          </Button>
        </div>
      </form>
    </div>
  );
}