import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { History, ArrowLeft, Search, FileText, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';

export default function ImportHistory() {
  const navigate = useNavigate();
  const history = useLiveQuery(() => db.importHistory.orderBy('date').reverse().toArray(), []) || [];
  const registers = useLiveQuery(() => db.cashRegisters.toArray(), []) || [];
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(h => 
    h.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatStatus = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Sucesso</span>;
      case 'PARTIAL': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold"><AlertCircle className="w-3 h-3" /> Parcial</span>;
      case 'FAILED': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold"><XCircle className="w-3 h-3" /> Falhou</span>;
      default: return status;
    }
  };

  const getRegisterName = (id?: string) => {
    if (!id) return '-';
    return registers.find(r => r.id === id)?.name || 'Caixa Removido';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/almoxarifado/importacoes')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-600" />
              Histórico de Importações
            </h1>
            <p className="text-sm text-slate-500">Registro completo de todos os arquivos processados.</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome do arquivo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Data/Hora</th>
                <th className="px-6 py-4 font-semibold">Arquivo</th>
                <th className="px-6 py-4 font-semibold">Caixa</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold text-center">Registros</th>
                <th className="px-6 py-4 font-semibold text-center">Sucesso/Erros</th>
                <th className="px-6 py-4 font-semibold text-center">Tempo (ms)</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma importação encontrada.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(item.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {item.fileName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {getRegisterName(item.cashRegisterId)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {item.type === 'SALES' ? 'Vendas' : item.type}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {item.recordsTotal}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-emerald-600 font-medium">{item.successCount}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-red-600 font-medium">{item.errorCount}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">
                      {item.timeMs}ms
                    </td>
                    <td className="px-6 py-4">
                      {formatStatus(item.status)}
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
