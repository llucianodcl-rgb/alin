import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db/db';
import { productRepository, stockEventRepository, revenueRepository } from '../db/repository';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowUpFromLine, Save, Plus, Trash2, Camera } from 'lucide-react';
import { ScannerDialog } from '../components/scanner/ScannerDialog';
import { maskCurrency, parseCurrency } from '../utils/masks';
import { useNotification } from '../contexts/NotificationContext';
import { cn } from '../utils/cn';

type ExitItem = {
  id: string;
  productId: string;
  quantity: number;
  salePrice?: number;
};

export default function ExitForm() {
  const navigate = useNavigate();
  const { confirm, showUndo } = useNotification();
  const products = useLiveQuery(() => db.products.toArray());

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<'Venda' | 'Perda' | 'Quebra' | 'Troca' | 'Uso interno' | 'Vencimento' | 'Doacao' | 'Outro'>('Venda');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<ExitItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const addItemFromScan = (product: any) => {
    const existingIndex = items.findIndex(i => i.productId === product.id);
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        { id: generateId(), productId: product.id!, quantity: 1, salePrice: 0 }
      ]);
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: generateId(), productId: '', quantity: 1, salePrice: 0 }
    ]);
  };

  const updateItem = (id: string, field: keyof ExitItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert('Adicione pelo menos um item.');
    if (items.some(i => !i.productId || i.quantity <= 0)) return alert('Preencha os produtos e quantidades corretamente.');

    confirm({
      title: 'Registrar saída',
      message: 'Deseja confirmar a saída destas mercadorias do estoque?',
      confirmLabel: 'Confirmar',
      variant: 'destructive',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const eventIds: string[] = [];
          const oldStockStates: { id: string, stock: number }[] = [];

          for (const item of items) {
            const product = await productRepository.get(item.productId);
            if (product) {
              // Check if enough stock
              if (product.currentStock < item.quantity) {
                throw new Error(`Estoque insuficiente para o produto: ${product.name}`);
              }
              
              // Store old state
              oldStockStates.push({ id: product.id, stock: product.currentStock });

              // Update product stock
              const newStock = product.currentStock - item.quantity;
              await productRepository.update(product.id, { currentStock: newStock } as any, {
                totalStockValue: -item.quantity * (product.unitCost || 0)
              });

              // Create stock event
              const eventId = await stockEventRepository.add({
                productId: item.productId,
                type: 'SAIDA',
                quantity: item.quantity,
                date,
                reason,
                notes
              } as any);
              eventIds.push(eventId);

              // Generate Revenue if reason is Venda
              const salePrice = typeof item.salePrice === 'string' ? parseCurrency(item.salePrice) : item.salePrice;
              if (reason === 'Venda' && (salePrice || 0) > 0) {
                const totalRevenue = (salePrice || 0) * item.quantity;
                await revenueRepository.add({
                  description: `Venda - ${product.name} (Qtd: ${item.quantity})`,
                  amount: totalRevenue,
                  date: date,
                  source: 'SALE',
                  referenceId: eventId,
                  status: 'RECEIVED'
                } as any, {
                  monthlyRevenue: totalRevenue,
                  monthlyProfit: totalRevenue - ((product.unitCost || 0) * item.quantity)
                });
              }
            }
          }

          showUndo({
            message: 'Saída registrada com sucesso.',
            onUndo: async () => {
              // Delete events
              for (const eid of eventIds) {
                await stockEventRepository.delete(eid);
              }
              // Restore stock states
              for (const state of oldStockStates) {
                await productRepository.update(state.id, { currentStock: state.stock } as any);
              }
            }
          });
          navigate('/almoxarifado', { replace: true });
        } catch (error: any) {
          console.error('Error saving exit:', error);
          alert(error.message || 'Erro ao registrar saída.');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <ArrowUpFromLine className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registro de Saída</h1>
          <p className="text-sm text-slate-500">Registre vendas, perdas, quebras ou uso interno.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados da Saída</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Saída *</Label>
                <Select id="reason" value={reason} onChange={e => setReason(e.target.value as any)} required>
                  <option value="Venda">Venda</option>
                  <option value="Uso interno">Uso Interno</option>
                  <option value="Perda">Perda</option>
                  <option value="Quebra">Quebra</option>
                  <option value="Troca">Troca</option>
                  <option value="Vencimento">Vencimento</option>
                  <option value="Doacao">Doação</option>
                  <option value="Outro">Outro</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-900">Itens para Saída/Picking</h2>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsScannerOpen(true)} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                  <Camera className="w-4 h-4 mr-2" />
                  Escanear Produto
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const sortedItems = [...items].sort((a, b) => {
                    const prodA = products?.find(p => p.id === a.productId);
                    const prodB = products?.find(p => p.id === b.productId);
                    const locA = prodA?.locationPath || 'ZZZZZ';
                    const locB = prodB?.locationPath || 'ZZZZZ';
                    return locA.localeCompare(locB);
                  });
                  setItems(sortedItems);
                }} title="Agrupa os itens pela localização física no depósito para facilitar a coleta">
                  Rota Inteligente
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </div>

            <ScannerDialog 
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onSelect={addItemFromScan}
              mode="EXIT"
            />

            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum item adicionado. Clique no botão acima para começar.
                </div>
              ) : (
                items.map((item, index) => {
                  const selectedProduct = products?.find(p => p.id === item.productId);
                  return (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className={cn("space-y-2", reason === 'Venda' ? "md:col-span-4" : "md:col-span-7")}>
                      <Label>Produto *</Label>
                      <Select 
                        value={item.productId} 
                        onChange={e => updateItem(item.id, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Selecione...</option>
                        {products?.map(p => (
                          <option key={p.id} value={p.id!}>
                            {p.name} (Estoque: {p.currentStock} {p.unitOfMeasure})
                          </option>
                        ))}
                      </Select>
                      {selectedProduct?.locationPath && (
                         <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block font-medium mt-1">
                           📍 {selectedProduct.locationPath}
                         </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Quantidade *</Label>
                      <Input type="number" step="any" min="0.01" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} required />
                    </div>
                    {reason === 'Venda' && (
                      <div className="space-y-2 md:col-span-3">
                        <Label>Preço de Venda (R$)</Label>
                        <Input 
                          value={typeof item.salePrice === 'number' ? maskCurrency(item.salePrice.toFixed(2).replace('.', '')) : item.salePrice} 
                          onChange={e => {
                            const masked = maskCurrency(e.target.value);
                            updateItem(item.id, 'salePrice', masked);
                          }} 
                        />
                      </div>
                    )}
                    <div className="md:col-span-2 flex justify-end pb-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" variant="destructive" disabled={isSubmitting || items.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Registrar Saída
          </Button>
        </div>
      </form>
    </div>
  );
}
