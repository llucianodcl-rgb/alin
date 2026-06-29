import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowDownToLine, Save, Plus, Trash2, Camera } from 'lucide-react';
import { Product } from '../types';
import { ScannerDialog } from '../components/scanner/ScannerDialog';
import { maskCurrency, parseCurrency } from '../utils/masks';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { auditService } from '../services/AuditService';

type EntryItem = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  batch: string;
  expirationDate: string;
};

export default function EntryForm() {
  const navigate = useNavigate();
  const { confirm, showUndo } = useNotification();
  const { profile } = useAuth();
  
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<EntryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const addItemFromScan = (product: Product) => {
    // Check if product already in items
    const existingIndex = items.findIndex(i => i.productId === product.id);
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        { 
          id: generateId(), 
          productId: product.id!, 
          quantity: 1, 
          unitCost: product.unitCost || 0, 
          batch: product.batch || '', 
          expirationDate: product.expirationDate || '' 
        }
      ]);
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: generateId(), productId: '', quantity: 1, unitCost: 0, batch: '', expirationDate: '' }
    ]);
  };

  const updateItem = (id: string, field: keyof EntryItem, value: any) => {
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
      title: 'Salvar entrada',
      message: 'Deseja confirmar a entrada destas mercadorias no estoque?',
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const eventIds: string[] = [];
          const oldStockStates: { id: string, stock: number, cost?: number, batch?: string, exp?: string }[] = [];

          await db.transaction('rw', db.products, db.stockEvents, async () => {
            for (const item of items) {
              const product = await db.products.get(item.productId);
              if (product) {
                // Store old state for undo
                oldStockStates.push({
                  id: product.id!,
                  stock: product.currentStock,
                  cost: product.unitCost,
                  batch: product.batch,
                  exp: product.expirationDate
                });

                // Update product stock
                const newStock = (product.currentStock || 0) + item.quantity;
                const unitCost = typeof item.unitCost === 'string' ? parseCurrency(item.unitCost) : item.unitCost;
                
                await db.products.update(product.id!, { 
                  currentStock: newStock,
                  unitCost: unitCost > 0 ? unitCost : product.unitCost,
                  batch: item.batch || product.batch,
                  expirationDate: item.expirationDate || product.expirationDate
                });

                // Create stock event
                const eventId = generateId();
                eventIds.push(eventId);
                await db.stockEvents.add({
                  id: eventId,
                  productId: item.productId,
                  type: 'ENTRADA',
                  quantity: item.quantity,
                  date,
                  supplierId,
                  invoiceNumber,
                  unitCost: unitCost,
                  batch: item.batch,
                  expirationDate: item.expirationDate,
                  notes
                });

                // Generate Expense if cost > 0
                if (unitCost > 0) {
                  const totalCost = unitCost * item.quantity;
                  await db.expenses.add({
                    id: generateId(),
                    description: `Compra de Mercadoria - ${product.name} (Qtd: ${item.quantity})`,
                    amount: totalCost,
                    dueDate: date, // By default due today, user can edit in financial module
                    supplierId: supplierId || undefined,
                    status: 'PENDING',
                    isRecurring: false,
                    recurrencePeriod: 'NONE',
                    referenceId: eventId,
                    createdAt: new Date().toISOString()
                  });
                }
                
                if (profile) {
                  await auditService.log({
                    userId: profile.uid,
                    userName: profile.displayName || profile.email || 'Usuário',
                    module: 'ALMOXARIFADO',
                    action: 'CREATE',
                    targetId: eventId,
                    targetName: `Entrada: ${product.name}`,
                    quantityChanged: item.quantity,
                    details: `Qtd: ${item.quantity}`
                  });
                }
              }
            }
          });

          showUndo({
            message: 'Entrada registrada com sucesso.',
            onUndo: async () => {
              await db.transaction('rw', db.products, db.stockEvents, async () => {
                // Delete events
                for (const eid of eventIds) {
                  await db.stockEvents.delete(eid);
                }
                // Restore stock states
                for (const state of oldStockStates) {
                  await db.products.update(state.id, {
                    currentStock: state.stock,
                    unitCost: state.cost,
                    batch: state.batch,
                    expirationDate: state.exp
                  });
                }
              });
            }
          });
          navigate('/almoxarifado', { replace: true });
        } catch (error) {
          console.error('Error saving entry:', error);
          alert('Erro ao registrar entrada.');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <ArrowDownToLine className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Entrada de Mercadorias</h1>
          <p className="text-sm text-slate-500">Registre novas entradas via Nota Fiscal ou avulso.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Dados da Entrada</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supplierId">Fornecedor</Label>
                <Select id="supplierId" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">Selecione o Fornecedor...</option>
                  {suppliers?.map(s => (
                    <option key={s.id} value={s.id!}>{s.companyName}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Nº da NF</Label>
                <Input id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="000.000.000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-semibold text-slate-900">Itens</h2>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsScannerOpen(true)} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                  <Camera className="w-4 h-4 mr-2" />
                  Escanear Produto
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
              mode="ENTRY"
            />

            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum item adicionado. Clique no botão acima para começar.
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="space-y-2 md:col-span-4">
                      <Label>Produto *</Label>
                      <Select 
                        value={item.productId} 
                        onChange={e => {
                          const pId = e.target.value;
                          const prod = products?.find(p => p.id === pId);
                          updateItem(item.id, 'productId', pId);
                          if (prod) updateItem(item.id, 'unitCost', prod.unitCost || 0);
                        }}
                        required
                      >
                        <option value="">Selecione...</option>
                        {products?.map(p => (
                          <option key={p.id} value={p.id!}>{p.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Quantidade *</Label>
                      <Input type="number" step="any" min="0.01" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Custo Unit. (R$)</Label>
                      <Input 
                        value={typeof item.unitCost === 'number' ? maskCurrency(item.unitCost.toFixed(2).replace('.', '')) : item.unitCost} 
                        onChange={e => {
                          const masked = maskCurrency(e.target.value);
                          updateItem(item.id, 'unitCost', masked);
                        }} 
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Validade</Label>
                      <Input type="date" value={item.expirationDate} onChange={e => updateItem(item.id, 'expirationDate', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 flex justify-end pb-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isSubmitting || items.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Registrar Entrada
          </Button>
        </div>
      </form>
    </div>
  );
}
