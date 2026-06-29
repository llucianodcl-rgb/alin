import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  AlertCircle,
  Calendar,
  Wallet,
  Search,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '../utils/cn';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNavigation } from '../contexts/NavigationContext';
import { matchText } from '../utils/search';

const MOBILE_MENU = [
  { title: 'Receitas', icon: TrendingUp, path: '/financeiro/receitas', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { title: 'Despesas', icon: CreditCard, path: '/financeiro/despesas', color: 'text-red-500', bg: 'bg-red-50' },
  { title: 'Fluxo de Caixa', icon: Wallet, path: '/financeiro/fluxo-caixa', color: 'text-blue-500', bg: 'bg-blue-50' },
  { title: 'DRE', icon: Calendar, path: '/financeiro/dre', color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

export default function FinanceDashboard() {
  const isMobile = useIsMobile();
  const { navigateWithDirtyCheck } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const revenues = useLiveQuery(() => db.revenues.toArray(), []);
  const employees = useLiveQuery(() => db.employees.where('status').equals('ACTIVE').toArray(), []);
  const expenseCategories = useLiveQuery(() => db.expenseCategories.toArray(), []) || [];

  // Basic calculations (in real-world, we filter by month/year)
  const totalRevenue = revenues?.filter(r => r.status === 'RECEIVED').reduce((acc, r) => acc + r.amount, 0) || 0;
  const totalExpenses = expenses?.filter(e => e.status === 'PAID').reduce((acc, e) => acc + e.amount, 0) || 0;
  
  const pendingExpenses = expenses?.filter(e => e.status === 'PENDING').reduce((acc, e) => acc + e.amount, 0) || 0;
  const overdueExpenses = expenses?.filter(e => e.status === 'OVERDUE').reduce((acc, e) => acc + e.amount, 0) || 0;
  
  const salarySum = employees?.reduce((acc, emp) => acc + emp.salary + (emp.transportAllowance || 0) + (emp.foodAllowance || 0), 0) || 0;

  const grossProfit = totalRevenue - totalExpenses;
  const netProfit = grossProfit - salarySum; // simplified

  // Filter lists based on search
  const filteredExpenses = expenses?.filter(e => {
    const categoryName = expenseCategories.find(c => c.id === e.categoryId)?.name || '';
    return matchText(e.description, searchQuery) ||
      matchText(e.notes, searchQuery) ||
      matchText(categoryName, searchQuery) ||
      matchText(e.paymentMethod, searchQuery) ||
      matchText(e.amount?.toString(), searchQuery) ||
      matchText(e.status, searchQuery);
  }) || [];

  const filteredRevenues = revenues?.filter(r => 
    matchText(r.description, searchQuery) ||
    matchText(r.amount?.toString(), searchQuery) ||
    matchText(r.source, searchQuery) ||
    matchText(r.status, searchQuery)
  ) || [];

  const hasSearchResults = filteredExpenses.length > 0 || filteredRevenues.length > 0;

  const SearchBar = (
    <div className="relative w-full mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Pesquisar despesas, receitas, fluxo de caixa, DRE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );

  const SearchResultsView = searchQuery.trim() !== '' && (
    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6 mb-8">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg">Resultados da Pesquisa Financeira</h3>
        <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
          {filteredExpenses.length + filteredRevenues.length} encontrados
        </span>
      </div>

      {!hasSearchResults ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">Nenhum resultado encontrado para "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses Card */}
          {filteredExpenses.length > 0 && (
            <Card className="p-4 bg-white shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Despesas ({filteredExpenses.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {filteredExpenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigateWithDirtyCheck(`/financeiro/despesas`)}>
                    <div>
                      <p className="font-semibold text-slate-800">{e.description}</p>
                      <p className="text-slate-400">Vencimento: {new Date(e.dueDate).toLocaleDateString('pt-BR')} - <span className="uppercase">{e.status}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(e.amount)}</p>
                      <p className="text-slate-400">{e.paymentMethod || 'Não informado'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Revenues Card */}
          {filteredRevenues.length > 0 && (
            <Card className="p-4 bg-white shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Receitas ({filteredRevenues.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {filteredRevenues.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigateWithDirtyCheck(`/financeiro/receitas`)}>
                    <div>
                      <p className="font-semibold text-slate-800">{r.description}</p>
                      <p className="text-slate-400">Data: {new Date(r.date).toLocaleDateString('pt-BR')} - <span className="uppercase">{r.status}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(r.amount)}</p>
                      <p className="text-slate-400">{r.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // Mock data for charts
  const revenueVsExpenseData = [
    { name: 'Jan', receita: 4000, despesa: 2400 },
    { name: 'Fev', receita: 3000, despesa: 1398 },
    { name: 'Mar', receita: 2000, despesa: 9800 },
    { name: 'Abr', receita: 2780, despesa: 3908 },
    { name: 'Mai', receita: 1890, despesa: 4800 },
    { name: 'Jun', receita: 2390, despesa: 3800 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const expensesByCategoryData = [
    { name: 'Aluguel', value: 2000 },
    { name: 'Energia', value: 800 },
    { name: 'Fornecedores', value: 5000 },
    { name: 'Salários', value: salarySum || 3000 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isMobile) {
    return (
      <div className="pb-8 space-y-6">
        {SearchBar}
        {SearchResultsView}
        <div className="grid grid-cols-2 gap-4">
          {MOBILE_MENU.map((item) => (
            <button 
              key={item.path} 
              onClick={() => navigateWithDirtyCheck(item.path)}
              className="w-full text-left bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col items-start relative overflow-hidden transition-transform active:scale-95 cursor-pointer"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", item.bg, item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-[15px]">{item.title}</h3>
            </button>
          ))}
        </div>

        <div>
          <h2 className="font-bold text-slate-800 text-lg mb-4">Resumo Financeiro</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 shadow-sm border-emerald-100 bg-emerald-50">
              <p className="text-xs font-bold text-emerald-800 uppercase">Receitas</p>
              <h3 className="text-xl font-bold text-emerald-900 mt-1">{formatCurrency(totalRevenue)}</h3>
            </Card>
            <Card className="p-4 shadow-sm border-red-100 bg-red-50">
              <p className="text-xs font-bold text-red-800 uppercase">Despesas</p>
              <h3 className="text-xl font-bold text-red-900 mt-1">{formatCurrency(totalExpenses)}</h3>
            </Card>
            <Card className="p-4 shadow-sm border-blue-100 bg-blue-50">
              <p className="text-xs font-bold text-blue-800 uppercase">Lucro Líquido</p>
              <h3 className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(netProfit)}</h3>
            </Card>
            <Card className="p-4 shadow-sm border-orange-100 bg-orange-50">
              <p className="text-xs font-bold text-orange-800 uppercase">A Pagar (Atrasado)</p>
              <h3 className="text-xl font-bold text-orange-900 mt-1">{formatCurrency(overdueExpenses)}</h3>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Visão Geral Financeira</h1>
          <p className="text-slate-500 mt-1">Acompanhe a saúde financeira do seu negócio</p>
        </div>
        <div className="w-full md:max-w-md">
          {SearchBar}
        </div>
      </div>

      {SearchResultsView}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Receitas</p>
              <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Despesas</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">Lucro Líquido</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(netProfit)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-800">A Pagar (Atrasado)</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(overdueExpenses)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Receitas vs Despesas (Mês a Mês)</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                  <RechartsTooltip 
                    cursor={false} 
                    formatter={(value) => formatCurrency(value as number)} 
                  />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Gastos por Categoria</h2>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensesByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    cursor={false} 
                    formatter={(value) => formatCurrency(value as number)} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {expensesByCategoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-sm text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
