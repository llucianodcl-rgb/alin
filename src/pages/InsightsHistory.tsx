import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Activity,
  Calendar as CalendarIcon,
  Search
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/Button';

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    case 'IMPORTANT':
      return { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'WARNING':
      return { icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    case 'INFO':
    default:
      return { icon: Info, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }
};

import { useNotification } from '../contexts/NotificationContext';
import { useListState, useScrollPreservation } from '../hooks/useListState';

export default function InsightsHistory() {
  const [filterPeriod, setFilterPeriod] = useListState<'TODAY' | '7_DAYS' | '30_DAYS' | '12_MONTHS'>('filterPeriod', '7_DAYS');
  useScrollPreservation();
  
  const allInsights = useLiveQuery(() => db.insights.reverse().sortBy('date'), []);

  const getFilteredInsights = () => {
    if (!allInsights) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allInsights.filter(insight => {
      const insightDate = new Date(insight.date);
      const diffTime = Math.abs(today.getTime() - insightDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (filterPeriod) {
        case 'TODAY': return diffDays === 0;
        case '7_DAYS': return diffDays <= 7;
        case '30_DAYS': return diffDays <= 30;
        case '12_MONTHS': return diffDays <= 365;
        default: return true;
      }
    });
  };

  const filteredInsights = getFilteredInsights();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Histórico de Insights</h1>
          <p className="text-slate-500 mt-1">Consulte as recomendações e alertas anteriores do consultor.</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50 rounded-t-xl">
          <div className="flex gap-2 w-full overflow-x-auto pb-2 sm:pb-0">
            {[
              { id: 'TODAY', label: 'Hoje' },
              { id: '7_DAYS', label: 'Últimos 7 dias' },
              { id: '30_DAYS', label: 'Últimos 30 dias' },
              { id: '12_MONTHS', label: 'Últimos 12 meses' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterPeriod(filter.id as any)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                  filterPeriod === filter.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200 bg-white border border-slate-200"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {!filteredInsights.length ? (
            <div className="p-12 text-center text-slate-500">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p>Nenhum insight encontrado para este período.</p>
            </div>
          ) : (
            filteredInsights.map(insight => {
              const style = getSeverityStyles(insight.severity);
              const Icon = style.icon;

              return (
                <div key={insight.id} className="p-6 hover:bg-slate-50 transition-colors flex gap-4">
                  <div className={cn("mt-1 shrink-0 p-3 rounded-xl", style.bg, style.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-slate-900">{insight.title}</h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {formatDate(insight.date)}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{insight.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
