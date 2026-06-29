import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Wallet,
  Users,
  Settings as SettingsIcon,
  LayoutDashboard,
  Shield,
  Camera,
  Search
} from 'lucide-react';
import { cn } from '../utils/cn';
import { ExecutivePanel } from '../components/layout/ExecutivePanel';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';

const MAIN_MODULES = [
  {
    title: 'Consulta Rápida',
    description: 'Escanear ou buscar produtos',
    icon: Search,
    path: '/almoxarifado/consulta',
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-50',
    arrowClass: 'text-amber-400'
  },
  {
    title: 'Almoxarifado',
    description: 'Gestão de estoque e produtos',
    icon: Package,
    path: '/almoxarifado',
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50',
    arrowClass: 'text-blue-400'
  },
  {
    title: 'Financeiro',
    description: 'Acompanhamento de receitas e despesas',
    icon: Wallet,
    path: '/financeiro',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-50',
    arrowClass: 'text-emerald-400'
  },
  {
    title: 'Recursos Humanos',
    description: 'Gestão da equipe e folha salarial',
    icon: Users,
    path: '/rh',
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-50',
    arrowClass: 'text-indigo-400'
  },
  {
    title: 'Configurações',
    description: 'Ajustes e preferências do sistema',
    icon: SettingsIcon,
    path: '/configuracoes',
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50',
    arrowClass: 'text-slate-400'
  }
];

export default function MobileHome() {
  const { navigateWithDirtyCheck } = useNavigation();
  const { profile } = useAuth();

  const modules = [...MAIN_MODULES];
  if (profile?.role === 'admin') {
    modules.push({
      title: 'Administração',
      description: 'Gerenciamento de usuários e permissões',
      icon: Shield,
      path: '/admin',
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      arrowClass: 'text-blue-500'
    });
  }

  return (
    <div className="pb-8 space-y-6">
      {/* Header Section */}
      <div className="px-4 pt-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Olá, Gestor! <span className="text-2xl animate-wave origin-bottom-right">👋</span>
        </h1>
        <p className="text-slate-500 mt-1">Selecione uma área de gestão abaixo.</p>
      </div>

      {/* Grid of Main Modules */}
      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((module) => (
          <button 
            key={module.path} 
            onClick={() => navigateWithDirtyCheck(module.path)}
            className="w-full text-left bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-50 flex items-center relative overflow-hidden transition-transform active:scale-95 cursor-pointer"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 mr-4", module.bgClass, module.colorClass)}>
              <module.icon className="w-7 h-7" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-bold text-slate-800 text-[17px]">{module.title}</h3>
              <p className="text-sm text-slate-500 mt-0.5 leading-tight">{module.description}</p>
            </div>
            
            <div className={cn("absolute right-4", module.arrowClass)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        <ExecutivePanel />
      </div>
    </div>
  );
}
