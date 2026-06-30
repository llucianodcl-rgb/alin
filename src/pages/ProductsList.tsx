import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { productRepository } from '../db/repository';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Package, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Product } from '../types';
import { cn } from '../utils/cn';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

import { auditService } from '../services/AuditService';

export default function ProductsList() {
  const [searchTerm, setSearchTerm] = useListState('searchTerm', '');
  const [page, setPage] = useState(0);
  const itemsPerPage = 20;

  useScrollPreservation();
  const { confirm, showUndo } = useNotification();
  const { isReadOnly, profile } = useAuth();
  
  const productsCount = useLiveQuery(
    () => searchTerm 
      ? db.products
          .filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.barcode?.includes(searchTerm) ||
            p.internalCode?.includes(searchTerm)
          ).count()
      : db.products.count(),
    [searchTerm]
  );

  const products = useLiveQuery(
    async () => {
      const collection = db.products.orderBy('name');
      
      if (searchTerm) {
        const filtered = collection.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.barcode?.includes(searchTerm) ||
          p.internalCode?.includes(searchTerm)
        );
        return filtered.offset(page * itemsPerPage).limit(itemsPerPage).toArray();
      }

      return collection.offset(page * itemsPerPage).limit(itemsPerPage).toArray();
    },
    [searchTerm, page]
  );

  const totalPages = Math.ceil((productsCount || 0) / itemsPerPage);

  const handleDelete = (product: Product) => {
    confirm({
      title: 'Excluir produto',
      message: `Tem certeza de que deseja excluir "${product.name}"? Esta ação poderá ser desfeita durante os próximos 5 segundos.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        if (product.id) {
          await productRepository.delete(product.id, {
            totalProducts: -1,
            totalStockValue: -(product.currentStock || 0) * (product.unitCost || 0)
          });
          
          if (profile) {
            await auditService.log({
              userId: profile.uid,
              userName: profile.displayName || profile.email || 'Usuário',
              module: 'ALMOXARIFADO',
              action: 'DELETE',
              targetId: product.id,
              targetName: product.name,
              oldValue: product,
              details: 'Produto excluído.'
            } as any);
          }
        }
        
        showUndo({
          message: 'Produto excluído com sucesso.',
          onUndo: async () => {
            await productRepository.add(product as any, {
              totalProducts: 1,
              totalStockValue: (product.currentStock || 0) * (product.unitCost || 0)
            });
          }
        });
      }
    });
  };

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

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
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4">Mínimo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-slate-300 mb-3" />
                      <p>Nenhum produto encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products?.map((product) => (
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
                    <td className="px-6 py-4">
                      {product.locationPath ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg inline-flex">
                          {product.locationPath}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sem local</span>
                      )}
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
        
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Mostrando <span className="font-bold">{page * itemsPerPage + 1}</span> a <span className="font-bold">{Math.min((page + 1) * itemsPerPage, productsCount || 0)}</span> de <span className="font-bold">{productsCount}</span> produtos
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
