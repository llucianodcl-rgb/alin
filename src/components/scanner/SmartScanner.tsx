import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, Keyboard, Search, Package, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartScannerProps {
  onScan: (data: string, format: string) => void;
  onClose: () => void;
  title?: string;
  isOpen: boolean;
}

export function SmartScanner({ onScan, onClose, title = 'Scanner Inteligente', isOpen }: SmartScannerProps) {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA') {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]
      };

      scannerRef.current = new Html5QrcodeScanner("reader", config, false);
      
      scannerRef.current.render(
        (decodedText, decodedResult) => {
          // Success
          handleSuccess(decodedText, decodedResult.result.format?.formatName || 'UNKNOWN');
        },
        (error) => {
          // Silent error for performance
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isOpen, activeTab]);

  // Listen for keyboard (external scanner)
  useEffect(() => {
    let buffer = "";
    let lastTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (activeTab === 'MANUAL' && document.activeElement?.tagName === 'INPUT') return;

      const currentTime = Date.now();
      
      // If delay between keys is small, it's likely a scanner
      if (currentTime - lastTime > 100) {
        buffer = "";
      }

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleSuccess(buffer, 'EXTERNAL_SCANNER');
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      
      lastTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab]);

  const handleSuccess = (decodedText: string, format: string) => {
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    // Play sound if needed (optional)
    
    onScan(decodedText, format);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim(), 'MANUAL');
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{title}</h2>
              <p className="text-xs text-slate-500">Aponte para o código ou digite</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 mx-6 mt-4 rounded-xl">
          <button 
            onClick={() => setActiveTab('CAMERA')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'CAMERA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            Câmera
          </button>
          <button 
            onClick={() => setActiveTab('MANUAL')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'MANUAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'CAMERA' ? (
            <div className="space-y-4">
              <div id="reader" className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50 min-h-[300px]"></div>
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Search className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  A leitura é automática. Centralize o código na moldura para identificar o produto instantaneamente.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Digite o Código</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ex: 7891234567890"
                    className="w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-mono tracking-wider"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <p className="text-xs text-slate-600 italic">
                    Dica: Você também pode usar um leitor externo USB ou Bluetooth em qualquer lugar desta tela.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scanner Ativo</span>
           </div>
           <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
             Fechar
           </Button>
        </div>
      </motion.div>
    </div>
  );
}
