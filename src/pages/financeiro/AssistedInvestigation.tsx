import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { 
  investigationRepository, 
  cashRegisterRepository, 
  employeeRepository, 
  cashReconciliationRepository,
  revenueRepository,
  expenseRepository,
  importHistoryRepository,
  auditRepository
} from '../../db/repository';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Search, Calendar, Store, ArrowLeft, FileSearch, CheckCircle, AlertTriangle, AlertCircle, Clock, Camera, FileText, Check, X, Info } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Investigation } from '../../types';

const CHECKLIST_ITEMS = [
  { id: 'importacoes', category: 'Importações', label: 'Todas as vendas do PDV foram importadas?' },
  { id: 'importacoes_pendentes', category: 'Importações', label: 'Existe algum arquivo pendente?' },
  { id: 'cancelamentos', category: 'Cancelamentos', label: 'Todos os cancelamentos foram registrados corretamente?' },
  { id: 'sangrias', category: 'Sangrias', label: 'Todas as sangrias estão registradas?' },
  { id: 'suprimentos', category: 'Suprimentos', label: 'Houve entrada de dinheiro no caixa? Foi lançada?' },
  { id: 'despesas', category: 'Despesas', label: 'Existem despesas pagas com dinheiro do caixa?' },
  { id: 'receitas_manuais', category: 'Receitas Manuais', label: 'Existem receitas lançadas manualmente com justificativa?' },
  { id: 'operador', category: 'Operador', label: 'Houve troca de operador durante o expediente?' },
];

