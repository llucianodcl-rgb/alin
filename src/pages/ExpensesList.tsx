import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Plus, Search, CreditCard, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Expense } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

export default function ExpensesList() {
  const [searchTerm, setSearchTerm] = useListState('searchTerm', '');
  const [filterStatus, setFilterStatus] = useListState('filterStatus', 'ALL');
  useScrollPreservation();
  const { confirm, showUndo } = useNotification();
  const { isReadOnly } = useAuth();
  
  const expenses = useLiveQuery(
    () => db.expenses.orderBy('dueDate').reverse().toArray(),
    []
  );

  const handleDelete = (expense: Expense) => {
    confirm({
      title: 'Excluir despesa',
      message: `Tem certeza de que deseja excluir a despesa "${expense.description}"?`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        await db.expenses.delete(expense.id!);
        showUndo({
          message: 'Despesa excluída com sucesso.',
          onUndo: async () => {
            await db.expenses.add(expense);
          }
        });
      }
    });
  };

  const handlePay = (expense: Expense) => {
    confirm({
      title: 'Marcar como paga',
      message: 'Confirmar pagamento desta despesa?',
      confirmLabel: 'Confirmar',
      onConfirm: async () => {
        const previousData = { ...expense };
        await db.expenses.update(expense.id!, { status: 'PAID' });
        showUndo({
          message: 'Despesa marcada como paga.',
          onUndo: async () => {
            await db.expenses.update(expense.id!, previousData);
          }
        });
      }
    });
  };

  const filtered = expenses?.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Paga</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> Pendente</span>;
      case 'OVERDUE':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium"><AlertCircle className="w-3 h-3" /> Atrasada</span>;
      case 'CANCELLED':
        return <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium">Cancelada</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contas a Pagar</h1>
          <p className="text-slate-500 mt-1">Gerencie suas despesas e obrigações</p>
        </div>
        {!isReadOnly && (
          <Link to="/financeiro/despesas/nova">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Nova Despesa
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Buscar por descrição..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {['ALL', 'PENDING', 'PAID', 'OVERDUE'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status === 'ALL' && 'Todas'}
                {status === 'PENDING' && 'Pendentes'}
                {status === 'PAID' && 'Pagas'}
                {status === 'OVERDUE' && 'Atrasadas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Vencimento</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filtered?.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <CreditCard className="w-12 h-12 text-slate-200 mb-3" />
                      <p>Nenhuma despesa encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{expense.description}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(expense.dueDate)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(expense.status)}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {expense.status !== 'PAID' && (
                        <Button variant="ghost" size="sm" className="font-semibold text-emerald-600 hover:bg-emerald-50" onClick={() => handlePay(expense)}>
                          Pagar
                        </Button>
                      )}
                      <Link to={`/financeiro/despesas/${expense.id}`}>
                        <Button variant="ghost" size="sm" className="font-semibold text-blue-600">Editar</Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(expense)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
