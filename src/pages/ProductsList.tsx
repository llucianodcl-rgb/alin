import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Package, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Product } from '../types';
import { cn } from '../utils/cn';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

export default function ProductsList() {
  const [searchTerm, setSearchTerm] = useListState('searchTerm', '');
  useScrollPreservation();
  const { confirm, showUndo } = useNotification();
  const { isReadOnly } = useAuth();
  
  const products = useLiveQuery(
    () => db.products.toArray(),
    []
  );

  const handleDelete = (product: Product) => {
    confirm({
      title: 'Excluir produto',
      message: `Tem certeza de que deseja excluir "${product.name}"? Esta ação poderá ser desfeita durante os próximos 5 segundos.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        // Execute deletion
        await db.products.delete(product.id);
        
        // Show undo snackbar
        showUndo({
          message: 'Produto excluído com sucesso.',
          onUndo: async () => {
            // Restore product
            await db.products.add(product);
          }
        });
      }
    });
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode?.includes(searchTerm) ||
    p.internalCode?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-sm text-slate-500">Gerencie seu catálogo de itens e estoque.</p>
        </div>
        {!isReadOnly && (
          <Link to="/produtos/novo">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </Link>
        )}
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, código ou barras..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="shrink-0">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </Card>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-xs border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Estoque Atual</th>
                <th className="px-6 py-4">Mínimo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-slate-300 mb-3" />
                      <p>Nenhum produto encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts?.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-slate-500 text-xs">{product.brand || 'Sem marca'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.internalCode || product.barcode || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={cn(
                          "font-semibold",
                          product.currentStock <= 0 ? "text-red-600" :
                          product.currentStock <= product.minQuantity ? "text-amber-600" :
                          "text-green-600"
                        )}>
                          {product.currentStock}
                        </span>
                        <span className="text-slate-400 ml-1 text-xs">{product.unitOfMeasure}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.minQuantity}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Link to={`/produtos/${product.id}`}>
                        <Button variant="ghost" size="sm">Editar</Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
