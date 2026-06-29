import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Employee } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

export default function EmployeesList() {
  const [searchTerm, setSearchTerm] = useListState('searchTerm', '');
  useScrollPreservation();
  const { confirm, showUndo } = useNotification();
  
  const employees = useLiveQuery(
    () => db.employees.toArray(),
    []
  );

  const handleDelete = (employee: Employee) => {
    confirm({
      title: 'Excluir funcionário',
      message: `Tem certeza de que deseja excluir o funcionário "${employee.name}"?`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        await db.employees.delete(employee.id!);
        showUndo({
          message: 'Funcionário excluído com sucesso.',
          onUndo: async () => {
            await db.employees.add(employee);
          }
        });
      }
    });
  };

  const filtered = employees?.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Funcionários</h1>
          <p className="text-slate-500 mt-1">Gerencie a equipe e salários</p>
        </div>
        <Link to="/funcionarios/novo">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            Novo Funcionário
          </Button>
        </Link>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Buscar por nome ou CPF..." 
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
                <th className="px-6 py-4 font-semibold">Nome</th>
                <th className="px-6 py-4 font-semibold">Cargo</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filtered?.length ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-slate-200 mb-3" />
                      <p>Nenhum funcionário encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{employee.name}</div>
                      <div className="text-xs text-slate-500">{employee.cpf}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {employee.role}
                      <div className="text-xs text-slate-400">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Link to={`/funcionarios/${employee.id}`}>
                        <Button variant="ghost" size="sm" className="font-semibold text-blue-600">Visualizar</Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(employee)}
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
