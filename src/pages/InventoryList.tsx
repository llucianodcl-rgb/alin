import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Inventory } from '../types';
import { ClipboardList, Plus, Search, Filter, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function InventoryList() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const inventories = useLiveQuery(
    () => db.inventories.orderBy('startDate').reverse().toArray()
  ) || [];
  
  const loading = inventories === undefined;

  const filtered = inventories.filter(inv => 
    inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.responsibleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventários</h1>
          <p className="text-sm text-slate-500">Controle físico de estoque e auditoria.</p>
        </div>
        <button 
          onClick={() => navigate('/app/almoxarifado/inventario/novo')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Inventário
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
            <p>Nenhum inventário encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-600">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Data Início</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Diferença Financeira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map(inv => (
                  <tr 
                    key={inv.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/almoxarifado/inventario/${inv.id}`)}
                  >
                    <td className="p-4 font-medium text-slate-800">{inv.name}</td>
                    <td className="p-4 text-slate-600">{inv.responsibleName}</td>
                    <td className="p-4 text-slate-600">{new Date(inv.startDate).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-600">{inv.type === 'FULL' ? 'Geral' : 'Parcial'}</td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        {inv.status === 'APPROVED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Aprovado</span>}
                        {inv.status === 'REJECTED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertCircle className="w-3.5 h-3.5" /> Rejeitado</span>}
                        {inv.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3.5 h-3.5" /> Pendente</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${inv.totalFinancialDifference < 0 ? 'text-red-600' : inv.totalFinancialDifference > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.totalFinancialDifference || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
