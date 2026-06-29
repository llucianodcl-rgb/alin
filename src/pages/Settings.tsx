import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { db } from '../db/db';
import { Download, Upload, Shield, Moon, Monitor, Sun } from 'lucide-react';

export default function Settings() {
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
      a.download = `alin_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export falhou', error);
      alert('Falha ao exportar banco de dados.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-sm text-slate-500">Personalize o aplicativo e gerencie seus dados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aparência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="justify-center">
                  <Sun className="w-4 h-4 mr-2" /> Claro
                </Button>
                <Button variant="outline" className="justify-center bg-slate-100 text-slate-400 cursor-not-allowed">
                  <Moon className="w-4 h-4 mr-2" /> Escuro
                </Button>
                <Button variant="default" className="justify-center">
                  <Monitor className="w-4 h-4 mr-2" /> Auto
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label>Escala da Interface</Label>
              <Select defaultValue="100">
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
              <Label>Autenticação</Label>
              <Button variant="outline" className="w-full justify-start text-slate-400 cursor-not-allowed">
                <Shield className="w-4 h-4 mr-2" />
                Configurar PIN / Biometria
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
