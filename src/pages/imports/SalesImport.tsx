import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { 
  productRepository, 
  stockEventRepository, 
  auditRepository, 
  revenueRepository, 
  importHistoryRepository,
  investigationRepository
} from '../../db/repository';
import { Receipt, ArrowLeft, UploadCloud, FileText, CheckCircle2, AlertTriangle, AlertCircle, Store, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import Papa from 'papaparse';
import { ReconciliationEngine } from '../../services/ReconciliationEngine';

type ImportStep = 'UPLOAD' | 'PREVIEW' | 'IMPORTING' | 'DONE';

interface PreviewData {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  productsFound: number;
  productsNotFound: number;
  totalFinancial: number;
  errors: any[];
  parsedData: any[];
}

export default function SalesImport() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const templates = useLiveQuery(() => db.importTemplates.where('type').equals('SALES').toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const importHistory = useLiveQuery(() => db.importHistory.toArray(), []) || [];
  const registers = useLiveQuery(() => db.cashRegisters.where('status').equals('ACTIVE').toArray(), []) || [];
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [reconciliationResult, setReconciliationResult] = useState<import('../../types').CashReconciliation | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedTemplate) {
      showNotification('Selecione um layout primeiro.', 'error');
      return;
    }
    if (!selectedRegisterId) {
      showNotification('Selecione um caixa para a importação.', 'error');
      return;
    }
    
    // Check for duplicates
    const isDuplicate = importHistory.some(h => 
      h.fileName === selectedFile.name && 
      h.type === 'SALES' && 
      h.status === 'SUCCESS' &&
      new Date(h.date).toDateString() === new Date().toDateString()
    );
    
    if (isDuplicate) {
       if(!window.confirm('Um arquivo com este nome já foi importado hoje com sucesso. Deseja continuar mesmo assim?')) {
         return;
       }
    }

    setFile(selectedFile);
    setStep('PREVIEW');
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        analyzeData(results.data, template.fieldMapping);
      },
      error: (error) => {
        showNotification(`Erro ao ler arquivo: ${error.message}`, 'error');
        setStep('UPLOAD');
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const analyzeData = (data: any[], mapping: Record<string, string>) => {
    let validRows = 0;
    let invalidRows = 0;
    let productsFound = new Set();
    let productsNotFound = new Set();
    let totalFinancial = 0;
    let errors: any[] = [];
    
    data.forEach((row, index) => {
      const barcodeCol = mapping['barcode'];
      const qtyCol = mapping['quantity'];
      const unitPriceCol = mapping['unitPrice'];
      const totalPriceCol = mapping['totalPrice'];
      
      const barcode = row[barcodeCol];
      const qty = parseFloat(row[qtyCol]?.toString().replace(',', '.') || '0');
      
      const unitPrice = unitPriceCol && row[unitPriceCol] ? parseFloat(row[unitPriceCol].toString().replace(',', '.')) : 0;
      const rowTotal = totalPriceCol && row[totalPriceCol] ? parseFloat(row[totalPriceCol].toString().replace(',', '.')) : (qty * unitPrice);

      if (!barcode || isNaN(qty) || qty <= 0) {
        invalidRows++;
        errors.push({ row: index + 2, reason: 'Código de barras ou quantidade inválidos' });
        return;
      }

      validRows++;
      
      const product = products.find(p => p.barcode === barcode || p.internalCode === barcode);
      if (product) {
        productsFound.add(product.id);
        if (!isNaN(rowTotal)) {
          totalFinancial += rowTotal;
        }
      } else {
        productsNotFound.add(barcode);
        errors.push({ row: index + 2, reason: `Produto não encontrado: ${barcode}` });
      }
    });

    setPreview({
      totalRows: data.length,
      validRows,
      invalidRows,
      productsFound: productsFound.size,
      productsNotFound: productsNotFound.size,
      totalFinancial,
      errors,
      parsedData: data
    });
  };

  const handleImport = async () => {
    if (!preview || !file || !selectedTemplate || !selectedRegisterId || !profile) return;
    
    setStep('IMPORTING');
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    const startTime = performance.now();
    let successCount = 0;
    let errorCount = 0;
    let amountSuccessfullyImported = 0;
    
    try {
      setProgress({ current: 0, total: preview.parsedData.length, message: 'Iniciando importação...' });
      
      for (let i = 0; i < preview.parsedData.length; i++) {
        const row = preview.parsedData[i];
        
        if (i % 10 === 0) {
          setProgress({ current: i, total: preview.parsedData.length, message: 'Atualizando estoque e financeiro...' });
          // Pequena pausa para a UI atualizar
          await new Promise(r => setTimeout(r, 0));
        }

        const barcodeCol = template.fieldMapping['barcode'];
        const qtyCol = template.fieldMapping['quantity'];
        const unitPriceCol = template.fieldMapping['unitPrice'];
        const totalPriceCol = template.fieldMapping['totalPrice'];
        const invoiceCol = template.fieldMapping['invoiceNumber'];
        
        const barcode = row[barcodeCol];
        const qty = parseFloat(row[qtyCol]?.toString().replace(',', '.') || '0');
        
        if (!barcode || isNaN(qty) || qty <= 0) {
          errorCount++;
          continue;
        }

        const unitPrice = unitPriceCol && row[unitPriceCol] ? parseFloat(row[unitPriceCol].toString().replace(',', '.')) : 0;
        const rowTotal = totalPriceCol && row[totalPriceCol] ? parseFloat(row[totalPriceCol].toString().replace(',', '.')) : (qty * unitPrice);

        const product = products.find(p => p.barcode === barcode || p.internalCode === barcode);
         if (product) {
          // Registrar Saída
          const eventId = await stockEventRepository.add({
            productId: product.id!,
            type: 'SAIDA',
            quantity: qty,
            date: new Date().toISOString(),
            reason: 'Venda',
            userId: profile.id,
            cashRegisterId: selectedRegisterId,
            notes: `Importação de vendas via arquivo ${file.name}`
          } as any);

          await productRepository.update(product.id!, {
            currentStock: product.currentStock - qty
          } as any, {
            totalStockValue: -qty * (product.unitCost || 0)
          });

          await auditRepository.add({
            userId: profile.id,
            userName: profile.name,
            timestamp: new Date().toISOString(),
            module: 'ALMOXARIFADO',
            action: 'UPDATE',
            targetId: product.id,
            targetName: product.name,
            cashRegisterId: selectedRegisterId,
            quantityChanged: -qty,
            details: 'Saída por importação de vendas'
          } as any);
          
          if (!isNaN(rowTotal) && rowTotal > 0) {
            await revenueRepository.add({
              description: `Venda - ${product.name} (Qtd: ${qty})${invoiceCol && row[invoiceCol] ? ` - Doc: ${row[invoiceCol]}` : ''}`,
              amount: rowTotal,
              date: new Date().toISOString(),
              source: 'SALE',
              referenceId: eventId,
              status: 'RECEIVED',
              cashRegisterId: selectedRegisterId
            } as any, {
              monthlyRevenue: rowTotal,
              monthlyProfit: rowTotal - ((product.unitCost || 0) * qty)
            });
          }
          successCount++;
          amountSuccessfullyImported += (!isNaN(rowTotal) ? rowTotal : 0);
        } else {
          errorCount++;
        }
      }

      const endTime = performance.now();
      const timeMs = Math.round(endTime - startTime);
      
      // Registrar Histórico
      const importId = await importHistoryRepository.add({
        date: new Date().toISOString(),
        fileName: file.name,
        fileHash: file.size.toString(), // Simplified hash for now
        type: 'SALES',
        recordsTotal: preview.totalRows,
        successCount,
        errorCount,
        status: errorCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'PARTIAL' : 'FAILED'),
        timeMs,
        userId: profile.id,
        cashRegisterId: selectedRegisterId,
        errors: preview.errors.slice(0, 100) // limit errors saved
      } as any);

      // Run Smart Reconciliation
      const reconciliationResult = await ReconciliationEngine.runReconciliation(
        selectedRegisterId,
        profile.id,
        'IMPORT',
        importId,
        amountSuccessfullyImported, // The amount actually successfully imported
        preview.totalFinancial, // The expected amount from the PDV file
        preview.totalRows // Using total sales count as reference
      );

      setReconciliationResult(reconciliationResult);

      setStep('DONE');
      showNotification('Importação concluída.', 'success');

    } catch (err) {
      console.error(err);
      showNotification('Erro grave durante a importação.', 'error');
      setStep('PREVIEW');
    }
  };

  const downloadTemplate = () => {
    if (!selectedTemplate) {
      showNotification('Selecione um layout primeiro para baixar o modelo correspondente.', 'warning');
      return;
    }
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    // Extract headers from mapping values
    const headers = Object.values(template.fieldMapping).filter(Boolean);
    if (headers.length === 0) {
      showNotification('O layout selecionado não possui colunas mapeadas.', 'error');
      return;
    }
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `modelo_importacao_${template.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/almoxarifado/importacoes')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Importação de Vendas
          </h1>
          <p className="text-sm text-slate-500">Processe vendas de sistemas externos automaticamente.</p>
        </div>
      </div>

      {step === 'UPLOAD' && (
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Caixa Destino *</label>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-400" />
                <Select className="flex-1" value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)}>
                  <option value="">Selecione um caixa...</option>
                  {registers.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Layout de Arquivo *</label>
              <div className="flex gap-4">
                <Select className="flex-1" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                  <option value="">Selecione...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Button variant="outline" onClick={downloadTemplate}>Baixar Modelo</Button>
              </div>
              {templates.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">Nenhum layout configurado. Acesse a Configuração de Layout primeiro.</p>
              )}
            </div>
          </div>

          <div 
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              selectedTemplate && selectedRegisterId ? 'border-slate-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer' : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
            }`}
            onDragOver={handleDragOver}
            onDrop={(selectedTemplate && selectedRegisterId) ? handleDrop : undefined}
            onClick={() => (selectedTemplate && selectedRegisterId) && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept=".csv"
              onChange={(e) => e.target.files && processFile(e.target.files[0])}
            />
            <UploadCloud className={`w-16 h-16 mx-auto mb-4 ${selectedTemplate && selectedRegisterId ? 'text-blue-500' : 'text-slate-300'}`} />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Arraste seu arquivo CSV aqui</h3>
            <p className="text-slate-500 mb-6">ou clique para procurar no seu computador</p>
            <Button disabled={!selectedTemplate || !selectedRegisterId}>Selecionar Arquivo</Button>
          </div>
        </Card>
      )}

      {step === 'PREVIEW' && preview && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">{file?.name}</h2>
              <p className="text-sm text-slate-500">
                Importando para: <strong>{registers.find(r => r.id === selectedRegisterId)?.name}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Linhas Totais</p>
              <p className="text-2xl font-bold text-slate-800">{preview.totalRows}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <p className="text-xs font-bold text-emerald-600 uppercase">Válidas</p>
              <p className="text-2xl font-bold text-emerald-700">{preview.validRows}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <p className="text-xs font-bold text-amber-600 uppercase">Sem Cadastro</p>
              <p className="text-2xl font-bold text-amber-700">{preview.productsNotFound}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <p className="text-xs font-bold text-red-600 uppercase">Erros Fatais</p>
              <p className="text-2xl font-bold text-red-700">{preview.invalidRows}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-xs font-bold text-blue-600 uppercase">Financeiro</p>
              <p className="text-2xl font-bold text-blue-700">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preview.totalFinancial)}
              </p>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 max-h-48 overflow-auto">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Alertas ({preview.errors.length})
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {preview.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Linha {e.row}: {e.reason}</li>
                ))}
                {preview.errors.length > 10 && (
                  <li className="font-bold mt-2">...e mais {preview.errors.length - 10} alertas.</li>
                )}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Importante:</strong> Itens sem cadastro ou com erros serão ignorados durante a importação. A importação atualizará os estoques automaticamente, registrará as movimentações no caixa selecionado, e criará os recebimentos correspondentes.
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <Button variant="outline" className="flex-1" onClick={() => setStep('UPLOAD')}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleImport}
              disabled={preview.validRows === 0}
            >
              Confirmar Importação
            </Button>
          </div>
        </Card>
      )}

      {step === 'IMPORTING' && (
        <Card className="p-12 text-center space-y-6">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Processando Importação</h2>
            <p className="text-slate-500">{progress.message}</p>
          </div>
          <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm font-bold text-blue-600">
            {progress.current} / {progress.total}
          </p>
        </Card>
      )}

      {step === 'DONE' && (
        <div className="space-y-6">
          <Card className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Importação Concluída</h2>
              <p className="text-slate-500 mb-6">Os estoques e históricos foram atualizados com sucesso no caixa selecionado.</p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/almoxarifado/importacoes/historico')}>
                  Ver Histórico
                </Button>
                <Button onClick={() => {
                  setStep('UPLOAD');
                  setFile(null);
                  setPreview(null);
                  setReconciliationResult(null);
                }}>
                  Nova Importação
                </Button>
              </div>
            </div>
          </Card>
          
          {reconciliationResult && (
            <Card className={`p-6 border-l-4 ${reconciliationResult.status === 'OK' ? 'border-emerald-500' : reconciliationResult.status === 'WARNING' ? 'border-amber-500' : 'border-red-500'}`}>
              <div className="flex items-start gap-4">
                {reconciliationResult.status === 'OK' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                ) : reconciliationResult.status === 'WARNING' ? (
                  <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                )}
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {reconciliationResult.status === 'OK' ? 'Caixa conciliado com sucesso.' : 'Divergências encontradas.'}
                    </h3>
                    <p className="text-slate-600">
                      Diferença: <span className={`font-bold ${reconciliationResult.difference === 0 ? 'text-emerald-600' : reconciliationResult.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reconciliationResult.difference)}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Valor Esperado (PDV)</p>
                      <p className="text-lg font-bold text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reconciliationResult.expectedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Valor Importado</p>
                      <p className="text-lg font-bold text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reconciliationResult.informedAmount)}
                      </p>
                    </div>
                  </div>

                  {reconciliationResult.suggestedCauses && reconciliationResult.suggestedCauses.length > 0 && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                      <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Possíveis Causas
                      </h4>
                      <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                        {reconciliationResult.suggestedCauses.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reconciliationResult.notes && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-800 font-medium">
                      {reconciliationResult.notes}
                    </div>
                  )}

                  {reconciliationResult.status !== 'OK' && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <Button 
                        variant="primary" 
                        onClick={async () => {
                          const invId = await investigationRepository.add({
                            reconciliationId: reconciliationResult.id!,
                            cashRegisterId: reconciliationResult.cashRegisterId,
                            operatorId: reconciliationResult.operatorId,
                            date: new Date().toISOString(),
                            difference: reconciliationResult.difference,
                            status: 'IN_PROGRESS',
                            checklist: {},
                            notes: '',
                            evidences: [],
                            investigatorId: profile?.id || 'system'
                          } as any);
                          navigate(`/financeiro/investigacoes/${invId}`);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Iniciar Investigação Assistida
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
