import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/db';
import { Product } from '../types';
import { 
  Printer, 
  ArrowLeft, 
  Tag, 
  Settings, 
  Grid, 
  List,
  Layers,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';

export default function LabelPrint() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get('productId');
  
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const [selectedProductId, setSelectedProductId] = useState(productIdFromUrl || '');
  const [quantity, setQuantity] = useState(1);
  const [labelType, setLabelType] = useState<'SHELF' | 'PRODUCT' | 'QR_ONLY'>('PRODUCT');
  
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:p-0 print:m-0 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-6 h-6 text-indigo-600" />
              Impressão de Etiquetas
            </h1>
            <p className="text-sm text-slate-500">Gere etiquetas personalizadas para seus produtos e prateleiras.</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2 bg-indigo-600">
          <Printer className="w-4 h-4" />
          Imprimir Agora
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Config Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              Configurações
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Produto</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione um produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Etiqueta</label>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setLabelType('PRODUCT')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      labelType === 'PRODUCT' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span className="text-sm font-medium">Produto (Padrão)</span>
                    </div>
                    {labelType === 'PRODUCT' && <ChevronRight className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setLabelType('SHELF')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      labelType === 'SHELF' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span className="text-sm font-medium">Prateleira / Gôndola</span>
                    </div>
                    {labelType === 'SHELF' && <ChevronRight className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setLabelType('QR_ONLY')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      labelType === 'QR_ONLY' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Grid className="w-4 h-4" />
                      <span className="text-sm font-medium">Somente QR Code</span>
                    </div>
                    {labelType === 'QR_ONLY' && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Quantidade de Etiquetas</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded-xl">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 p-2 text-center border border-slate-200 rounded-xl font-bold"
                  />
                  <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)} className="rounded-xl">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2">
          <Card className="p-8 bg-slate-50/50 min-h-[500px] flex items-center justify-center border-dashed border-2">
            {!selectedProduct ? (
              <div className="text-center space-y-4">
                <Tag className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-slate-500 italic">Selecione um produto para visualizar a prévia da etiqueta.</p>
              </div>
            ) : (
              <div className="bg-white p-8 shadow-xl rounded-sm border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 text-center">Prévia de Impressão</p>
                {selectedProduct && <LabelItem product={selectedProduct} type={labelType as 'PRODUCT' | 'SHELF' | 'QR_ONLY'} />}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Actual Print Sheet (hidden in UI, visible in Print) */}
      <div className="hidden print:block print:bg-white">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: quantity }).map((_, idx) => (
            selectedProduct ? (
              <React.Fragment key={idx}>
                <LabelItem product={selectedProduct} type={labelType as 'PRODUCT' | 'SHELF' | 'QR_ONLY'} />
              </React.Fragment>
            ) : null
          ))}
        </div>
      </div>
    </div>
  );
}

function LabelItem({ product, type }: { product: Product, type: 'SHELF' | 'PRODUCT' | 'QR_ONLY' }) {
  if (type === 'QR_ONLY') {
    return (
      <div className="w-32 h-32 flex items-center justify-center p-2 border border-slate-100 bg-white mx-auto">
        <QRCodeSVG value={product.id || 'N/A'} size={100} level="H" />
      </div>
    );
  }

  if (type === 'SHELF') {
    return (
      <div className="w-[8cm] h-[4cm] border-2 border-black p-4 flex flex-col justify-between bg-white overflow-hidden m-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h3 className="text-xl font-bold leading-tight uppercase truncate">{product.name}</h3>
            <p className="text-xs font-medium text-slate-600">{product.brand || 'Marca n/a'}</p>
          </div>
          <div className="w-16 h-16 shrink-0">
             <QRCodeSVG value={product.id || 'N/A'} size={64} />
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Localização</p>
            <p className="text-lg font-black bg-black text-white px-2 py-0.5 w-fit">{product.locationPath?.split(' > ').pop() || 'SEM LOCAL'}</p>
          </div>
          <div className="text-right">
             <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Cód. Barras</p>
             <p className="text-sm font-mono font-bold tracking-tighter">{product.barcode || product.internalCode}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[10cm] h-[5cm] border border-slate-300 p-6 flex flex-col justify-between bg-white m-2 rounded-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <p className="text-[10px] font-bold text-indigo-600 tracking-wider">GEIN – Gestão Inteligente</p>
          <h3 className="text-lg font-black text-slate-900 leading-none truncate">{product.name}</h3>
          <p className="text-xs font-medium text-slate-500">{product.brand}</p>
        </div>
        <div className="w-20 h-20 bg-white p-1 border border-slate-100 rounded-lg">
          <QRCodeSVG value={product.id || 'N/A'} size={72} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
        <div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Código</p>
          <p className="text-sm font-mono font-bold text-slate-800">{product.barcode || product.internalCode || 'N/A'}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Validade</p>
          <p className="text-sm font-bold text-slate-800">{product.expirationDate ? new Date(product.expirationDate).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
           <MapPin className="w-3 h-3" />
           {product.locationPath || 'SEM LOCALIZAÇÃO'}
        </div>
        <div className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded">
          {product.unitOfMeasure}
        </div>
      </div>
    </div>
  );
}

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
