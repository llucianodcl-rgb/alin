import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { AuditLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Search, Filter, FileText, Download } from 'lucide-react';

export function AuditList() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('ALL');

  const logs = useLiveQuery(
    async () => {
      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return [];
      const data = await db.auditLogs.orderBy('timestamp').reverse().toArray();
      return data;
    },
    [profile]
  );

  const loading = logs === undefined;

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500">
        <Shield className="w-16 h-16 mb-4 text-slate-300" />
        <h2 className="text-xl font-medium">Acesso Negado</h2>
        <p className="mt-2">Apenas administradores podem acessar a Auditoria.</p>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'ALL' || log.module === filterModule;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auditoria do Sistema</h1>
          <p className="text-sm text-slate-500">Rastreamento completo de todas as operações.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar auditorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white transition-all"
          >
            <option value="ALL">Todos os Módulos</option>
            <option value="ALMOXARIFADO">Almoxarifado</option>
            <option value="FINANCEIRO">Financeiro</option>
            <option value="RH">RH</option>
            <option value="SISTEMA">Sistema</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Shield className="w-12 h-12 text-slate-300 mb-3" />
            <p>Nenhum registro de auditoria encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    log.action === 'CREATE' ? 'bg-green-100 text-green-600' :
                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                    log.action === 'DELETE' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {log.userName} <span className="text-slate-500 font-normal">({log.module})</span>
                    </p>
                    <time className="text-xs text-slate-500 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{log.action}: </span>
                    {log.targetName || log.targetId || 'Sistema'}
                  </p>
                  {log.details && (
                    <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                  )}
                  {log.quantityChanged !== undefined && (
                    <p className="text-xs font-medium text-blue-600 mt-1">
                      Quantidade: {log.quantityChanged > 0 ? '+' : ''}{log.quantityChanged}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
