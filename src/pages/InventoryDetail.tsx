import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, generateId } from '../db/db';
import { Inventory, Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { auditService } from '../services/AuditService';

export function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const invData = await db.inventories.get(id);
        if (invData) {
          setInventory(invData);
          
          const prods = await db.products.toArray();
          const pMap: Record<string, Product> = {};
          prods.forEach(d => {
            pMap[d.id!] = d;
          });
          setProductsMap(pMap);
        }
      } catch (error) {
        console.error('Error loading inventory detail', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleApprove = async () => {
    if (!id || !inventory || !profile) return;
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      alert('Apenas administradores podem aprovar inventários.');
      return;
    }

    if (!confirm('Deseja aprovar este inventário? O estoque será atualizado com as quantidades físicas contadas.')) return;

    setProcessing(true);
    try {
      // 1. Update Inventory status
      await db.inventories.update(id, {
        status: 'APPROVED',
        approvedBy: profile.uid,
        approvedAt: new Date().toISOString()
      });

      // 2. Log in Audit
      await auditService.log({
        userId: profile.uid,
        userName: profile.displayName || profile.email || 'Admin',
        module: 'ALMOXARIFADO',
        action: 'APPROVE',
        targetId: id,
        targetName: `Inventário: ${inventory.name}`,
        details: `Diferença total: ${inventory.totalDifference}. Diferença Financeira: ${inventory.totalFinancialDifference}`
      });

      // 3. Update all products stock and generate events
      for (const item of inventory.items) {
        if (item.difference !== 0) {
          await db.products.update(item.productId, {
            currentStock: item.physicalQty
          });

          await db.stockEvents.add({
            id: generateId(),
            productId: item.productId,
            type: 'INVENTARIO',
            quantity: item.difference, // difference can be positive or negative
            date: new Date().toISOString(),
            userId: profile.uid,
            notes: `Ref: ${inventory.name}. Motivo: ${item.justification} - ${item.notes || ''}`
          });
        }
      }

      alert('Inventário aprovado e estoque atualizado com sucesso!');
      navigate('/app/almoxarifado/inventario');
    } catch (error) {
      console.error('Error approving inventory', error);
      alert('Erro ao aprovar inventário.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!id || !inventory || !profile) return;
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      alert('Apenas administradores podem rejeitar inventários.');
      return;
    }

    if (!confirm('Deseja rejeitar este inventário? Ele não será aplicado ao estoque.')) return;

    setProcessing(true);
    try {
      await db.inventories.update(id, {
        status: 'REJECTED',
        approvedBy: profile.uid,
        approvedAt: new Date().toISOString()
      });

      await auditService.log({
        userId: profile.uid,
        userName: profile.displayName || profile.email || 'Admin',
        module: 'ALMOXARIFADO',
        action: 'REJECT',
        targetId: id,
        targetName: `Inventário: ${inventory.name}`,
        details: 'Inventário rejeitado pelo administrador.'
      });

      alert('Inventário rejeitado.');
      navigate('/app/almoxarifado/inventario');
    } catch (error) {
      console.error('Error rejecting inventory', error);
      alert('Erro ao rejeitar inventário.');
    } finally {
      setProcessing(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-800">{inventory.name}</h1>
            <p className="text-sm text-slate-500">Resumo da contagem e aprovação.</p>
          </div>
        </div>
        
        {inventory.status === 'PENDING' && (profile?.role === 'admin' || profile?.role === 'super_admin') && (
          <div className="flex gap-3">
            <button 
              onClick={handleReject}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              Rejeitar
            </button>
            <button 
              onClick={handleApprove}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              Aprovar e Atualizar Estoque
            </button>
          </div>
        )}
        
        {inventory.status !== 'PENDING' && (
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                <Download className="w-4 h-4" />
                Relatório PDF
             </button>
             <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                inventory.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
             }`}>
                {inventory.status === 'APPROVED' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {inventory.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
             </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Responsável</p>
          <p className="text-lg font-bold text-slate-800">{inventory.responsibleName}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Itens Contados</p>
          <p className="text-lg font-bold text-slate-800">{inventory.items.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Diferença Físico vs Sist.</p>
          <p className={`text-lg font-bold ${inventory.totalDifference === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
            {inventory.totalDifference > 0 ? '+' : ''}{inventory.totalDifference} unidades
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Diferença Financeira</p>
          <p className={`text-lg font-bold ${inventory.totalFinancialDifference < 0 ? 'text-red-600' : inventory.totalFinancialDifference > 0 ? 'text-green-600' : 'text-slate-800'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inventory.totalFinancialDifference || 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Detalhes dos Itens
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-sm font-medium text-slate-600">
                <th className="p-4">Produto</th>
                <th className="p-4 text-center">Qtd. Sistema</th>
                <th className="p-4 text-center">Qtd. Física</th>
                <th className="p-4 text-center">Diferença</th>
                <th className="p-4 text-right">Dif. Financeira</th>
                <th className="p-4">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {inventory.items.map(item => {
                const prodName = productsMap[item.productId]?.name || 'Produto Desconhecido';
                const hasDiff = item.difference !== 0;
                return (
                  <tr key={item.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{prodName}</td>
                    <td className="p-4 text-center text-slate-600">{item.systemQty}</td>
                    <td className="p-4 text-center font-medium text-slate-800">{item.physicalQty}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 font-medium ${
                        !hasDiff ? 'text-green-600' :
                        Math.abs(item.difference) > 10 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {item.difference > 0 ? '+' : ''}{item.difference}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium">
                      <span className={item.financialDiff < 0 ? 'text-red-600' : item.financialDiff > 0 ? 'text-green-600' : 'text-slate-600'}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.financialDiff || 0)}
                      </span>
                    </td>
                    <td className="p-4">
                      {hasDiff ? (
                        <div>
                          <p className="font-medium text-slate-800">{item.justification}</p>
                          {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
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
