import { useStats } from '../hooks/useStats';
import { db } from '../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ExecutivePanel } from '../components/layout/ExecutivePanel';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  TrendingDown, 
  TrendingUp, 
  DollarSign 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { name: 'Jan', entradas: 4000, saidas: 2400 },
  { name: 'Fev', entradas: 3000, saidas: 1398 },
  { name: 'Mar', entradas: 2000, saidas: 9800 },
  { name: 'Abr', entradas: 2780, saidas: 3908 },
  { name: 'Mai', entradas: 1890, saidas: 4800 },
  { name: 'Jun', entradas: 2390, saidas: 3800 },
];

export default function Dashboard() {
  const { stats, loading } = useStats();

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando métricas...</div>;
  }

  const totalProducts = stats?.totalProducts || 0;
  const outOfStock = stats?.lowStockProducts || 0; // Using lowStock as approximation if specific field not updated yet
  const belowMin = stats?.lowStockProducts || 0;
  const totalValue = stats?.totalStockValue || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <ExecutivePanel />

      <div className="pt-4 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Métricas Operacionais</h2>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total em Estoque</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalProducts} <span className="text-xs font-normal text-slate-400">itens</span></h3>
          <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="bg-blue-600 h-full w-3/4"></div></div>
        </Card>
        
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Itens Esgotados</p>
          <h3 className="text-2xl font-bold text-red-500">{outOfStock < 10 ? `0${outOfStock}` : outOfStock}</h3>
          {outOfStock > 0 ? (
            <p className="text-[10px] mt-2 text-slate-500 bg-red-50 px-2 py-1 rounded inline-block">Ação imediata necessária</p>
          ) : (
             <p className="text-[10px] mt-2 text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block">Estoque saudável</p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Abaixo do Mínimo</p>
          <h3 className="text-2xl font-bold text-amber-500">{belowMin < 10 ? `0${belowMin}` : belowMin}</h3>
          {belowMin > 0 ? (
            <p className="text-[10px] mt-2 text-slate-500 bg-amber-50 px-2 py-1 rounded inline-block">Reposição recomendada</p>
          ) : (
            <p className="text-[10px] mt-2 text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block">Nenhum alerta</p>
          )}
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-600">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Valor de Ativo</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalValue)}
          </h3>
          <p className="text-[10px] mt-2 text-blue-600 font-semibold">+ Ativo Circulante</p>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Evolução de Fluxo</h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-slate-400"><span className="w-3 h-3 bg-blue-600 rounded-full"></span> Entradas</span>
              <span className="flex items-center gap-1 text-xs text-slate-400"><span className="w-3 h-3 bg-slate-200 rounded-full"></span> Saídas</span>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="entradas" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="saidas" stroke="#cbd5e1" strokeWidth={3} fillOpacity={1} fill="url(#colorSaidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Alertas Recentes</h2>
          <div className="space-y-4 overflow-y-auto pr-2">
            {outOfStock > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex shrink-0 items-center justify-center text-red-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">Itens Esgotados</p>
                  <p className="text-xs text-red-600 font-medium">{outOfStock} produtos com estoque 0</p>
                </div>
              </div>
            )}
            {belowMin > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex shrink-0 items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">Estoque Baixo</p>
                  <p className="text-xs text-amber-600 font-medium">{belowMin} produtos abaixo do mínimo</p>
                </div>
              </div>
            )}
            
            {outOfStock === 0 && belowMin === 0 && (
               <div className="text-sm text-slate-500 py-4 text-center">Nenhum alerta crítico.</div>
            )}
          </div>
          <button className="mt-auto w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all">VER TODOS OS ALERTAS</button>
        </div>
      </section>
      </div>
    </div>
  );
}
