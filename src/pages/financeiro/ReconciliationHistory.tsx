import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShieldAlert, Search, Calendar, Store, ArrowDown, ArrowUp, Info, Download, FileText, FileSpreadsheet, FileSearch } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateId } from '../../db/db';

export default function ReconciliationHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const reconciliations = useLiveQuery(() => db.cashReconciliations.reverse().sortBy('date')) || [];
  const registers = useLiveQuery(() => db.cashRegisters.toArray()) || [];
  const employees = useLiveQuery(() => db.employees.toArray()) || [];
  const investigations = useLiveQuery(() => db.investigations.toArray()) || [];

  const filteredReconciliations = reconciliations.filter(rec => {
    const register = registers.find(r => r.id === rec.cashRegisterId)?.name?.toLowerCase() || '';
    const operator = employees.find(e => e.id === rec.operatorId)?.name?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    
    return register.includes(term) || operator.includes(term) || rec.status.toLowerCase().includes(term);
  });

  const handleExport = (type: 'pdf' | 'excel') => {
    // In a real app, generate the actual file using libraries like jsPDF or SheetJS
    showNotification(`Exportando relatório em formato ${type.toUpperCase()}...`, 'success');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Histórico de Conciliações
          </h1>
          <p className="text-sm text-slate-500">Histórico de validações automáticas de caixa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/financeiro/investigacoes')} className="bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200">
            <FileSearch className="w-4 h-4 mr-2" />
            Ver Investigações
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} className="bg-white hover:bg-slate-50 text-slate-700">
            <FileText className="w-4 h-4 mr-2 text-red-500" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} className="bg-white hover:bg-slate-50 text-slate-700">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
            Excel
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            className="pl-10" 
            placeholder="Buscar por caixa, operador ou status..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <div className="space-y-4">
        {filteredReconciliations.length === 0 ? (
          <Card className="p-12 text-center text-slate-500 bg-slate-50 border-dashed">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma conciliação encontrada.</p>
          </Card>
        ) : (
          filteredReconciliations.map((rec) => {
            const register = registers.find(r => r.id === rec.cashRegisterId);
            const operator = employees.find(e => e.id === rec.operatorId);
            
            return (
              <Card key={rec.id} className={`overflow-hidden border-l-4 ${rec.status === 'OK' ? 'border-emerald-500' : rec.status === 'WARNING' ? 'border-amber-500' : 'border-red-500'}`}>
                <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${rec.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : rec.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {rec.status === 'OK' ? 'SEM DIVERGÊNCIAS' : rec.status === 'WARNING' ? 'DIVERGÊNCIA MODERADA' : 'DIVERGÊNCIA CRÍTICA'}
                          </span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {rec.source === 'CLOSURE' ? 'Fechamento' : 'Importação'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          <Store className="w-4 h-4 text-slate-400" />
                          {register?.name || 'Caixa Removido'}
                        </h3>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(rec.date).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Diferença</p>
                        <p className={`text-xl font-bold ${rec.difference === 0 ? 'text-emerald-600' : rec.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {rec.difference > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.difference)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Operador</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{operator?.name || rec.operatorId || 'Sistema'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Valor Esperado</p>
                        <p className="text-sm font-semibold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.expectedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Valor Informado</p>
                        <p className="text-sm font-semibold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.informedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Qtd Vendas</p>
                        <p className="text-sm font-semibold text-slate-700">{rec.totalSales}</p>
                      </div>
                    </div>
                  </div>

                  {(rec.suggestedCauses && rec.suggestedCauses.length > 0 || rec.notes) && (
                    <div className="w-full md:w-1/3 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-center">
                      {rec.suggestedCauses && rec.suggestedCauses.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Causas Prováveis</p>
                          <ul className="text-sm text-slate-700 space-y-1">
                            {rec.suggestedCauses.map((cause, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">•</span>
                                {cause}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {rec.notes && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observações da IA</p>
                          <p className="text-sm text-slate-600 italic bg-white p-2 rounded border border-slate-100 flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            {rec.notes}
                          </p>
                        </div>
                      )}
                      
                      {rec.status !== 'OK' && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          {(() => {
                            const inv = investigations.find(i => i.reconciliationId === rec.id);
                            if (inv) {
                              return (
                                <Button 
                                  className="w-full" 
                                  variant="outline"
                                  onClick={() => navigate(`/financeiro/investigacoes/${inv.id}`)}
                                >
                                  <FileSearch className="w-4 h-4 mr-2" />
                                  Ver Investigação
                                </Button>
                              );
                            } else {
                              return (
                                <Button 
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                                  onClick={async () => {
                                    const invId = generateId();
                                    await db.investigations.add({
                                      id: invId,
                                      reconciliationId: rec.id!,
                                      cashRegisterId: rec.cashRegisterId,
                                      operatorId: rec.operatorId,
                                      date: new Date().toISOString(),
                                      difference: rec.difference,
                                      status: 'IN_PROGRESS',
                                      checklist: {},
                                      notes: '',
                                      evidences: [],
                                      investigatorId: profile?.id || 'system',
                                      createdAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString()
                                    });
                                    navigate(`/financeiro/investigacoes/${invId}`);
                                  }}
                                >
                                  <FileSearch className="w-4 h-4 mr-2" />
                                  Iniciar Investigação
                                </Button>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
