import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  cashRegisterRepository, 
  revenueRepository, 
  expenseRepository, 
  auditRepository 
} from '../../db/repository';
import { db } from '../../db/db';
import { CashRegister } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Plus, Edit2, Trash2, Power, Store } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useNotification } from '../../contexts/NotificationContext';

export function CashRegistersSettings() {
  const { showNotification: showToast, confirm } = useNotification();
  const registers = useLiveQuery(() => cashRegisterRepository.list(), []) || [];
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<CashRegister>>({
    name: '',
    code: '',
    description: '',
    status: 'ACTIVE',
    color: '#3b82f6',
    notes: ''
  });

  const handleOpenForm = (register?: CashRegister) => {
    if (register) {
      setEditingId(register.id!);
      setFormData(register);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        status: 'ACTIVE',
        color: '#3b82f6',
        notes: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const data: any = {
        name: formData.name,
        code: formData.code || '',
        description: formData.description || '',
        status: formData.status as 'ACTIVE' | 'INACTIVE',
        color: formData.color || '#3b82f6',
        notes: formData.notes || '',
      };

      if (editingId) {
        await cashRegisterRepository.update(editingId, data);
        
        await auditRepository.add({
          userId: 'system',
          userName: 'Sistema',
          timestamp: new Date().toISOString(),
          module: 'FINANCEIRO',
          action: 'UPDATE',
          targetName: `Caixa: ${data.name}`,
        } as any);
        showToast('Caixa atualizado com sucesso', 'success');
      } else {
        await cashRegisterRepository.add(data);
        
        await auditRepository.add({
          userId: 'system',
          userName: 'Sistema',
          timestamp: new Date().toISOString(),
          module: 'FINANCEIRO',
          action: 'CREATE',
          targetName: `Caixa: ${data.name}`,
        } as any);
        showToast('Caixa criado com sucesso', 'success');
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar caixa', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    confirm({
      title: 'Excluir Caixa',
      message: `Deseja realmente excluir o caixa "${name}"? Isso só é permitido se não houver movimentações.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const revenues = await revenueRepository.list({ cashRegisterId: id });
          const expenses = await expenseRepository.list({ cashRegisterId: id });
          
          if (revenues.length > 0 || expenses.length > 0) {
            showToast('Não é possível excluir caixas com movimentações. Você pode desativá-lo.', 'error');
            return;
          }
          
          await cashRegisterRepository.delete(id);
          await auditRepository.add({
            userId: 'system',
            userName: 'Sistema',
            timestamp: new Date().toISOString(),
            module: 'FINANCEIRO',
            action: 'DELETE',
            targetName: `Caixa: ${name}`,
          } as any);
          showToast('Caixa excluído com sucesso', 'success');
        } catch (error) {
          console.error(error);
          showToast('Erro ao excluir caixa', 'error');
        }
      }
    });
  };

  const handleToggleStatus = async (register: CashRegister) => {
    const newStatus = register.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await cashRegisterRepository.update(register.id!, { status: newStatus });
      showToast(`Caixa ${newStatus === 'ACTIVE' ? 'ativado' : 'desativado'}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao alterar status', 'error');
    }
  };

  if (isFormOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Editar Caixa' : 'Novo Caixa'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Caixa *</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                  placeholder="Ex: Caixa Principal"
                />
              </div>
              <div className="space-y-2">
                <Label>Código Interno</Label>
                <Input 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                  placeholder="Ex: CX01"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor de Identificação</Label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={formData.color} 
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    className="h-10 w-16 p-1 border rounded-lg cursor-pointer"
                  />
                  <span className="text-sm text-slate-500 font-mono">{formData.color}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Situação</Label>
                <Select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE'})}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Ex: Caixa destinado ao delivery"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Observações</Label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Caixa</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gerenciar Caixas</h2>
          <p className="text-sm text-slate-500">Cadastre e gerencie os caixas da sua empresa.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Caixa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {registers.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Nenhum caixa cadastrado.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => handleOpenForm()}>
              Cadastrar Primeiro Caixa
            </Button>
          </div>
        ) : (
          registers.map(register => (
            <Card key={register.id} className={`relative overflow-hidden ${register.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: register.color }} />
              <CardContent className="p-4 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      {register.name}
                      {register.code && <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{register.code}</span>}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{register.description || 'Sem descrição'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${register.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {register.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-50">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenForm(register)} className="flex-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(register)} className="flex-1 text-slate-600">
                    <Power className="w-3.5 h-3.5 mr-1.5" /> {register.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(register.id!, register.name)} className="px-2 text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
