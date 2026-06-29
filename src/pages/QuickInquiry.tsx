import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/db';
import { Product } from '../types';
import { 
  Search, 
  Camera, 
  MapPin, 
  ArrowLeft, 
  Package, 
  History, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Tag,
  Edit2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ScannerDialog } from '../components/scanner/ScannerDialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '../utils/cn';

export default function QuickInquiry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const barcodeFromUrl = searchParams.get('barcode');
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const events = useLiveQuery(() => 
    selectedProduct ? db.stockEvents.where('productId').equals(selectedProduct.id!).reverse().limit(10).toArray() : []
  , [selectedProduct]);

  useEffect(() => {
    if (barcodeFromUrl) {
      db.products.where('barcode').equals(barcodeFromUrl).first().then(p => {
        if (p) setSelectedProduct(p);
      });
    }
  }, [barcodeFromUrl]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    const p = await db.products.where('barcode').equals(searchTerm).or('internalCode').equals(searchTerm).or('name').equals(searchTerm).first();
    if (p) {
      setSelectedProduct(p);
    } else {
      // Fuzzy search if exact match fails
      const allProducts = await db.products.toArray();
      const fuzzy = allProducts.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (fuzzy) setSelectedProduct(fuzzy);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-6 h-6 text-blue-600" />
              Consulta Rápida
            </h1>
            <p className="text-sm text-slate-500">Escaneie ou busque um produto para ver detalhes completos.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nome, código de barras ou SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
          <Button type="submit" className="rounded-2xl px-6">Buscar</Button>
        </form>
        <Button 
          onClick={() => setIsScannerOpen(true)}
          className="gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-6 md:py-3 shadow-lg shadow-indigo-100"
        >
          <Camera className="w-5 h-5" />
          Escanear Produto
        </Button>
      </div>

      {!selectedProduct ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <div className="max-w-sm mx-auto space-y-4">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-md">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">Nenhum produto selecionado</h2>
            <p className="text-sm text-slate-500">Utilize o campo de busca ou o scanner para visualizar as informações de um item em tempo real.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-none shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Produto</p>
                    <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">{selectedProduct.brand || 'Marca não informada'}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm font-mono">{selectedProduct.barcode || selectedProduct.internalCode}</span>
                    </div>
                  </div>
                  {selectedProduct.photoUrl && (
                    <img src={selectedProduct.photoUrl} alt={selectedProduct.name} className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-xl" />
                  )}
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoque Atual</p>
                    <p className={cn("text-2xl font-bold", selectedProduct.currentStock <= selectedProduct.minQuantity ? "text-red-600" : "text-emerald-600")}>
                      {selectedProduct.currentStock}
                    </p>
                    <p className="text-xs text-slate-500">{selectedProduct.unitOfMeasure}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoque Mínimo</p>
                    <p className="text-2xl font-bold text-slate-800">{selectedProduct.minQuantity}</p>
                    <p className="text-xs text-slate-500">Ponto de alerta</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Unitário</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {selectedProduct.unitCost ? `R$ ${selectedProduct.unitCost.toFixed(2)}` : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">Última compra</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validade</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {selectedProduct.expirationDate ? new Date(selectedProduct.expirationDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">{selectedProduct.noExpiration ? 'Imperecível' : 'Data limite'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    Localização
                  </h3>
                  <Button variant="ghost" size="sm" className="text-blue-600 h-auto p-0 hover:bg-transparent" onClick={() => navigate(`/almoxarifado/mapa?locationId=${selectedProduct.locationId}`)}>
                    Ver no Mapa
                  </Button>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-700">{selectedProduct.locationPath || 'Localização não definida'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Layers className="w-4 h-4" />
                  <span>Setor A {' > '} Corredor 1 {' > '} Prateleira 4</span>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-500" />
                  Fornecedor
                </h3>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-700">Fornecedor Principal</p>
                  <p className="text-xs text-slate-500">Visualizar histórico de pedidos</p>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-500" />
                  Movimentações Recentes
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/historico')}>Ver Tudo</Button>
              </div>
              <div className="space-y-3">
                {events?.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        event.type === 'ENTRADA' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {event.type === 'ENTRADA' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{event.type === 'ENTRADA' ? 'Entrada de Mercadoria' : 'Saída'}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date(event.date).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className={cn(
                      "font-bold",
                      event.type === 'ENTRADA' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {event.type === 'ENTRADA' ? '+' : '-'}{event.quantity}
                    </p>
                  </div>
                ))}
                {events?.length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-sm">Sem movimentações recentes.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-slate-800">Ações</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button className="w-full justify-start gap-3 rounded-xl h-12" onClick={() => navigate(`/entradas/nova?productId=${selectedProduct.id}`)}>
                  <TrendingUp className="w-5 h-5" />
                  Registrar Entrada
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-slate-200" onClick={() => navigate(`/saidas/nova?productId=${selectedProduct.id}`)}>
                  <TrendingDown className="w-5 h-5" />
                  Registrar Saída
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-slate-200" onClick={() => navigate(`/produtos/${selectedProduct.id}/editar`)}>
                  <Edit2 className="w-5 h-5" />
                  Editar Produto
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl h-12 border-slate-200" onClick={() => navigate(`/almoxarifado/etiquetas?productId=${selectedProduct.id}`)}>
                  <Tag className="w-5 h-5" />
                  Gerar Etiquetas
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4 bg-slate-900 text-white border-none">
              <div className="flex items-center gap-2 text-indigo-400">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Resumo Estatístico</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Giro de Estoque (Mês)</p>
                  <p className="text-xl font-bold">Médio</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Sugestão de Compra</p>
                  <p className="text-sm font-medium">Recomendado pedir +20 unidades em 5 dias.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <ScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)}
        onSelect={(p) => setSelectedProduct(p)}
      />
    </div>
  );
}
