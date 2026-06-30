import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { inventoryRepository } from '../db/repository';
import { Inventory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';
import { auditService } from '../services/AuditService';

export function InventoryCreate() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    type: 'FULL' as 'FULL' | 'PARTIAL',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      const newInventoryId = await inventoryRepository.add({
        name: formData.name,
        notes: formData.notes,
        type: formData.type,
        responsibleId: profile.uid,
        responsibleName: profile.displayName || profile.email || 'Usuário',
        startDate: new Date().toISOString(),
        status: 'PENDING',
        totalSystemQty: 0,
        totalPhysicalQty: 0,
        totalDifference: 0,
        totalFinancialDifference: 0,
        items: [],
        createdBy: profile.uid,
      } as any);
      
      await auditService.log({
        userId: profile.uid,
        userName: profile.displayName || profile.email || 'Usuário',
        module: 'ALMOXARIFADO',
        action: 'CREATE',
        targetId: newInventoryId,
        targetName: `Inventário: ${formData.name}`,
        details: 'Iniciou um novo inventário'
      });

      navigate(`/app/almoxarifado/inventario/${newInventoryId}/contagem`);
    } catch (error) {
      console.error('Failed to create inventory', error);
      alert('Erro ao criar inventário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/app/almoxarifado/inventario')}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Novo Inventário</h1>
          <p className="text-sm text-slate-500">Inicie uma nova contagem de estoque.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome do Inventário *
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Inventário Mensal - Julho/2026"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de Inventário
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="FULL">Geral (Todos os produtos)</option>
              <option value="PARTIAL">Parcial (Selecionar categorias - Em breve)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Detalhes ou observações sobre esta contagem..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/almoxarifado/inventario')}
            className="px-6 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ClipboardList className="w-5 h-5" />
                Iniciar Contagem
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
