import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { syncService } from '../services/SyncService';
import { statsService } from '../services/StatsService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Database, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Download,
  Trash2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNotification } from '../contexts/NotificationContext';

export default function AdminDiagnostics() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { notify } = useNotification();

  const syncQueueCount = useLiveQuery(() => db.syncQueue.count());
  const pendingSync = useLiveQuery(() => db.syncQueue.where('status').equals('PENDING').count());
  const errorSync = useLiveQuery(() => db.syncQueue.where('status').equals('ERROR').count());
  
  const tableCounts = useLiveQuery(async () => {
    return {
      products: await db.products.count(),
      stockEvents: await db.stockEvents.count(),
      expenses: await db.expenses.count(),
      revenues: await db.revenues.count(),
      auditLogs: await db.auditLogs.count(),
      syncQueue: await db.syncQueue.count()
    };
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.processQueue();
      notify({ type: 'success', title: 'Sincronização Concluída', message: 'Fila de processamento finalizada.' });
    } catch (error) {
      notify({ type: 'error', title: 'Erro na Sincronização', message: 'Ocorreu um problema ao sincronizar os dados.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullMaster = async () => {
    if (!confirm('Deseja baixar os dados mestre do servidor? Isso substituirá os dados locais.')) return;
    
    setIsSyncing(true);
    try {
      await syncService.pullMasterData(['categories', 'suppliers', 'locations', 'expenseCategories']);
      notify({ type: 'success', title: 'Dados Atualizados', message: 'Categorias e fornecedores sincronizados.' });
    } catch (error) {
      notify({ type: 'error', title: 'Erro no Pull', message: 'Falha ao baixar dados do servidor.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearQueue = async () => {
    if (!confirm('AVISO: Isso removerá todos os itens da fila de sincronização sem enviá-los ao servidor. Continuar?')) return;
    await db.syncQueue.clear();
    notify({ type: 'info', message: 'Fila de sincronização limpa.' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Diagnóstico do Sistema
          </h1>
          <p className="text-sm text-slate-500">Monitore a integridade, sincronização e performance do GEIN.</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200">
          {isOnline ? (
            <><Wifi className="w-4 h-4 text-green-500" /> <span className="text-xs font-bold text-green-700">ONLINE</span></>
          ) : (
            <><WifiOff className="w-4 h-4 text-red-500" /> <span className="text-xs font-bold text-red-700">OFFLINE</span></>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fila de Sincronização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">{syncQueueCount}</span>
              <span className="text-xs text-slate-500">itens pendentes</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button 
                size="sm" 
                className="w-full gap-2" 
                disabled={!isOnline || isSyncing || syncQueueCount === 0}
                onClick={handleManualSync}
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                Sincronizar Agora
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 hover:bg-red-50"
                disabled={syncQueueCount === 0}
                onClick={clearQueue}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado da Fila</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Aguardando:</span>
              <span className="font-bold text-slate-800">{pendingSync}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Com Erro:</span>
              <span className="font-bold text-red-600">{errorSync}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: syncQueueCount ? `${(1 - (errorSync || 0) / syncQueueCount) * 100}%` : '100%' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manutenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full gap-2 text-slate-600" onClick={handlePullMaster} disabled={isSyncing}>
              <Download className="w-4 h-4" />
              Atualizar Dados Mestre
            </Button>
            <Button variant="outline" size="sm" className="w-full gap-2 text-slate-600" onClick={() => statsService.updateMetrics({})}>
              <RefreshCw className="w-4 h-4" />
              Recalcular Estatísticas
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Banco de Dados Local (Dexie)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {tableCounts && Object.entries(tableCounts).map(([table, count]) => (
              <div key={table} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <span className="text-sm font-medium text-slate-700 capitalize">{table}</span>
                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {count} registros
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-900">Modo de Sincronização Inteligente</h3>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            O GEIN utiliza um sistema de persistência local-first. Suas alterações são salvas instantaneamente no navegador e enviadas ao Firebase em segundo plano quando houver conexão. Isso garante performance total e funcionamento 100% offline.
          </p>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
