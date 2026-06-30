import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  cashRegisterRepository, 
  cashRegisterClosureRepository, 
  revenueRepository, 
  expenseRepository, 
  importHistoryRepository, 
  auditRepository,
  investigationRepository
} from '../../db/repository';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Store, CheckCircle, Calculator, Info, Clock, AlertTriangle, XCircle, AlertCircle, ArrowUp, ArrowDown, FileText, Search } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { ReconciliationEngine } from '../../services/ReconciliationEngine';
import { CashReconciliation } from '../../types';
import { useNavigate } from 'react-router-dom';

export default function CashRegisterClosure() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useAuth();
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [observedBalance, setObservedBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [reconciliationResult, setReconciliationResult] = useState<CashReconciliation | null>(null);

  const registers = useLiveQuery(() => cashRegisterRepository.list({ status: 'ACTIVE' }), []);
  
  // Try to find the last closure for the selected register
  const closures = useLiveQuery(() => {
    if (!selectedRegisterId) return [];
    return cashRegisterClosureRepository.list({ cashRegisterId: selectedRegisterId });
  }, [selectedRegisterId]);

  const lastClosure = closures && closures.length > 0 ? closures[0] : null;

  // Calculate expected balance from revenues and expenses since last closure
  const expectedData = useLiveQuery(async () => {
    if (!selectedRegisterId) return { expectedBalance: 0, revenues: 0, expenses: 0, timeline: [] };
    
    let lastClosureDate = lastClosure ? new Date(lastClosure.date) : new Date(0);

    const revs = await revenueRepository.list({ cashRegisterId: selectedRegisterId });
    const exp = await expenseRepository.list({ cashRegisterId: selectedRegisterId });
    const imports = await importHistoryRepository.list({ cashRegisterId: selectedRegisterId });

    const recentRevs = revs.filter(r => new Date(r.date) > lastClosureDate && r.status === 'RECEIVED');
    const recentExp = exp.filter(e => e.paymentDate && new Date(e.paymentDate) > lastClosureDate && e.status === 'PAID');
    const recentImports = imports.filter(i => new Date(i.date) > lastClosureDate && i.status === 'SUCCESS');

    const totalRevs = recentRevs.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExp = recentExp.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Include the previous observed balance to compute the expected current balance
    const startBalance = lastClosure ? lastClosure.informedAmount : 0;
    
    // Build Timeline
    const timelineItems = [
      ...recentRevs.map(r => ({
        id: r.id,
        date: r.date,
        type: 'REVENUE',
        description: r.description,
        amount: r.amount
      })),
      ...recentExp.map(e => ({
        id: e.id,
        date: e.paymentDate || e.dueDate,
        type: 'EXPENSE',
        description: e.description,
        amount: e.amount
      })),
      ...recentImports.map(i => ({
        id: i.id,
        date: i.date,
        type: 'IMPORT',
        description: `Importação de vendas (${i.fileName})`,
        amount: 0
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      startBalance,
      revenues: totalRevs,
      expenses: totalExp,
      expectedBalance: startBalance + totalRevs - totalExp,
      timeline: timelineItems
    };
  }, [selectedRegisterId, lastClosure]);

  const handleCloseRegister = async () => {
    if (!selectedRegisterId) {
      showNotification('Selecione um caixa para fechar.', 'warning');
      return;
    }
    
    const obsBalanceNum = parseFloat(observedBalance.replace(',', '.'));
    if (isNaN(obsBalanceNum)) {
      showNotification('Informe o saldo em caixa (valor real).', 'warning');
      return;
    }

    if (!expectedData) return;

    const difference = obsBalanceNum - expectedData.expectedBalance;

    try {
      const now = new Date().toISOString();
      const register = registers?.find(r => r.id === selectedRegisterId);

      // Create closure
      const closureId = await cashRegisterClosureRepository.add({
        cashRegisterId: selectedRegisterId,
        date: now,
        operatorId: profile?.id || 'system',
        expectedAmount: expectedData.expectedBalance,
        informedAmount: obsBalanceNum,
        difference: difference,
        totalSales: 0,
        totalReceived: expectedData.revenues,
        totalWithdrawals: 0,
        totalDeposits: 0,
        totalExpenses: expectedData.expenses,
        notes: notes,
      } as any);

      await auditRepository.add({
        userId: profile?.id || 'system',
        userName: profile?.name || 'Sistema',
        timestamp: now,
        module: 'FINANCEIRO',
        action: 'CREATE',
        targetId: selectedRegisterId,
        targetName: register?.name || 'Caixa',
        cashRegisterId: selectedRegisterId,
        details: `Fechamento de caixa realizado. Esperado: R$ ${expectedData.expectedBalance.toFixed(2)}, Real: R$ ${obsBalanceNum.toFixed(2)}, Diferença: R$ ${difference.toFixed(2)}`
      } as any);

      // Run Smart Reconciliation
      const result = await ReconciliationEngine.runReconciliation(
        selectedRegisterId,
        profile?.id,
        'CLOSURE',
        closureId,
        obsBalanceNum,
        expectedData.expectedBalance,
        0
      );

      setReconciliationResult(result);

      showNotification('Caixa fechado com sucesso!', 'success');
      setObservedBalance('');
      setNotes('');
    } catch (err) {
      console.error(err);
      showNotification('Erro ao fechar o caixa.', 'error');
    }
  };

  const isDifferenceWarning = expectedData && observedBalance && (parseFloat(observedBalance.replace(',', '.')) !== expectedData.expectedBalance);

  if (reconciliationResult) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600" />
            Resultado da Conciliação
          </h1>
          <p className="text-sm text-slate-500">A análise automática do fechamento foi concluída.</p>
        </div>

        <Card className={`p-6 border-l-4 ${reconciliationResult.status === 'OK' ? 'border-emerald-500' : reconciliationResult.status === 'WARNING' ? 'border-amber-500' : 'border-red-500'}`}>
          <div className="flex items-start gap-4">
            {reconciliationResult.status === 'OK' ? (
              <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
            ) : reconciliationResult.status === 'WARNING' ? (
              <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
            )}
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {reconciliationResult.status === 'OK' ? 'Caixa conciliado com sucesso.' : 'Divergências encontradas.'}
                </h3>
                <p className="text-slate-600">
                  Diferença: <span className={`font-bold ${reconciliationResult.difference === 0 ? 'text-emerald-600' : reconciliationResult.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reconciliationResult.difference)}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Valor Esperado</p>
                  <p className="text-lg font-bold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reconciliationResult.expectedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Valor Informado</p>
                  <p className="text-lg font-bold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reconciliationResult.informedAmount)}
                  </p>
                </div>
              </div>

              {reconciliationResult.suggestedCauses && reconciliationResult.suggestedCauses.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Possíveis Causas
                  </h4>
                  <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                    {reconciliationResult.suggestedCauses.map((cause, i) => (
                      <li key={i}>{cause}</li>
                    ))}
                  </ul>
                </div>
              )}

              {reconciliationResult.notes && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-800 font-medium">
                  {reconciliationResult.notes}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                {reconciliationResult.status !== 'OK' && (
                  <Button 
                    variant="primary" 
                    onClick={async () => {
                      const invId = await investigationRepository.add({
                        reconciliationId: reconciliationResult.id!,
                        cashRegisterId: reconciliationResult.cashRegisterId,
                        operatorId: reconciliationResult.operatorId,
                        date: new Date().toISOString(),
                        difference: reconciliationResult.difference,
                        status: 'IN_PROGRESS',
                        checklist: {},
                        notes: '',
                        evidences: [],
                        investigatorId: profile?.id || 'system',
                      } as any);
                      navigate(`/financeiro/investigacoes/${invId}`);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Iniciar Investigação Assistida
                  </Button>
                )}
                <Button variant="outline" onClick={() => setReconciliationResult(null)}>Concluir</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="w-6 h-6 text-emerald-600" />
          Fechamento de Caixa
        </h1>
        <p className="text-sm text-slate-500">Realize a conferência e o fechamento do seu caixa ativo.</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Selecione o Caixa *</label>
            <div className="flex flex-wrap gap-3">
              {registers?.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum caixa ativo encontrado.</p>
              ) : (
                registers?.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRegisterId(r.id!)}
                    className={`px-4 py-3 rounded-xl border flex items-center gap-2 transition-all ${
                      selectedRegisterId === r.id 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-600' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: r.color || '#10b981' }} 
                    />
                    <span className="font-semibold">{r.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedRegisterId && expectedData && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-slate-400" />
                  Resumo do Período
                </h3>
                {lastClosure && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Último Fechamento: {new Date(lastClosure.date).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Saldo Inicial</p>
                  <p className="text-lg font-bold text-slate-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedData.startBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase">Entradas</p>
                  <p className="text-lg font-bold text-emerald-700">
                    + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedData.revenues)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase">Saídas</p>
                  <p className="text-lg font-bold text-red-700">
                    - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedData.expenses)}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-blue-600 uppercase">Saldo Esperado</p>
                  <p className="text-xl font-bold text-blue-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedData.expectedBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedRegisterId && expectedData && expectedData.timeline && expectedData.timeline.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Linha do Tempo
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar border-l-2 border-slate-100 ml-2 pl-4">
                {expectedData.timeline.map((item, index) => (
                  <div key={item.id ? `${item.type}-${item.id}` : index} className="relative">
                    <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center
                      ${item.type === 'REVENUE' ? 'bg-emerald-500' : item.type === 'EXPENSE' ? 'bg-red-500' : 'bg-blue-500'}
                    `}>
                      {item.type === 'REVENUE' ? <ArrowUp className="w-2 h-2 text-white" /> : 
                       item.type === 'EXPENSE' ? <ArrowDown className="w-2 h-2 text-white" /> : 
                       <FileText className="w-2 h-2 text-white" />}
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
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
            </div>
          )}

          {selectedRegisterId && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Saldo Real em Caixa (R$) *</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    value={observedBalance}
                    onChange={e => setObservedBalance(e.target.value)}
                    className="text-lg font-medium"
                  />
                  {isDifferenceWarning && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Atenção: Há uma diferença de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(observedBalance.replace(',', '.')) - expectedData!.expectedBalance)} em relação ao saldo esperado.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Observações</label>
                  <Input 
                    type="text"
                    placeholder="Motivo da diferença, etc."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleCloseRegister}
                  disabled={!observedBalance}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Fechamento
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Historico de fechamentos recentes */}
      {selectedRegisterId && closures && closures.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="font-bold text-slate-800 mb-4">Últimos Fechamentos</h3>
          <div className="space-y-3">
            {closures.slice(0, 5).map(closure => (
              <div key={closure.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-700">{new Date(closure.date).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-500">Responsável: {closure.operatorId}</p>
                  {closure.notes && <p className="text-xs text-slate-400 mt-1">Obs: {closure.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">
                    Real: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(closure.informedAmount)}
                  </p>
                  <p className={`text-xs font-semibold ${closure.difference === 0 ? 'text-emerald-600' : (closure.difference > 0 ? 'text-blue-600' : 'text-red-600')}`}>
                    Dif: {closure.difference > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(closure.difference)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
