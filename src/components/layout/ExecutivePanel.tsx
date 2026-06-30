import React from 'react';
import { useExecutiveInsights, CompanyHealth } from '../../hooks/useExecutiveInsights';
import { Card, CardContent } from '../ui/Card';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Activity,
  ChevronRight,
  Heart
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';

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

const getHealthStyles = (health: CompanyHealth) => {
  switch (health) {
    case 'EXCELENTE': return { label: 'Excelente', color: 'text-emerald-700', bg: 'bg-emerald-100' };
    case 'MUITO_BOA': return { label: 'Muito Boa', color: 'text-blue-700', bg: 'bg-blue-100' };
    case 'BOA': return { label: 'Boa', color: 'text-yellow-700', bg: 'bg-yellow-100' };
    case 'ATENCAO': return { label: 'Atenção', color: 'text-orange-700', bg: 'bg-orange-100' };
    case 'CRITICA': return { label: 'Crítica', color: 'text-red-700', bg: 'bg-red-100' };
    default: return { label: 'Desconhecida', color: 'text-slate-700', bg: 'bg-slate-100' };
  }
};

export function ExecutivePanel() {
  const { insights, health, summary, loading } = useExecutiveInsights();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-40 bg-slate-100 rounded-xl"></CardContent>
      </Card>
    );
  }

  const healthStyle = getHealthStyles(health);

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Olá, Gestor!</h1>
        <p className="text-slate-500 mt-1">Segue um resumo inteligente da situação da sua empresa hoje.</p>
      </div>

      {/* Resumo Inteligente */}
      <Card className="border-2 border-slate-900 shadow-md bg-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <TrendingUp className="w-48 h-48" />
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Resumo Inteligente
            </h2>
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full font-bold", healthStyle.bg, healthStyle.color)}>
              <Heart className="w-5 h-5" />
              Saúde da Empresa: {healthStyle.label}
            </div>
          </div>
          
          <div className="text-lg text-slate-700 leading-relaxed max-w-4xl font-medium">
            {summary.split('. ').map((sentence, i) => (
              <span key={`${i}-${sentence.substring(0, 20)}`} className="block mb-2">{sentence}{sentence && !sentence.endsWith('.') ? '.' : ''}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights / Consultor */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Recomendações e Alertas</h3>
          <Link to="/historico-insights" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center">
            Ver Histórico Completo <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.slice(0, 6).map((insight, index) => {
            const style = getSeverityStyles(insight.severity);
            const Icon = style.icon;
            
            return (
              <Card key={insight.id || index} className={cn("border transition-shadow hover:shadow-md", style.bg, style.border)}>
                <CardContent className="p-5 flex gap-4">
                  <div className={cn("mt-1 shrink-0", style.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={cn("font-bold text-base mb-1", style.color)}>{insight.title}</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{insight.message}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {insights.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Sua empresa não possui alertas no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
