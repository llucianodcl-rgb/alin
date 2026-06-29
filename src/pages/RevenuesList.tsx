import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Plus, Search, Wallet, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Revenue } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

export default function RevenuesList() {
  const [searchTerm, setSearchTerm] = useListState('searchTerm', '');
  useScrollPreservation();
  const { confirm, showUndo } = useNotification();
  
  const revenues = useLiveQuery(
    () => db.revenues.orderBy('date').reverse().toArray(),
    []
  );

  const handleDelete = (revenue: Revenue) => {
    confirm({
      title: 'Excluir receita',
      message: `Tem certeza de que deseja excluir a receita "${revenue.description}"?`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        await db.revenues.delete(revenue.id!);
        showUndo({
          message: 'Receita excluída com sucesso.',
          onUndo: async () => {
            await db.revenues.add(revenue);
          }
        });
      }
    });
  };

  const filtered = revenues?.filter(r => 
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Recebida</span>;
      case 'EXPECTED':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> Prevista</span>;
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receitas</h1>
          <p className="text-slate-500 mt-1">Gerencie suas vendas e recebimentos</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Buscar por descrição..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Fonte</th>
                <th className="px-6 py-4 font-semibold">Valor</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filtered?.length ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Wallet className="w-12 h-12 text-slate-200 mb-3" />
                      <p>Nenhuma receita encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((revenue) => (
                  <tr key={revenue.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{revenue.description}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(revenue.date)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {revenue.source === 'SALE' ? 'Venda' : 'Outro'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(revenue.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(revenue.status)}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(revenue)}
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
