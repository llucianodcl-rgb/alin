import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, Camera, Zap, ZapOff, Keyboard, Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const startScanner = async () => {
    setCameraError(null);
    setIsScanning(false);
    
    if (!videoRef.current) return;

    try {
      // First, explicitly request camera permissions
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      const codeReader = new BrowserMultiFormatReader();
      
      const controls = await codeReader.decodeFromConstraints(
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        videoRef.current,
        (result, error) => {
          if (result) {
            handleSuccess(result.getText(), result.getBarcodeFormat().toString());
          }
        }
      );
      
      controlsRef.current = controls;
      setIsScanning(true);
      
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      let message = "Erro ao acessar a câmera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Permissão da câmera negada. Habilite nas configurações do seu navegador ou dispositivo.";
      } else if (err.name === 'NotFoundError') {
        message = "Nenhuma câmera traseira encontrada no dispositivo.";
      } else if (err.name === 'NotSupportedError') {
        message = "Este navegador não suporta acesso à câmera.";
      }
      setCameraError(message);
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  };

  // Listen for keyboard (external scanner)
  useEffect(() => {
    let buffer = "";
    let lastTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (activeTab === 'MANUAL' && document.activeElement?.tagName === 'INPUT') return;

      const currentTime = Date.now();
      
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
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    stopScanner();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
              <p className="text-xs text-slate-500">Leitura em tempo real</p>
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
              <div className="relative aspect-square overflow-hidden rounded-3xl border-2 border-slate-100 bg-slate-900 shadow-inner group">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Custom Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Scanner Frame */}
                    <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl overflow-hidden">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                      
                      {/* Scanning Line */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[scanner_2s_ease-in-out_infinite]"></div>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-white font-bold mb-2">Câmera Indisponível</h3>
                    <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                      {cameraError}
                    </p>
                    <Button 
                      onClick={startScanner}
                      className="rounded-xl gap-2"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar Novamente
                    </Button>
                  </div>
                )}

                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 animate-pulse">
                    <Camera className="w-12 h-12 mb-2" />
                    <p className="text-xs font-medium">Iniciando câmera...</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Search className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Posicione o código de barras ou QR Code centralizado na moldura azul para leitura automática.
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
             <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               {isScanning ? 'Scanner Ativo' : 'Aguardando'}
             </span>
           </div>
           <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
             Fechar
           </Button>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanner {
          0%, 100% { top: 0; opacity: 0.5; }
          50% { top: 100%; opacity: 1; }
        }
      `}} />
    </div>
  );
}

