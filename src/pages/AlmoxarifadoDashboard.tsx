import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { 
  Package, 
  Tags, 
  Truck, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  History, 
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNavigation } from '../contexts/NavigationContext';

const MOBILE_MENU = [
  { title: 'Produtos', icon: Package, path: '/produtos', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { title: 'Categorias', icon: Tags, path: '/categorias', color: 'text-purple-500', bg: 'bg-purple-50' },
  { title: 'Fornecedores', icon: Truck, path: '/fornecedores', color: 'text-orange-500', bg: 'bg-orange-50' },
  { title: 'Entradas (NF)', icon: ArrowDownToLine, path: '/entradas', color: 'text-blue-500', bg: 'bg-blue-50' },
  { title: 'Saídas', icon: ArrowUpFromLine, path: '/saidas', color: 'text-red-500', bg: 'bg-red-50' },
  { title: 'Histórico', icon: History, path: '/historico', color: 'text-teal-500', bg: 'bg-teal-50' },
];

export default function AlmoxarifadoDashboard() {
  const isMobile = useIsMobile();
  const { navigateWithDirtyCheck } = useNavigation();
  
  const products = useLiveQuery(() => db.products.toArray());
  const events = useLiveQuery(() => db.stockEvents.orderBy('date').reverse().limit(5).toArray());
  
  const totalProducts = products?.length || 0;
  const outOfStock = products?.filter(p => p.currentStock <= 0).length || 0;
  const belowMin = products?.filter(p => p.currentStock > 0 && p.currentStock <= (p.minQuantity || 0)).length || 0;
  const healthy = totalProducts > 0 ? Math.round(((totalProducts - outOfStock - belowMin) / totalProducts) * 100) : 100;
  
  const expiringSoon = products?.filter(p => p.expirationDate).slice(0, 3) || [];
  
  const totalValue = products?.reduce((acc, p) => acc + ((p.unitCost || 0) * (p.currentStock || 0)), 0) || 0;

  if (isMobile) {
    return (
      <div className="pb-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {MOBILE_MENU.map((item) => (
            <button 
              key={item.path} 
              onClick={() => navigateWithDirtyCheck(item.path)}
              className="w-full text-left bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col items-start relative overflow-hidden transition-transform active:scale-95 cursor-pointer"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", item.bg, item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-[15px]">{item.title}</h3>
            </button>
          ))}
        </div>

        <div>
          <h2 className="font-bold text-slate-800 text-lg mb-4">Resumo do Estoque</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Itens</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{totalProducts}</h3>
            </Card>
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Esgotados</p>
              <h3 className="text-xl font-bold text-red-600 mt-1">{outOfStock}</h3>
            </Card>
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Estoque Baixo</p>
              <h3 className="text-xl font-bold text-orange-600 mt-1">{belowMin}</h3>
            </Card>
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Saúde</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">{healthy}%</h3>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Dashboard
  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Visão Geral do Almoxarifado</h2>
      
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Produtos</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalProducts} <span className="text-xs font-normal text-slate-400">cadastrados</span></h3>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Valor em Estoque</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
          </h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Esgotados</p>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-red-600">{outOfStock} <span className="text-xs font-normal text-slate-400">itens</span></h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Abaixo do Mínimo</p>
            <CalendarDays className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-orange-600">{belowMin} <span className="text-xs font-normal text-slate-400">itens</span></h3>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" /> Últimas Movimentações
            </h3>
            <div className="space-y-4">
              {events?.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhuma movimentação registrada.</p>
              ) : (
                events?.map(event => (
                  <div key={event.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{event.type === 'ENTRADA' ? 'Entrada' : 'Saída'} de Produto</p>
                      <p className="text-xs text-slate-500">{new Date(event.date).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className={cn("font-bold text-sm", event.type === 'ENTRADA' ? 'text-blue-600' : 'text-red-600')}>
                      {event.type === 'ENTRADA' ? '+' : '-'}{event.quantity}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" /> Próximos do Vencimento
            </h3>
            <div className="space-y-4">
              {expiringSoon?.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum produto próximo do vencimento.</p>
              ) : (
                expiringSoon?.map(p => (
                  <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500">Vence em: {p.expirationDate ? new Date(p.expirationDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{p.currentStock}</p>
                      <p className="text-xs text-slate-400">em estoque</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
