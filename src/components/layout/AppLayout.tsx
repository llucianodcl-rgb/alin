import React, { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Truck, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  History, 
  Settings,
  ArrowLeft,
  Bell,
  Wallet,
  Users,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Briefcase,
  Plus
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigation } from '../../contexts/NavigationContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Shield, LogOut } from 'lucide-react';

const navigation = [
  { 
    name: 'Dashboard Geral', 
    href: '/', 
    icon: LayoutDashboard,
    type: 'link'
  },
  {
    name: 'Almoxarifado',
    icon: Package,
    type: 'group',
    paths: ['/almoxarifado', '/produtos', '/categorias', '/fornecedores', '/entradas', '/saidas', '/historico'],
    children: [
      { name: 'Dashboard', href: '/almoxarifado' },
      { name: 'Produtos', href: '/produtos' },
      { name: 'Categorias', href: '/categorias' },
      { name: 'Fornecedores', href: '/fornecedores' },
      { name: 'Entradas (NF)', href: '/entradas' },
      { name: 'Saídas', href: '/saidas' },
      { name: 'Histórico', href: '/historico' },
    ]
  },
  {
    name: 'Financeiro',
    icon: Wallet,
    type: 'group',
    paths: ['/financeiro'],
    children: [
      { name: 'Dashboard', href: '/financeiro' },
      { name: 'Receitas', href: '/financeiro/receitas' },
      { name: 'Despesas', href: '/financeiro/despesas' },
      { name: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa' },
      { name: 'DRE', href: '/financeiro/dre' },
    ]
  },
  {
    name: 'RH',
    icon: Users,
    type: 'group',
    paths: ['/rh', '/funcionarios'],
    children: [
      { name: 'Dashboard', href: '/rh' },
      { name: 'Funcionários', href: '/funcionarios' },
    ]
  },
  { 
    name: 'Configurações', 
    href: '/configuracoes', 
    icon: Settings,
    type: 'link'
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isDirty, goBack, setIsDirty, navigateWithDirtyCheck } = useNavigation();
  const { showUnsavedChanges } = useNotification();
  const { profile, logout } = useAuth();
  const isHome = location.pathname === '/';
  
  const logoSetting = useLiveQuery(() => db.table('settings').get('appLogo'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await db.table('settings').put({ id: 'appLogo', value: base64String });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleNavigation = (to: string) => {
    navigateWithDirtyCheck(to);
  };

  const handleBack = () => {
    goBack();
  };
  
  // Initialize open groups based on current location
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const initialGroups: string[] = [];
    navigation.forEach(item => {
      if (item.type === 'group' && item.paths?.some(p => location.pathname.startsWith(p))) {
        initialGroups.push(item.name);
      }
    });
    return initialGroups;
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  // Determine current active section for dynamic header title
  const getSectionTitle = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'Dashboard Geral';
    if (location.pathname === '/historico-insights') return 'Dashboard Geral — Histórico de Insights';
    if (location.pathname.startsWith('/financeiro')) return '💰 Financeiro — Acompanhe receitas, despesas e fluxo de caixa.';
    if (location.pathname.startsWith('/rh') || location.pathname.startsWith('/funcionarios')) return '👥 RH — Gerencie colaboradores e folha salarial.';
    if (location.pathname.startsWith('/configuracoes')) return '⚙ Configurações — Ajuste o sistema.';
    // Fallback Almoxarifado
    return '📦 Almoxarifado — Gerencie produtos, estoque e movimentações.';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoChange}
            accept="image/*"
            className="hidden"
          />
          <button 
            onClick={handleLogoClick}
            className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200 overflow-hidden group relative"
          >
            {logoSetting?.value ? (
              <img src={logoSetting.value} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
          </button>
          <span className="text-xl font-bold tracking-tight text-slate-800">ALIN</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (item.type === 'link') {
              const isActive = location.pathname === item.href || (item.href === '/' && location.pathname === '/dashboard');
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href!)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                    isActive 
                      ? "bg-slate-900 text-white shadow-md shadow-slate-200/50" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-slate-200" : "text-slate-400")} />
                  {item.name}
                </button>
              )
            }

            if (item.type === 'group') {
              const isOpen = openGroups.includes(item.name);
              const hasActiveChild = item.paths?.some(p => location.pathname.startsWith(p));
              
              // Color Identity
              const getColorClasses = (name: string, active: boolean) => {
                if (!active) return "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
                switch(name) {
                  case 'Almoxarifado': return "bg-blue-600 text-white shadow-md shadow-blue-200/50";
                  case 'Financeiro': return "bg-emerald-600 text-white shadow-md shadow-emerald-200/50";
                  case 'RH': return "bg-indigo-600 text-white shadow-md shadow-indigo-200/50";
                  default: return "bg-slate-900 text-white";
                }
              };
              
              const getIconColor = (name: string, active: boolean) => {
                if (!active) return "text-slate-400";
                switch(name) {
                  case 'Almoxarifado': return "text-blue-200";
                  case 'Financeiro': return "text-emerald-200";
                  case 'RH': return "text-indigo-200";
                  default: return "text-slate-200";
                }
              };

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium",
                      getColorClasses(item.name, hasActiveChild)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5 flex-shrink-0", getIconColor(item.name, hasActiveChild))} />
                      {item.name}
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  
                  {isOpen && (
                    <div className="pl-11 pr-2 py-1 space-y-1">
                      {item.children?.map(child => {
                        const isChildActive = location.pathname === child.href;
                        return (
                          <button
                            key={child.name}
                            onClick={() => handleNavigation(child.href)}
                            className={cn(
                              "block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors font-medium",
                              isChildActive 
                                ? "text-slate-900 bg-slate-100" 
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                          >
                            {child.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              );
            }
          })}
          
          {profile?.role === 'admin' && (
            <button
              onClick={() => handleNavigation('/admin')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                location.pathname === '/admin'
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200/50" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Shield className={cn("w-5 h-5 flex-shrink-0", location.pathname === '/admin' ? "text-blue-200" : "text-slate-400")} />
              Administração
            </button>
          )}
        </nav>

        {/* User Profile / Logout - Desktop Sidebar Bottom */}
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border border-slate-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{profile?.displayName}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{profile?.role === 'admin' ? 'Administrador' : 'Leitor'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5" />
            Sair do Sistema
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30">
          <div className="flex items-center">
            {isMobile && !isHome ? (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            ) : null}
            {isMobile && isHome ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleLogoClick}
                  className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-md shadow-slate-200 overflow-hidden"
                >
                  {logoSetting?.value ? (
                    <img src={logoSetting.value} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                </button>
                <span className="text-lg font-bold text-slate-900 tracking-tight">ALIN</span>
              </div>
            ) : (
              <div className="hidden lg:block text-slate-600 font-medium tracking-tight">
                {getSectionTitle()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
            </button>
            <button 
              onClick={logout}
              className="flex items-center gap-2 p-1 pl-1 pr-3 hover:bg-slate-100 rounded-full transition-colors border border-transparent hover:border-slate-200"
            >
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-slate-200"
              />
              <LogOut className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
