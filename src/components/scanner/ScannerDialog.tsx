import React, { useState } from 'react';
import { SmartScanner } from './SmartScanner';
import { scanLogRepository, productRepository } from '../../db/repository';
import { db } from '../../db/db';
import { Product } from '../../types';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  ArrowRight, 
  MapPin, 
  Layers,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  History,
  ShoppingBag
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (product: Product) => void;
  mode?: 'GENERAL' | 'ENTRY' | 'EXIT' | 'INVENTORY' | 'CADASTRO';
}

export function ScannerDialog({ isOpen, onClose, onSelect, mode = 'GENERAL' }: ScannerDialogProps) {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useAuth();
  
  const [step, setStep] = useState<'SCAN' | 'RESULT' | 'PUBLIC_RESULT' | 'NOT_FOUND'>('SCAN');
  const [scannedCode, setScannedCode] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [publicData, setPublicData] = useState<any>(null);

  const handleScan = async (code: string, format: string) => {
    setScannedCode(code);
    
    // 1. Check internal DB
    const internalProduct = await productRepository.list({ barcode: code });
    const product = internalProduct[0] || (await productRepository.list({ internalCode: code }))[0];
    
    // Log the scan
    if (profile) {
      await scanLogRepository.add({
        userId: profile.id,
        userName: profile.name,
        timestamp: new Date().toISOString(),
        code,
        format,
        type: product ? 'PRODUCT' : 'OTHER',
        targetId: product?.id,
        targetName: product?.name,
        operation: mode,
        device: navigator.userAgent
      } as any);
    }

    if (product) {
      setFoundProduct(product);
      setStep('RESULT');
    } else {
      // 2. Search Public DB (Simulated)
      searchPublicDB(code);
    }
  };

  const searchPublicDB = (code: string) => {
    // Simulating an API call to a public database
    // In a real app, this would be an axios.get('https://api.ean-search.org/...')
    setStep('SCAN'); // Show loading if needed
    
    setTimeout(() => {
      // Mocked public data for common codes or random
      const mockPublicData: Record<string, any> = {
        '7891234567890': { name: 'Coca-Cola 2L', brand: 'Coca-Cola', category: 'Bebidas', unit: 'Unidade' },
        '7890000000001': { name: 'Arroz Agulha 5kg', brand: 'Tio João', category: 'Alimentos', unit: 'Pacote' },
      };

      if (mockPublicData[code]) {
        setPublicData({ ...mockPublicData[code], barcode: code });
        setStep('PUBLIC_RESULT');
      } else {
        setStep('NOT_FOUND');
      }
    }, 800);
  };

  const handleRegisterEntry = () => {
    if (foundProduct) {
      navigate(`/entradas/nova?productId=${foundProduct.id}`);
      onClose();
    }
  };

  const handleRegisterExit = () => {
    if (foundProduct) {
      navigate(`/saidas/nova?productId=${foundProduct.id}`);
      onClose();
    }
  };

  const handleEditProduct = () => {
    if (foundProduct) {
      navigate(`/produtos/${foundProduct.id}/editar`);
      onClose();
    }
  };

  const handleCreateNew = () => {
    navigate(`/produtos/novo?barcode=${scannedCode}${publicData ? `&name=${encodeURIComponent(publicData.name)}&brand=${encodeURIComponent(publicData.brand)}&unit=${publicData.unit}` : ''}`);
    onClose();
  };

  const handleSelect = () => {
    if (foundProduct && onSelect) {
      onSelect(foundProduct);
      onClose();
    }
  };

  return (
    <>
      <SmartScanner 
        isOpen={isOpen && step === 'SCAN'} 
        onClose={onClose} 
        onScan={handleScan}
      />

      <AnimatePresence>
        {isOpen && step !== 'SCAN' && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              {/* Internal Product Found */}
              {step === 'RESULT' && foundProduct && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Produto Identificado</h2>
                      <p className="text-sm text-slate-500">Já cadastrado no GEIN</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Produto</p>
                        <p className="font-bold text-slate-800">{foundProduct.name}</p>
                        <p className="text-sm text-slate-500">{foundProduct.brand || 'Sem marca'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoque Atual</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-slate-800">{foundProduct.currentStock}</span>
                          <span className="text-xs text-slate-500 font-medium">{foundProduct.unitOfMeasure}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código</p>
                        <p className="text-sm font-mono font-bold text-slate-700">{foundProduct.barcode || foundProduct.internalCode}</p>
                      </div>
                    </div>

                    {foundProduct.locationPath && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-slate-600">{foundProduct.locationPath}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {mode === 'ENTRY' || mode === 'GENERAL' ? (
                      <Button onClick={handleRegisterEntry} className="w-full gap-2 py-6 rounded-2xl bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-5 h-5" />
                        Registrar Entrada
                      </Button>
                    ) : null}

                    {mode === 'EXIT' || mode === 'GENERAL' ? (
                      <Button onClick={handleRegisterExit} variant="outline" className="w-full gap-2 py-6 rounded-2xl border-slate-200">
                        <ArrowRight className="w-5 h-5" />
                        Registrar Saída
                      </Button>
                    ) : null}

                    {onSelect && (
                      <Button onClick={handleSelect} className="w-full gap-2 py-6 rounded-2xl">
                        Selecionar Item
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" onClick={handleEditProduct} className="gap-2 rounded-xl text-slate-600">
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setStep('SCAN')} className="gap-2 rounded-xl text-slate-600">
                        <XCircle className="w-4 h-4" />
                        Voltar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Public Database Result */}
              {step === 'PUBLIC_RESULT' && publicData && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                      <ExternalLink className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Novo Produto Encontrado</h2>
                      <p className="text-sm text-slate-500">Informações da base pública</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 space-y-4">
                    <div className="flex items-start gap-3">
                      <Search className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-blue-400 uppercase">Sugestão de Nome</p>
                        <p className="font-bold text-slate-800">{publicData.name}</p>
                        <p className="text-sm text-slate-500">{publicData.brand}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Categoria Sugerida</p>
                        <p className="text-sm font-bold text-slate-700">{publicData.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Unidade</p>
                        <p className="text-sm font-bold text-slate-700">{publicData.unit}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 text-center">
                      Revisamos estas informações para você. Deseja cadastrar este produto no GEIN agora?
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setStep('SCAN')}>
                        Cancelar
                      </Button>
                      <Button className="flex-1 rounded-2xl bg-blue-600" onClick={handleCreateNew}>
                        Cadastrar Agora
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Not Found Anywhere */}
              {step === 'NOT_FOUND' && (
                <div className="p-6 space-y-6 text-center">
                  <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">Produto Não Encontrado</h2>
                    <p className="text-sm text-slate-500">O código <span className="font-mono font-bold text-slate-700">{scannedCode}</span> não está cadastrado e não foi localizado na base pública.</p>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleCreateNew} className="w-full gap-2 py-6 rounded-2xl bg-blue-600">
                      <Plus className="w-5 h-5" />
                      Cadastrar Manualmente
                    </Button>
                    <Button variant="ghost" onClick={() => setStep('SCAN')} className="w-full rounded-2xl text-slate-500">
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

const XCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);
