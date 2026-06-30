import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { db } from '../db/db';
import { systemSettingsRepository } from '../db/repository';
import { Download, Upload, Shield, Moon, Monitor, Sun, Store, Settings2, Calculator, Lock, X, Fingerprint } from 'lucide-react';
import { CashRegistersSettings } from '../components/settings/CashRegistersSettings';
import { useNotification } from '../contexts/NotificationContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'general' | 'registers' | 'reconciliation'>('general');
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('alin_theme') || 'auto');
  const [scale, setScale] = useState<string>(() => localStorage.getItem('alin_scale') || '100');

  const settings = useLiveQuery(() => db.systemSettings.toCollection().first());
  
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(() => localStorage.getItem('alin_biometrics_enabled') === 'true');

  const [warningLimit, setWarningLimit] = useState('10');
  const [criticalLimit, setCriticalLimit] = useState('50');

  useEffect(() => {
    if (settings) {
      setWarningLimit(settings.reconciliationWarningLimit?.toString() || '10');
      setCriticalLimit(settings.reconciliationCriticalLimit?.toString() || '50');
      setIsLockEnabled(settings.isLockEnabled || false);
    }
  }, [settings]);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricsSupported(available));
    }
  }, []);

  const handleToggleBiometrics = () => {
    const newState = !isBiometricsEnabled;
    setIsBiometricsEnabled(newState);
    localStorage.setItem('alin_biometrics_enabled', newState.toString());
    showNotification(`Biometria ${newState ? 'ativada' : 'desativada'} neste dispositivo.`, 'success');
  };

  const saveReconciliationSettings = async () => {
    try {
      const wLimit = parseFloat(warningLimit);
      const cLimit = parseFloat(criticalLimit);
      
      if (isNaN(wLimit) || isNaN(cLimit) || wLimit < 0 || cLimit < wLimit) {
        showNotification('Valores inválidos. O limite crítico deve ser maior que o moderado.', 'error');
        return;
      }

      if (settings) {
        await systemSettingsRepository.update(settings.id!, {
          reconciliationWarningLimit: wLimit,
          reconciliationCriticalLimit: cLimit
        } as any);
      } else {
        await systemSettingsRepository.add({
          reconciliationWarningLimit: wLimit,
          reconciliationCriticalLimit: cLimit
        } as any);
      }
      showNotification('Configurações salvas.', 'success');
    } catch (err) {
      showNotification('Erro ao salvar.', 'error');
    }
  };

  const applyTheme = (selectedTheme: string) => {
    const isDark = selectedTheme === 'dark' || (selectedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('alin_theme', newTheme);
    applyTheme(newTheme);
  };

  const handleScaleChange = (newScale: string) => {
    setScale(newScale);
    localStorage.setItem('alin_scale', newScale);
    document.documentElement.style.fontSize = `${newScale}%`;
  };

  const savePin = async () => {
    if (newPin.length < 4) {
      showNotification('O PIN deve ter pelo menos 4 dígitos.', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showNotification('Os PINs não coincidem.', 'error');
      return;
    }

    try {
      if (settings) {
        await systemSettingsRepository.update(settings.id!, {
          appPin: newPin,
          isLockEnabled: true
        } as any);
      } else {
        await systemSettingsRepository.add({
          appPin: newPin,
          isLockEnabled: true
        } as any);
      }
      setIsLockEnabled(true);
      setIsPinModalOpen(false);
      setNewPin('');
      setConfirmPin('');
      showNotification('PIN configurado e bloqueio ativado.', 'success');
    } catch (err) {
      showNotification('Erro ao salvar PIN.', 'error');
    }
  };

  const toggleLock = async () => {
    if (!settings?.appPin && !isLockEnabled) {
      setIsPinModalOpen(true);
      return;
    }

    try {
      const newState = !isLockEnabled;
      await systemSettingsRepository.update(settings!.id!, {
        isLockEnabled: newState
      } as any);
      setIsLockEnabled(newState);
      showNotification(`Bloqueio ${newState ? 'ativado' : 'desativado'}.`, 'success');
    } catch (err) {
      showNotification('Erro ao alterar status de bloqueio.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const products = await db.products.toArray();
      const categories = await db.categories.toArray();
      const suppliers = await db.suppliers.toArray();
      const stockEvents = await db.stockEvents.toArray();

      const backup = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: { products, categories, suppliers, stockEvents }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gein_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export falhou', error);
      alert('Falha ao exportar banco de dados.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-sm text-slate-500">Personalize o aplicativo e gerencie seus dados.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Geral
        </button>
        <button
          onClick={() => setActiveTab('registers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'registers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Store className="w-4 h-4" />
          Caixas
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reconciliation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Conciliação
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    onClick={() => handleThemeChange('light')}
                    className="justify-center"
                  >
                    <Sun className="w-4 h-4 mr-2" /> Claro
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    onClick={() => handleThemeChange('dark')}
                    className="justify-center"
                  >
                    <Moon className="w-4 h-4 mr-2" /> Escuro
                  </Button>
                  <Button 
                    variant={theme === 'auto' ? 'default' : 'outline'} 
                    onClick={() => handleThemeChange('auto')}
                    className="justify-center"
                  >
                    <Monitor className="w-4 h-4 mr-2" /> Auto
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label>Escala da Interface</Label>
                <Select value={scale} onChange={(e) => handleScaleChange(e.target.value)}>
                  <option value="50">50% (Extremamente Compacto)</option>
                  <option value="70">70% (Muito Compacto)</option>
                  <option value="90">90% (Compacto)</option>
                  <option value="100">100% (Padrão)</option>
                  <option value="110">110% (Grande)</option>
                  <option value="120">120% (Extra Grande)</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Segurança & Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Banco de Dados Local (IndexedDB)</Label>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={handleExport} className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2 text-blue-600" />
                    Exportar Backup (JSON)
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-slate-400 cursor-not-allowed">
                    <Upload className="w-4 h-4 mr-2" />
                    Importar Backup (JSON)
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Todos os dados são armazenados localmente no seu navegador. Exporte regularmente para não perder informações.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <Label>Autenticação & Bloqueio</Label>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPinModalOpen(true)}
                    className="w-full justify-start"
                  >
                    <Shield className="w-4 h-4 mr-2 text-blue-600" />
                    {settings?.appPin ? 'Alterar PIN de Acesso' : 'Configurar PIN de Acesso'}
                  </Button>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isLockEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Bloqueio Automático</p>
                        <p className="text-[10px] text-slate-500">Exigir PIN ao abrir o app</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleLock}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isLockEnabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isLockEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {isBiometricsSupported && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isBiometricsEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                          <Fingerprint className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">Usar Biometria</p>
                          <p className="text-[10px] text-slate-500">Face ID ou Impressão Digital</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleToggleBiometrics}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          isBiometricsEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isBiometricsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  )}

                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-center text-slate-500 text-xs hover:bg-slate-100"
                    onClick={() => {
                      sessionStorage.setItem('alin_app_locked', 'true');
                      window.location.reload();
                    }}
                    disabled={!isLockEnabled}
                  >
                    Bloquear Agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PIN Modal */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Configurar PIN</h3>
                  <p className="text-sm text-slate-500">Defina um PIN de 4 a 8 dígitos para proteger seu aplicativo.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Novo PIN</Label>
                    <Input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      placeholder="••••"
                      className="text-center text-2xl tracking-[1em]"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar PIN</Label>
                    <Input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      placeholder="••••"
                      className="text-center text-2xl tracking-[1em]"
                      value={confirmPin}
                      onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button onClick={savePin} className="w-full py-6 text-lg">
                    Salvar e Ativar
                  </Button>
                  <Button variant="ghost" onClick={() => setIsPinModalOpen(false)} className="w-full text-slate-500">
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'registers' && (
        <CashRegistersSettings />
      )}

      {activeTab === 'reconciliation' && (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                Regras de Conciliação Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-slate-500">
                Configure os limites de tolerância para alertar sobre diferenças na conciliação de caixa ou importações.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Divergência Moderada (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={warningLimit}
                    onChange={(e) => setWarningLimit(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Valores acima deste limite geram alerta amarelo.</p>
                </div>
                <div className="space-y-2">
                  <Label>Divergência Crítica (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={criticalLimit}
                    onChange={(e) => setCriticalLimit(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Valores acima deste limite geram alerta vermelho.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={saveReconciliationSettings}>
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
