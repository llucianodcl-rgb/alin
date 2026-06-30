import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { locationRepository } from '../db/repository';
import { WarehouseLocation, LocationType } from '../types';
import { Map, Plus, Edit2, Trash2, MapPin, ChevronRight, ChevronDown, ZoomIn, ZoomOut, Maximize, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auditService } from '../services/AuditService';
import { ScannerDialog } from '../components/scanner/ScannerDialog';
import { Camera } from 'lucide-react';

const LOCATION_TYPES: Record<LocationType, string> = {
  WAREHOUSE: 'Depósito Principal',
  EXTERNAL: 'Depósito Externo',
  SECTOR: 'Setor',
  RECEIVING: 'Área de Recebimento',
  DISPATCH: 'Área de Expedição',
  COLD_ROOM: 'Câmara Fria',
  FREEZER: 'Freezer',
  AISLE: 'Corredor',
  SHELF: 'Prateleira',
  LEVEL: 'Nível',
  POSITION: 'Posição',
};

export default function LocationList() {
  const { profile } = useAuth();
  const locations = useLiveQuery(() => db.locations.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  
  const [activeTab, setActiveTab] = useState<'tree' | 'map'>('tree');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [formData, setFormData] = useState<Partial<WarehouseLocation>>({
    name: '',
    code: '',
    type: 'AISLE',
    status: 'ACTIVE',
    parentId: ''
  });

  const [zoom, setZoom] = useState(1);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedLocationId, setScannedLocationId] = useState<string | null>(null);

  const handleLocationScan = async (code: string) => {
    const loc = locations.find(l => l.code === code);
    if (loc) {
      setScannedLocationId(loc.id!);
      setActiveTab('tree'); // Switch to tree to show location
      // Logic to highlight or focus would go here
      alert(`Localização encontrada: ${loc.name}. Filtrando produtos...`);
    } else {
      alert('Localização não encontrada.');
    }
  };

  const handleOpenForm = (loc?: WarehouseLocation, parentId?: string) => {
    if (loc) {
      setEditingLocation(loc);
      setFormData(loc);
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        code: '',
        type: parentId ? 'SHELF' : 'AISLE',
        status: 'ACTIVE',
        parentId: parentId || ''
      });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.type) return;

    try {
      if (editingLocation?.id) {
        await locationRepository.update(editingLocation.id, formData as any);
        
        await auditService.log({
          userId: profile!.uid,
          userName: profile!.displayName || profile!.email || 'Usuário',
          module: 'ALMOXARIFADO',
          action: 'UPDATE',
          targetId: editingLocation.id,
          targetName: formData.name!,
          details: 'Localização atualizada.'
        });
      } else {
        const newId = await locationRepository.add(formData as any);
        
        await auditService.log({
          userId: profile!.uid,
          userName: profile!.displayName || profile!.email || 'Usuário',
          module: 'ALMOXARIFADO',
          action: 'CREATE',
          targetId: newId,
          targetName: formData.name!,
          details: 'Localização criada.'
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving location', error);
      alert('Erro ao salvar localização.');
    }
  };

  const handleDelete = async (loc: WarehouseLocation) => {
    if (confirm(`Tem certeza que deseja excluir a localização ${loc.name}?`)) {
      try {
        await locationRepository.delete(loc.id!);
        await auditService.log({
          userId: profile!.uid,
          userName: profile!.displayName || profile!.email || 'Usuário',
          module: 'ALMOXARIFADO',
          action: 'DELETE',
          targetId: loc.id,
          targetName: loc.name,
          details: 'Localização excluída.'
        });
      } catch (error) {
        console.error('Error deleting location', error);
        alert('Erro ao excluir localização.');
      }
    }
  };

  const LocationNode: React.FC<{ loc: WarehouseLocation, level?: number }> = ({ loc, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2);
    const children = locations.filter(l => l.parentId === loc.id);

    return (
      <div className="w-full">
        <div 
          className={`flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${level === 0 ? 'bg-slate-50/50' : ''}`}
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          <div className="flex items-center gap-3">
            {children.length > 0 ? (
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-slate-200 rounded">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </button>
            ) : (
              <div className="w-6" />
            )}
            
            <MapPin className={`w-5 h-5 ${level === 0 ? 'text-blue-600' : 'text-slate-400'}`} />
            
            <div>
              <p className="font-semibold text-slate-800">{loc.name}</p>
              <p className="text-xs text-slate-500">{LOCATION_TYPES[loc.type]} • Código: {loc.code}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleOpenForm(undefined, loc.id)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
              title="Adicionar Sub-local"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleOpenForm(loc)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleDelete(loc)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {isExpanded && children.length > 0 && (
          <div className="flex flex-col">
            {children.map(child => (
              <LocationNode key={child.id} loc={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const [heatmapMode, setHeatmapMode] = useState(false);

  const VisualMap = () => {
    const rootLocations = locations.filter(l => !l.parentId);
    const stockEvents = useLiveQuery(() => db.stockEvents.toArray(), []) || [];
    
    // Função auxiliar para ver se há produtos em um nó ou seus filhos
    const getProductCountInLocation = (locId: string): number => {
      let count = products.filter(p => p.locationId === locId).length;
      const children = locations.filter(l => l.parentId === locId);
      children.forEach(child => {
        count += getProductCountInLocation(child.id!);
      });
      return count;
    };

    // Calculate Heatmap (Movements)
    const getMovementHeatInLocation = (locId: string): number => {
      let heat = 0;
      const productsInLoc = products.filter(p => p.locationId === locId).map(p => p.id);
      heat += stockEvents.filter(e => productsInLoc.includes(e.productId)).length;

      const children = locations.filter(l => l.parentId === locId);
      children.forEach(child => {
        heat += getMovementHeatInLocation(child.id!);
      });
      return heat;
    };

    const getHeatColor = (heat: number, maxHeat: number) => {
      if (heat === 0) return 'bg-slate-50 border-slate-200';
      const ratio = heat / maxHeat;
      if (ratio > 0.66) return 'bg-red-100 border-red-300 shadow-sm shadow-red-200';
      if (ratio > 0.33) return 'bg-yellow-100 border-yellow-300 shadow-sm shadow-yellow-200';
      return 'bg-green-100 border-green-300 shadow-sm shadow-green-200';
    };

    const allHeats = locations.map(l => getMovementHeatInLocation(l.id!));
    const maxHeat = Math.max(...allHeats, 1);

    return (
      <div className="relative w-full h-[600px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={() => setHeatmapMode(!heatmapMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border shadow-sm transition-colors ${
              heatmapMode ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            {heatmapMode ? 'Mapa de Calor Ativo' : 'Ativar Mapa de Calor'}
          </button>
        </div>

        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white p-1 rounded-xl shadow-md border border-slate-100">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={() => setZoom(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <Maximize className="w-5 h-5" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 no-scrollbar" ref={mapContainerRef}>
          <div 
            className="flex gap-8 items-start min-w-max transition-transform origin-top-left pt-12"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* ENTRADA Fictícia */}
            <div className="flex flex-col items-center justify-center w-32 h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-100/50">
              <p className="font-bold text-slate-400 rotate-[-90deg] uppercase tracking-widest">Entrada</p>
            </div>

            {rootLocations.map(root => {
              const children = locations.filter(l => l.parentId === root.id);
              const totalProds = getProductCountInLocation(root.id!);
              const heat = getMovementHeatInLocation(root.id!);
              
              return (
                <div key={root.id} className={`flex flex-col gap-4 p-6 rounded-2xl border-2 shadow-sm min-w-[200px] transition-colors ${heatmapMode ? getHeatColor(heat, maxHeat) : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2">
                    <h3 className="font-bold text-slate-800 text-lg">{root.name}</h3>
                    {heatmapMode ? (
                      <span className="px-2 py-0.5 bg-black/5 text-slate-700 text-xs font-bold rounded-full">
                        {heat} mov.
                      </span>
                    ) : totalProds > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {totalProds} itens
                      </span>
                    )}
                  </div>
                  
                  {children.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {children.map(child => {
                        const childProds = getProductCountInLocation(child.id!);
                        const childHeat = getMovementHeatInLocation(child.id!);
                        
                        return (
                          <div key={child.id} className={`p-3 rounded-xl flex items-center justify-between group transition-colors border ${heatmapMode ? getHeatColor(childHeat, maxHeat) : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}>
                            <span className="font-medium text-slate-700 text-sm">{child.name}</span>
                            {heatmapMode ? (
                               <div className="text-xs font-bold text-slate-600 bg-white/50 px-1.5 py-0.5 rounded">
                                 {childHeat}
                               </div>
                            ) : childProds > 0 && (
                              <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                {childProds}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center border border-dashed border-black/10 rounded-xl">
                      <p className="text-xs text-slate-400">Vazio</p>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* EXPEDIÇÃO Fictícia */}
            <div className="flex flex-col items-center justify-center w-32 h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-100/50">
              <p className="font-bold text-slate-400 rotate-[-90deg] uppercase tracking-widest">Expedição</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-t border-slate-200 p-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
          {!heatmapMode ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-slate-200 rounded"></div>
                <span>Área Vazia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Contém Produtos</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 border-2 border-green-300 rounded"></div>
                <span>Baixa Movimentação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-300 rounded"></div>
                <span>Média Movimentação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 border-2 border-red-300 rounded"></div>
                <span>Alta Movimentação</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const rootLocations = locations.filter(l => !l.parentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Map className="w-6 h-6 text-blue-600" />
            Mapa Inteligente do Depósito
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure e gerencie a estrutura física do seu almoxarifado.
          </p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Local
        </button>
        <button 
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <Camera className="w-4 h-4" />
          Escanear Local
        </button>

        <ScannerDialog 
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSelect={(item) => handleLocationScan(typeof item === 'string' ? item : item.barcode || '')}
          mode="GENERAL"
        />
      </div>
      
      <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'tree' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Estrutura em Árvore
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Map className="w-4 h-4" />
          Mapa Visual
        </button>
      </div>

      {activeTab === 'tree' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {rootLocations.length > 0 ? (
            <div className="flex flex-col">
              {rootLocations.map(loc => (
                <LocationNode key={loc.id} loc={loc} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Map className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum local cadastrado</h3>
              <p className="text-slate-500 mb-4">Comece adicionando corredores, prateleiras ou setores ao seu depósito.</p>
              <button 
                onClick={() => handleOpenForm()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar Local Raiz
              </button>
            </div>
          )}
        </div>
      ) : (
        <VisualMap />
      )}

      {/* Modal de Formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingLocation ? 'Editar Localização' : 'Nova Localização'}
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formData.parentId && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Local Pai:</p>
                  <p className="text-sm font-medium text-slate-800">
                    {locations.find(l => l.id === formData.parentId)?.name || 'Desconhecido'}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Corredor A"
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all uppercase"
                    placeholder="Ex: COR-A"
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    required
                    value={formData.type || 'AISLE'}
                    onChange={e => setFormData({...formData, type: e.target.value as LocationType})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  >
                    {Object.entries(LOCATION_TYPES).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Observações</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Detalhes adicionais (opcional)"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Salvar Localização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
