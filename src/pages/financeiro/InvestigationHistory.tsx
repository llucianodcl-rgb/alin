import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Calendar, Store, ArrowRight, ShieldAlert, FileSearch } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { useNavigate } from 'react-router-dom';

export default function InvestigationHistory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  const investigations = useLiveQuery(() => db.investigations.reverse().sortBy('date')) || [];
  const registers = useLiveQuery(() => db.cashRegisters.toArray()) || [];
  const employees = useLiveQuery(() => db.employees.toArray()) || [];

  const filteredInvestigations = investigations.filter(inv => {
    const register = registers.find(r => r.id === inv.cashRegisterId)?.name?.toLowerCase() || '';
    const operator = employees.find(e => e.id === inv.operatorId)?.name?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    
    return register.includes(term) || operator.includes(term) || inv.status.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-indigo-600" />
            Histórico de Investigações
          </h1>
          <p className="text-sm text-slate-500">Histórico de investigações assistidas de caixa.</p>
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
        {filteredInvestigations.length === 0 ? (
          <Card className="p-12 text-center text-slate-500 bg-slate-50 border-dashed">
            <FileSearch className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma investigação encontrada.</p>
          </Card>
        ) : (
          filteredInvestigations.map((inv) => {
            const register = registers.find(r => r.id === inv.cashRegisterId);
            const operator = employees.find(e => e.id === inv.operatorId);
            const investigator = employees.find(e => e.id === inv.investigatorId);
            
            return (
              <Card key={inv.id} className={`overflow-hidden border-l-4 ${inv.status === 'COMPLETED' ? 'border-emerald-500' : 'border-blue-500'}`}>
                <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${inv.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {inv.status === 'COMPLETED' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          <Store className="w-4 h-4 text-slate-400" />
                          {register?.name || 'Caixa Removido'}
                        </h3>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(inv.date).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Diferença</p>
                        <p className={`text-xl font-bold ${inv.difference === 0 ? 'text-emerald-600' : inv.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {inv.difference > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.difference)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Operador (Caixa)</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{operator?.name || inv.operatorId || 'Sistema'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Investigador</p>
                        <p className="text-sm font-semibold text-slate-700 truncate">{investigator?.name || inv.investigatorId || 'Sistema'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/3 flex flex-col justify-center">
                    {inv.status === 'COMPLETED' && inv.conclusionReason && (
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4">
                        <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Motivo: {inv.conclusionReason}</p>
                        {inv.conclusionDetails && <p className="text-sm text-emerald-800">{inv.conclusionDetails}</p>}
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => navigate(`/financeiro/investigacoes/${inv.id}`)}
                      className="w-full"
                      variant={inv.status === 'COMPLETED' ? 'outline' : 'primary'}
                    >
                      {inv.status === 'COMPLETED' ? 'Ver Investigação' : 'Continuar Investigação'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
