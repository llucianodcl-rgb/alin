/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { NotificationProvider } from './contexts/NotificationContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { AnimatePresence, motion } from 'motion/react';
import { useIsMobile } from './hooks/useIsMobile';
import Dashboard from './pages/Dashboard';
import MobileHome from './pages/MobileHome';
import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import Categories from './pages/Categories';
import SuppliersList from './pages/SuppliersList';
import SupplierForm from './pages/SupplierForm';
import SupplierDetails from './pages/SupplierDetails';
import EntryForm from './pages/EntryForm';
import ExitForm from './pages/ExitForm';
import HistoryPage from './pages/HistoryPage';
import Settings from './pages/Settings';
import EmployeesList from './pages/EmployeesList';
import EmployeeForm from './pages/EmployeeForm';
import FinanceDashboard from './pages/FinanceDashboard';
import AlmoxarifadoDashboard from './pages/AlmoxarifadoDashboard';
import RhDashboard from './pages/RhDashboard';
import ExpensesList from './pages/ExpensesList';
import ExpenseForm from './pages/ExpenseForm';
import RevenuesList from './pages/RevenuesList';
import CashFlow from './pages/CashFlow';
import SimplifiedDre from './pages/SimplifiedDre';
import InsightsHistory from './pages/InsightsHistory';
import Admin from './pages/Admin';
import { InventoryList } from './pages/InventoryList';
import { InventoryCreate } from './pages/InventoryCreate';
import { InventoryCount } from './pages/InventoryCount';
import { InventoryDetail } from './pages/InventoryDetail';
import { AuditList } from './pages/AuditList';
import LocationList from './pages/LocationList';
import ImportCenter from './pages/imports/ImportCenter';
import SalesImport from './pages/imports/SalesImport';
import ImportHistory from './pages/imports/ImportHistory';
import ImportLayoutConfig from './pages/imports/ImportLayoutConfig';
import QuickInquiry from './pages/QuickInquiry';
import LabelPrint from './pages/LabelPrint';

function HomeRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHome /> : <Dashboard />;
}

function AnimatedRoutes() {
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: isMobile ? 20 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isMobile ? -20 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<HomeRouter />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/historico-insights" element={<InsightsHistory />} />
          
          {/* Financeiro */}
          <Route path="/financeiro" element={<FinanceDashboard />} />
          <Route path="/financeiro/despesas" element={<ExpensesList />} />
          <Route path="/financeiro/despesas/nova" element={<ExpenseForm />} />
          <Route path="/financeiro/despesas/:id" element={<ExpenseForm />} />
          <Route path="/financeiro/receitas" element={<RevenuesList />} />
          <Route path="/financeiro/fluxo-caixa" element={<CashFlow />} />
          <Route path="/financeiro/dre" element={<SimplifiedDre />} />
          
          {/* Almoxarifado */}
          <Route path="/almoxarifado" element={<AlmoxarifadoDashboard />} />
          <Route path="/almoxarifado/mapa" element={<LocationList />} />
          <Route path="/almoxarifado/importacoes" element={<ImportCenter />} />
          <Route path="/almoxarifado/importacoes/vendas" element={<SalesImport />} />
          <Route path="/almoxarifado/importacoes/historico" element={<ImportHistory />} />
          <Route path="/almoxarifado/importacoes/configuracao" element={<ImportLayoutConfig />} />
          <Route path="/almoxarifado/consulta" element={<QuickInquiry />} />
          <Route path="/almoxarifado/etiquetas" element={<LabelPrint />} />
          <Route path="/almoxarifado/inventario" element={<InventoryList />} />
          <Route path="/almoxarifado/inventario/novo" element={<InventoryCreate />} />
          <Route path="/almoxarifado/inventario/:id/contagem" element={<InventoryCount />} />
          <Route path="/almoxarifado/inventario/:id" element={<InventoryDetail />} />
          <Route path="/produtos" element={<ProductsList />} />
          <Route path="/produtos/novo" element={<ProductForm />} />
          <Route path="/produtos/:id" element={<ProductForm />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/fornecedores" element={<SuppliersList />} />
          <Route path="/fornecedores/novo" element={<SupplierForm />} />
          <Route path="/fornecedores/:id" element={<SupplierDetails />} />
          <Route path="/fornecedores/:id/editar" element={<SupplierForm />} />
          <Route path="/entradas" element={<EntryForm />} />
          <Route path="/saidas" element={<ExitForm />} />
          <Route path="/historico" element={<HistoryPage />} />
          
          {/* RH */}
          <Route path="/rh" element={<RhDashboard />} />
          <Route path="/funcionarios" element={<EmployeesList />} />
          <Route path="/funcionarios/novo" element={<EmployeeForm />} />
          <Route path="/funcionarios/:id" element={<EmployeeForm />} />
          
          {/* Configs */}
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/auditoria" element={<AuthGuard requireAdmin><AuditList /></AuthGuard>} />
          
          <Route path="/admin" element={<AuthGuard requireAdmin><Admin /></AuthGuard>} />
          <Route path="*" element={<div className="p-8 text-center text-slate-500">Página em desenvolvimento...</div>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('alin_theme') || 'auto';
    const applyTheme = (theme: string) => {
      const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme(savedTheme);

    // If 'auto' is selected, watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem('alin_theme') || 'auto';
      if (currentTheme === 'auto') {
        applyTheme('auto');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Scale setup
    const savedScale = localStorage.getItem('alin_scale') || '100';
    document.documentElement.style.fontSize = `${savedScale}%`;

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <NavigationProvider>
            <AuthGuard>
              <AppLayout>
                <AnimatedRoutes />
              </AppLayout>
            </AuthGuard>
          </NavigationProvider>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
