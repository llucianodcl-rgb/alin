import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Plus, Search, Truck, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Supplier } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

export default function SuppliersList() {
  const [searchTerm, setSearchTerm] = useListState('searchTerm', '');
  useScrollPreservation();
  const { confirm, showUndo } = useNotification();
  
  const suppliers = useLiveQuery(
    () => db.suppliers.toArray(),
    []
  );

  const handleDelete = (supplier: Supplier) => {
    confirm({
      title: 'Excluir fornecedor',
      message: `Tem certeza de que deseja excluir o fornecedor "${supplier.companyName}"? Esta ação poderá ser desfeita durante os próximos 5 segundos.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        await db.suppliers.delete(supplier.id!);
        
        showUndo({
          message: 'Fornecedor excluído com sucesso.',
          onUndo: async () => {
            await db.suppliers.add(supplier);
          }
        });
      }
    });
  };

  const filtered = suppliers?.filter(s => 
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.cnpj?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fornecedores</h1>
          <p className="text-sm text-slate-500">Gerencie seus parceiros e fornecedores.</p>
        </div>
        <Link to="/fornecedores/novo">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </Link>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou CNPJ..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-xs border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">CNPJ</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Truck className="w-12 h-12 text-slate-300 mb-3" />
                      <p>Nenhum fornecedor encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered?.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{supplier.companyName}</div>
                      {supplier.tradeName && <div className="text-slate-500 text-xs">{supplier.tradeName}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {supplier.cnpj || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{supplier.contactName || '-'}</div>
                      <div className="text-xs text-slate-400">{supplier.phone || supplier.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Link to={`/fornecedores/${supplier.id}`}>
                        <Button variant="ghost" size="sm" className="font-semibold text-blue-600">Visualizar</Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(supplier)}
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
      </div>
    </div>
  );
}
