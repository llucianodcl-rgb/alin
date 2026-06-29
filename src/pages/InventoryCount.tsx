import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { Inventory, Product, InventoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Search, ScanLine, AlertCircle, CheckCircle2, Map, Camera } from 'lucide-react';
import { ScannerDialog } from '../components/scanner/ScannerDialog';
import { useNotification } from '../contexts/NotificationContext';

export function InventoryCount() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [countedItems, setCountedItems] = useState<Record<string, InventoryItem>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [smartSort, setSmartSort] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const onProductScan = (product: Product) => {
    // Scroll to product and focus quantity field (simulated by setting search term or highlighting)
    setSearchTerm(product.barcode || product.internalCode || product.name);
    
    // Auto-increment if already counted, or set to 1
    const current = countedItems[product.id!];
    const newQty = (current?.physicalQty || 0) + 1;
    handleQuantityChange(product, newQty.toString());
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        // Load inventory
        const invData = await db.inventories.get(id);
        if (invData) {
          setInventory(invData);
          
          // Pre-fill counted items if any exist
          const existingCounts: Record<string, InventoryItem> = {};
          invData.items?.forEach(item => {
            existingCounts[item.productId] = item;
          });
          setCountedItems(existingCounts);
        }

        // Load products
        const prods = await db.products.toArray();
        setProducts(prods);
        
      } catch (error) {
        console.error('Error loading inventory data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleQuantityChange = (product: Product, value: string) => {
    const physicalQty = parseFloat(value);
    if (isNaN(physicalQty)) return;
    
    const systemQty = product.currentStock || 0;
    const difference = physicalQty - systemQty;
    const financialDiff = difference * (product.unitCost || 0);

    setCountedItems(prev => ({
      ...prev,
      [product.id!]: {
        productId: product.id!,
        systemQty,
        physicalQty,
        difference,
        financialDiff,
        // Preserve justification/notes if they already exist
        justification: prev[product.id!]?.justification,
        notes: prev[product.id!]?.notes,
      }
    }));
  };

  const handleJustificationChange = (productId: string, justification: any, notes: string) => {
    setCountedItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        justification,
        notes
      }
    }));
  };

  const handleSaveProgress = async () => {
    if (!id || !inventory) return;
    setSaving(true);
    try {
      const items = Object.values(countedItems) as InventoryItem[];
      await db.inventories.update(id, {
        items
      });
      alert('Progresso salvo com sucesso!');
    } catch (error) {
      console.error('Error saving progress', error);
      alert('Erro ao salvar progresso.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishCount = async () => {
    if (!id || !inventory) return;
    
    // Validate if any item has a difference without justification
    const items = Object.values(countedItems) as InventoryItem[];
    const missingJustification = items.some(item => item.difference !== 0 && !item.justification);
    if (missingJustification) {
      alert('Existem itens com diferença sem justificativa informada. Por favor, preencha as justificativas antes de finalizar.');
      return;
    }

    if (!confirm('Deseja realmente finalizar a contagem? Este inventário será enviado para aprovação do administrador.')) return;

    setSaving(true);
    try {
      let totalSystemQty = 0;
      let totalPhysicalQty = 0;
      let totalDifference = 0;
      let totalFinancialDifference = 0;

      items.forEach(item => {
        totalSystemQty += item.systemQty;
        totalPhysicalQty += item.physicalQty;
        totalDifference += item.difference;
        totalFinancialDifference += item.financialDiff;
      });

      await db.inventories.update(id, {
        items,
        totalSystemQty,
        totalPhysicalQty,
        totalDifference,
        totalFinancialDifference,
        endDate: new Date().toISOString()
      });
      
      navigate(`/app/almoxarifado/inventario/${id}`);
    } catch (error) {
      console.error('Error finishing count', error);
      alert('Erro ao finalizar contagem.');
    } finally {
      setSaving(false);
    }
  };

  let filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm)) ||
    (p.internalCode && p.internalCode.includes(searchTerm))
  );

  if (smartSort) {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      const locA = a.locationPath || 'ZZZZZ'; // Sem local vai pro final
      const locB = b.locationPath || 'ZZZZZ';
      return locA.localeCompare(locB);
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!inventory) {
    return <div className="text-center text-slate-500 py-12">Inventário não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/almoxarifado/inventario')}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Contagem: {inventory.name}</h1>
            <p className="text-sm text-slate-500">Registre a quantidade física encontrada.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSaveProgress}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Salvar Progresso
          </button>
          <button 
            onClick={handleFinishCount}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            Finalizar Contagem
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar produto por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setSmartSort(!smartSort)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
            smartSort 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent'
          }`}
          title="Sugestão de Rota (Agrupa por Localização)"
        >
          <Map className="w-5 h-5" />
          <span className="hidden sm:inline">Rota Inteligente</span>
        </button>
        <button 
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Camera className="w-5 h-5" />
          Ler Código
        </button>

        <ScannerDialog 
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSelect={onProductScan}
          mode="INVENTORY"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-600">
                <th className="p-4 w-12">Foto</th>
                <th className="p-4">Produto</th>
                <th className="p-4 text-center">Qtd. Sistema</th>
                <th className="p-4 text-center w-32">Qtd. Física</th>
                <th className="p-4 text-center">Diferença</th>
                <th className="p-4">Justificativa (Se houver dif.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.map(product => {
                const counted = countedItems[product.id!];
                const hasDiff = counted && counted.difference !== 0;
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {product.photoUrl ? (
                        <img src={product.photoUrl} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-200 rounded-md flex items-center justify-center">
                          <span className="text-slate-400 text-xs">Sem foto</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-500 mb-1">Cód: {product.internalCode || '-'} | EAN: {product.barcode || '-'}</p>
                      {product.locationPath && (
                        <div className="inline-flex items-center gap-1 mt-0.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          <span className="text-[10px] font-bold">{product.locationPath}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center text-slate-600 font-medium">
                      {product.currentStock || 0}
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={counted?.physicalQty ?? ''}
                        onChange={(e) => handleQuantityChange(product, e.target.value)}
                        className="w-24 px-3 py-1.5 border border-slate-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Qtd"
                      />
                    </td>
                    <td className="p-4 text-center">
                      {counted ? (
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          counted.difference === 0 ? 'text-green-600' :
                          Math.abs(counted.difference) > 10 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {counted.difference > 0 ? '+' : ''}{counted.difference}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {hasDiff && (
                        <div className="flex flex-col gap-2">
                          <select
                            value={counted.justification || ''}
                            onChange={(e) => handleJustificationChange(product.id!, e.target.value, counted.notes || '')}
                            className={`w-full px-2 py-1.5 border rounded text-sm outline-none ${!counted.justification ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                          >
                            <option value="">Selecione o motivo...</option>
                            <option value="Quebra">Quebra</option>
                            <option value="Produto vencido">Produto vencido</option>
                            <option value="Perda">Perda</option>
                            <option value="Erro de lançamento">Erro de lançamento</option>
                            <option value="Erro de contagem">Erro de contagem</option>
                            <option value="Avaria">Avaria</option>
                            <option value="Produto furtado ou extraviado">Produto furtado ou extraviado</option>
                            <option value="Outro">Outro</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Observações..."
                            value={counted.notes || ''}
                            onChange={(e) => handleJustificationChange(product.id!, counted.justification, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm outline-none"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
