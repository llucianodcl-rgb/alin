import React, { useState } from 'react';
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
  Clock,
  Search,
  X,
  Map,
  FileUp,
  Camera
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNavigation } from '../contexts/NavigationContext';
import { matchText } from '../utils/search';
import { ScannerDialog } from '../components/scanner/ScannerDialog';

const MOBILE_MENU = [
  { title: 'Produtos', icon: Package, path: '/produtos', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { title: 'Categorias', icon: Tags, path: '/categorias', color: 'text-purple-500', bg: 'bg-purple-50' },
  { title: 'Fornecedores', icon: Truck, path: '/fornecedores', color: 'text-orange-500', bg: 'bg-orange-50' },
  { title: 'Entradas (NF)', icon: ArrowDownToLine, path: '/entradas', color: 'text-blue-500', bg: 'bg-blue-50' },
  { title: 'Saídas', icon: ArrowUpFromLine, path: '/saidas', color: 'text-red-500', bg: 'bg-red-50' },
  { title: 'Importações', icon: FileUp, path: '/almoxarifado/importacoes', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { title: 'Histórico', icon: History, path: '/historico', color: 'text-teal-500', bg: 'bg-teal-50' },
];

export default function AlmoxarifadoDashboard() {
  const isMobile = useIsMobile();
  const { navigateWithDirtyCheck } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const products = useLiveQuery(() => db.products.toArray());
  const events = useLiveQuery(() => db.stockEvents.orderBy('date').reverse().limit(5).toArray());
  
  const allEvents = useLiveQuery(() => db.stockEvents.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const imports = useLiveQuery(() => db.importHistory.orderBy('date').reverse().limit(5).toArray());
  
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayImports = imports?.filter(i => new Date(i.date) >= todayStart) || [];
  const todaySalesImported = todayImports.reduce((acc, curr) => acc + (curr.type === 'SALES' ? curr.successCount : 0), 0);
  const todayErrors = todayImports.reduce((acc, curr) => acc + curr.errorCount, 0);
  
  const totalProducts = products?.length || 0;
  const outOfStock = products?.filter(p => p.currentStock <= 0).length || 0;
  const belowMin = products?.filter(p => p.currentStock > 0 && p.currentStock <= (p.minQuantity || 0)).length || 0;
  const withoutLocation = products?.filter(p => !p.locationId).length || 0;
  const healthy = totalProducts > 0 ? Math.round(((totalProducts - outOfStock - belowMin) / totalProducts) * 100) : 100;
  
  const expiringSoon = products?.filter(p => p.expirationDate).slice(0, 3) || [];
  
  const totalValue = products?.reduce((acc, p) => acc + ((p.unitCost || 0) * (p.currentStock || 0)), 0) || 0;

  // Filter lists based on search
  const filteredProducts = products?.filter(p => 
    matchText(p.name, searchQuery) || 
    matchText(p.internalCode, searchQuery) || 
    matchText(p.barcode, searchQuery) || 
    matchText(p.brand, searchQuery) || 
    matchText(p.description, searchQuery)
  ) || [];

  const filteredSuppliers = suppliers?.filter(s => 
    matchText(s.companyName, searchQuery) || 
    matchText(s.tradeName, searchQuery) || 
    matchText(s.cnpj, searchQuery) || 
    matchText(s.contactName, searchQuery)
  ) || [];

  const filteredCategories = categories?.filter(c => 
    matchText(c.name, searchQuery) || 
    matchText(c.description, searchQuery)
  ) || [];

  const filteredEvents = allEvents?.filter(e => {
    const prod = products?.find(p => p.id === e.productId);
    return matchText(prod?.name, searchQuery) || matchText(e.notes, searchQuery) || matchText(e.invoiceNumber, searchQuery);
  }) || [];

  const hasSearchResults = filteredProducts.length > 0 || filteredSuppliers.length > 0 || filteredCategories.length > 0 || filteredEvents.length > 0;

  const SearchBar = (
    <div className="relative w-full mb-6 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Pesquisar produtos, fornecedores, categorias ou movimentações..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
      <button 
        onClick={() => setIsScannerOpen(true)}
        className="px-4 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 font-bold text-sm shrink-0"
      >
        <Camera className="w-5 h-5" />
        <span className="hidden sm:inline">Escanear</span>
      </button>

      <ScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        mode="GENERAL"
      />
    </div>
  );

  const SearchResultsView = searchQuery.trim() !== '' && (
    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6 mb-8">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg">Resultados da Pesquisa</h3>
        <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
          {filteredProducts.length + filteredSuppliers.length + filteredCategories.length + filteredEvents.length} encontrados
        </span>
      </div>

      {!hasSearchResults ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">Nenhum resultado encontrado para "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Products Column */}
          {filteredProducts.length > 0 && (
            <Card className="p-4 bg-white shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <Package className="w-4 h-4 text-emerald-500" /> Produtos ({filteredProducts.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {filteredProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigateWithDirtyCheck(`/produtos/${p.id}`)}>
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-slate-400">Cod: {p.internalCode || 'N/A'}</p>
                      {p.locationPath ? (
                        <div className="flex items-center gap-1 mt-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                          <Map className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{p.locationPath}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-medium mt-1 inline-block">Sem local definido</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-700">{p.currentStock} {p.unitOfMeasure}</p>
                      <p className="text-slate-400">{p.unitCost ? `R$ ${p.unitCost.toFixed(2)}` : 'R$ 0,00'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Suppliers Column */}
          {filteredSuppliers.length > 0 && (
            <Card className="p-4 bg-white shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <Truck className="w-4 h-4 text-orange-500" /> Fornecedores ({filteredSuppliers.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {filteredSuppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigateWithDirtyCheck(`/fornecedores/${s.id}`)}>
                    <div>
                      <p className="font-semibold text-slate-800">{s.companyName}</p>
                      <p className="text-slate-400">{s.tradeName || 'N/A'}</p>
                    </div>
                    <div className="text-right text-slate-400">
                      <p>{s.phone || s.email || 'Sem contato'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Categories Column */}
          {filteredCategories.length > 0 && (
            <Card className="p-4 bg-white shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <Tags className="w-4 h-4 text-purple-500" /> Categorias ({filteredCategories.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {filteredCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigateWithDirtyCheck(`/categorias`)}>
                    <div>
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      <p className="text-slate-400">{c.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Movements/Events Column */}
          {filteredEvents.length > 0 && (
            <Card className="p-4 bg-white shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <History className="w-4 h-4 text-blue-500" /> Movimentações ({filteredEvents.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {filteredEvents.map(e => {
                  const prod = products?.find(p => p.id === e.productId);
                  return (
                    <div key={e.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigateWithDirtyCheck(`/historico`)}>
                      <div>
                        <p className="font-semibold text-slate-800">{prod?.name || 'Produto Removido'}</p>
                        <p className="text-slate-400">{new Date(e.date).toLocaleDateString('pt-BR')} - {e.type}</p>
                      </div>
                      <div className={cn("font-bold", e.type === 'ENTRADA' ? 'text-blue-600' : 'text-red-600')}>
                        {e.type === 'ENTRADA' ? '+' : '-'}{e.quantity}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="pb-8 space-y-6">
        {SearchBar}
        {SearchResultsView}
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
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Sem Localização</p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">{withoutLocation}</h3>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Dashboard
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800">Visão Geral do Almoxarifado</h2>
        <div className="w-full md:max-w-md">
          {SearchBar}
        </div>
      </div>
      
      {SearchResultsView}
      
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-5 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Produtos</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalProducts}</h3>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Estoque</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', compactDisplay: 'short' }).format(totalValue)}
          </h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Esgotados</p>
          <h3 className="text-2xl font-bold text-red-600">{outOfStock}</h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Abaixo Mínimo</p>
          <h3 className="text-2xl font-bold text-orange-600">{belowMin}</h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sem Localização</p>
          <h3 className="text-2xl font-bold text-amber-600">{withoutLocation}</h3>
        </Card>
      </section>

      {/* Import Insights Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 border-t border-slate-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
           <div className="flex items-center gap-2 mb-2">
             <FileUp className="w-4 h-4 text-indigo-500" />
             <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Última Importação</p>
           </div>
           <h3 className="text-sm font-bold text-slate-800 truncate">
             {imports && imports.length > 0 ? new Date(imports[0].date).toLocaleString('pt-BR') : 'Nenhuma importação'}
           </h3>
           <p className="text-xs text-slate-500 mt-1 truncate">{imports && imports.length > 0 ? imports[0].fileName : '-'}</p>
        </Card>
        <Card className="p-5 border-t border-slate-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
           <div className="flex items-center gap-2 mb-2">
             <ArrowUpFromLine className="w-4 h-4 text-blue-500" />
             <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Vendas Importadas Hoje</p>
           </div>
           <h3 className="text-2xl font-bold text-slate-800">{todaySalesImported}</h3>
        </Card>
        <Card className="p-5 border-t border-slate-100 bg-gradient-to-br from-amber-50 to-white shadow-sm">
           <div className="flex items-center gap-2 mb-2">
             <AlertTriangle className="w-4 h-4 text-amber-500" />
             <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Erros Hoje</p>
           </div>
           <h3 className="text-2xl font-bold text-amber-600">{todayErrors}</h3>
        </Card>
        <Card className="p-5 border-t border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => navigateWithDirtyCheck('/almoxarifado/importacoes')}>
           <div className="flex h-full flex-col justify-center items-center text-center">
             <FileUp className="w-6 h-6 text-slate-400 mb-2" />
             <p className="text-sm font-bold text-slate-600">Central de Importações</p>
           </div>
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