export default function AssistedInvestigation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useAuth();
  
  const investigation = useLiveQuery(() => id ? investigationRepository.get(id) : undefined, [id]);
  const register = useLiveQuery(() => investigation ? cashRegisterRepository.get(investigation.cashRegisterId) : undefined, [investigation]);
  const operator = useLiveQuery(() => investigation && investigation.operatorId ? employeeRepository.get(investigation.operatorId) : undefined, [investigation]);
  const reconciliation = useLiveQuery(() => investigation ? cashReconciliationRepository.get(investigation.reconciliationId) : undefined, [investigation]);
  const pastInvestigations = useLiveQuery(() => investigationRepository.list()) || [];
  
  const [checklist, setChecklist] = useState<Record<string, 'PENDING' | 'VERIFIED' | 'ATTENTION' | 'PROBLEM'>>({});
  const [notes, setNotes] = useState('');
  const [conclusionReason, setConclusionReason] = useState('');
  const [conclusionDetails, setConclusionDetails] = useState('');

  // Fetch timeline data
  const timelineData = useLiveQuery(async () => {
    if (!investigation) return [];
    
    // Get the start of the day and end of the day for the investigation date
    const invDate = new Date(investigation.date);
    const startOfDay = new Date(invDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(invDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const cashRegisterId = investigation.cashRegisterId;

    const revenues = await revenueRepository.list({ cashRegisterId });
    const expenses = await expenseRepository.list({ cashRegisterId });
    const imports = await importHistoryRepository.list({ cashRegisterId });

    const timelineItems = [
      ...revenues.filter(r => {
        const d = new Date(r.date);
        return d >= startOfDay && d <= endOfDay;
      }).map(r => ({
        id: r.id,
        date: r.date,
        type: 'REVENUE',
        description: r.description,
        amount: r.amount
      })),
      ...expenses.filter(e => {
        const d = new Date(e.paymentDate || e.dueDate);
        return d >= startOfDay && d <= endOfDay;
      }).map(e => ({
        id: e.id,
        date: e.paymentDate || e.dueDate,
        type: 'EXPENSE',
        description: e.description,
        amount: e.amount
      })),
      ...imports.filter(i => {
        const d = new Date(i.date);
        return d >= startOfDay && d <= endOfDay;
      }).map(i => ({
        id: i.id,
        date: i.date,
        type: 'IMPORT',
        description: `Importação: ${i.fileName}`,
        amount: 0
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return timelineItems;
  }, [investigation]);

  useEffect(() => {
    if (investigation) {
      setChecklist(investigation.checklist || {});
      setNotes(investigation.notes || '');
      setConclusionReason(investigation.conclusionReason || '');
      setConclusionDetails(investigation.conclusionDetails || '');
    }
  }, [investigation]);

  const updateChecklistItem = async (itemId: string, status: 'PENDING' | 'VERIFIED' | 'ATTENTION' | 'PROBLEM') => {
    if (!investigation) return;
    
    const newChecklist = { ...checklist, [itemId]: status };
    setChecklist(newChecklist);
    
    await investigationRepository.update(investigation.id!, {
      checklist: newChecklist
    } as any);
    
    // Log
    await auditRepository.add({
      userId: profile?.id || 'system',
      userName: profile?.name || 'Sistema',
      timestamp: new Date().toISOString(),
      module: 'FINANCEIRO',
      action: 'UPDATE',
      targetId: investigation.id,
      targetName: 'Investigação',
      cashRegisterId: investigation.cashRegisterId,
      details: `Item de checklist atualizado: ${itemId} -> ${status}`
    } as any);
  };

  const saveNotes = async () => {
    if (!investigation) return;
    await investigationRepository.update(investigation.id!, {
      notes
    } as any);
    showNotification('Anotações salvas', 'success');
  };

  const completeInvestigation = async () => {
    if (!investigation) return;
    if (!conclusionReason) {
      showNotification('Informe o motivo da divergência', 'error');
      return;
    }
    
    await investigationRepository.update(investigation.id!, {
      status: 'COMPLETED',
      conclusionReason,
      conclusionDetails
    } as any);
    
    await auditRepository.add({
      userId: profile?.id || 'system',
      userName: profile?.name || 'Sistema',
      timestamp: new Date().toISOString(),
      module: 'FINANCEIRO',
      action: 'UPDATE',
      targetId: investigation.id,
      targetName: 'Investigação',
      cashRegisterId: investigation.cashRegisterId,
      details: `Investigação concluída. Motivo: ${conclusionReason}`
    } as any);
    
    showNotification('Investigação concluída com sucesso', 'success');
  };

  const reopenInvestigation = async () => {
    if (!investigation) return;
    
    await investigationRepository.update(investigation.id!, {
      status: 'IN_PROGRESS'
    } as any);
    
    await auditRepository.add({
      userId: profile?.id || 'system',
      userName: profile?.name || 'Sistema',
      timestamp: new Date().toISOString(),
      module: 'FINANCEIRO',
      action: 'UPDATE',
      targetId: investigation.id,
      targetName: 'Investigação',
      cashRegisterId: investigation.cashRegisterId,
      details: 'Investigação reaberta'
    } as any);
    
    showNotification('Investigação reaberta', 'success');
  };

  if (!investigation) {
    return <div className="p-8 text-center">Carregando investigação...</div>;
  }

  const verifiedCount = Object.values(checklist).filter(v => v === 'VERIFIED').length;
  const progressPercent = Math.round((verifiedCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-indigo-600" />
          Investigação Assistida
        </h1>
      </div>

      {/* Resumo Inicial */}
      <Card className="p-6 border-t-4 border-indigo-600">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${investigation.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {investigation.status === 'COMPLETED' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
              </span>
              <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {new Date(investigation.date).toLocaleString('pt-BR')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Caixa</p>
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <Store className="w-4 h-4 text-slate-400" /> {register?.name || 'Caixa Removido'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Operador</p>
                <p className="font-semibold text-slate-800">{operator?.name || investigation.operatorId || 'Sistema'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Diferença Encontrada</p>
                <p className={`text-lg font-bold ${investigation.difference === 0 ? 'text-emerald-600' : investigation.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {investigation.difference > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investigation.difference)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-48 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center">
            <p className="text-sm font-bold text-slate-600 mb-2">Progresso da Análise</p>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={investigation.status === 'COMPLETED' ? '#10B981' : '#4F46E5'} strokeWidth="3" strokeDasharray={`${progressPercent}, 100`} />
              </svg>
              <div className="absolute text-xl font-bold text-slate-800">{progressPercent}%</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Intelligent Cross-referencing */}
      {reconciliation?.notes && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
            <Info className="w-5 h-5" />
            Análise Inteligente (Cruzamento de Dados)
          </h3>
          <p className="text-sm text-blue-800">{reconciliation.notes}</p>
        </Card>
      )}

      {/* Historical Intelligence */}
      {(() => {
        if (!investigation) return null;
        const now = new Date();
        const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));
        
        const registerDivergences = pastInvestigations.filter(i => 
          i.cashRegisterId === investigation.cashRegisterId && 
          i.id !== investigation.id &&
          new Date(i.date) >= ninetyDaysAgo &&
          i.difference < 0 // Only counting negative divergences as similar for this example
        );

        const operatorDivergences = pastInvestigations.filter(i => 
          i.operatorId === investigation.operatorId && 
          i.id !== investigation.id &&
          new Date(i.date) >= ninetyDaysAgo &&
          i.difference < 0
        );

        if (registerDivergences.length === 0 && operatorDivergences.length === 0) return null;

        return (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              Inteligência Histórica
            </h3>
            <div className="space-y-2">
              {registerDivergences.length > 0 && (
                <p className="text-sm text-amber-800 font-medium">
                  • Nos últimos 90 dias, foram registradas {registerDivergences.length} divergências semelhantes envolvendo este caixa.
                </p>
              )}
              {investigation.operatorId && operatorDivergences.length > 0 && (
                <p className="text-sm text-amber-800 font-medium">
                  • Este operador apresentou {operatorDivergences.length} {operatorDivergences.length === 1 ? 'ocorrência semelhante' : 'ocorrências semelhantes'} neste semestre.
                </p>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Checklist Inteligente */}
      <Card className="overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Checklist de Verificação</h2>
          <p className="text-sm text-slate-500">Siga as etapas abaixo para localizar a divergência.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {CHECKLIST_ITEMS.map((item) => {
            const status = checklist[item.id] || 'PENDING';
            
            return (
              <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{item.category}</p>
                  <p className={`font-medium ${status === 'VERIFIED' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</p>
                </div>
                
                <div className="flex gap-1 shrink-0">
                  <button 
                    disabled={investigation.status === 'COMPLETED'}
                    onClick={() => updateChecklistItem(item.id, 'VERIFIED')}
                    className={`p-2 rounded-lg border transition-colors ${status === 'VERIFIED' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    title="Verificado - OK"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={investigation.status === 'COMPLETED'}
                    onClick={() => updateChecklistItem(item.id, 'ATTENTION')}
                    className={`p-2 rounded-lg border transition-colors ${status === 'ATTENTION' ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    title="Atenção"
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={investigation.status === 'COMPLETED'}
                    onClick={() => updateChecklistItem(item.id, 'PROBLEM')}
                    className={`p-2 rounded-lg border transition-colors ${status === 'PROBLEM' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    title="Problema Encontrado"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Investigação por Linha do Tempo */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-indigo-600" />
          Linha do Tempo
        </h3>
        {timelineData && timelineData.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 no-scrollbar border-l-2 border-slate-100 ml-4 pl-6">
            {timelineData.map((item, index) => (
              <div key={item.id ? `${item.type}-${item.id}` : index} className="relative">
                <div className={`absolute -left-8 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center
                  ${item.type === 'REVENUE' ? 'bg-emerald-500' : item.type === 'EXPENSE' ? 'bg-red-500' : 'bg-blue-500'}
                `}>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between hover:border-slate-300 cursor-pointer transition-colors">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.description}</p>
                    <p className="text-xs text-slate-500">{new Date(item.date).toLocaleTimeString('pt-BR')}</p>
                  </div>
                  {item.amount > 0 && (
                    <p className={`font-bold ${item.type === 'REVENUE' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.type === 'REVENUE' ? '+' : '-'}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhum evento registrado nesta data.</p>
          </div>
        )}
      </Card>

      {/* Observações do Investigador */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-4">Anotações da Investigação</h3>
        <textarea
          disabled={investigation.status === 'COMPLETED'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Registre aqui os detalhes da investigação, conversas com o operador, etc..."
          className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
        ></textarea>
        {investigation.status !== 'COMPLETED' && (
          <div className="flex justify-end mt-2">
            <Button size="sm" variant="outline" onClick={saveNotes}>Salvar Anotações</Button>
          </div>
        )}
      </Card>

      {/* Evidências (Mock) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Evidências</h3>
          {investigation.status !== 'COMPLETED' && (
            <Button size="sm" variant="outline" className="flex items-center gap-2">
              <Camera className="w-4 h-4" /> Anexar
            </Button>
          )}
        </div>
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-500 bg-slate-50">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Nenhum anexo adicionado à investigação.</p>
        </div>
      </Card>

      {/* Conclusão */}
      <Card className={`p-6 border-t-4 ${investigation.status === 'COMPLETED' ? 'border-emerald-500' : 'border-slate-200'}`}>
        <h3 className="font-bold text-slate-800 mb-4 text-xl">Conclusão da Investigação</h3>
        
        {investigation.status === 'COMPLETED' ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Motivo Principal</p>
              <p className="font-semibold text-emerald-900">{investigation.conclusionReason}</p>
            </div>
            {investigation.conclusionDetails && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Detalhes da Conclusão</p>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{investigation.conclusionDetails}</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={reopenInvestigation}>
                Reabrir Investigação
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da Divergência *</label>
              <select
                value={conclusionReason}
                onChange={(e) => setConclusionReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Selecione o motivo...</option>
                <option value="Erro operacional">Erro operacional</option>
                <option value="Venda não importada">Venda não importada</option>
                <option value="Cancelamento não registrado">Cancelamento não registrado</option>
                <option value="Sangria não registrada">Sangria não registrada</option>
                <option value="Ajuste financeiro">Ajuste financeiro</option>
                <option value="Diferença justificada">Diferença justificada</option>
                <option value="Quebra de caixa">Quebra de caixa</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Detalhada</label>
              <textarea
                value={conclusionDetails}
                onChange={(e) => setConclusionDetails(e.target.value)}
                placeholder="Descreva como a divergência foi resolvida ou justificada..."
                className="w-full h-24 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              ></textarea>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button onClick={completeInvestigation} className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="w-4 h-4 mr-2" />
                Finalizar Investigação
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
