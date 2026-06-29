import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { 
  Users,
  UserPlus,
  Briefcase,
  Gift,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useNavigation } from '../contexts/NavigationContext';
import { matchText } from '../utils/search';

const QUICK_ACTIONS = [
  { title: 'Funcionários', icon: Users, path: '/funcionarios', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { title: 'Novo Funcionário', icon: UserPlus, path: '/funcionarios/novo', color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function RhDashboard() {
  const { navigateWithDirtyCheck } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const employees = useLiveQuery(() => db.employees.toArray());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1);
  const handleNextMonth = () => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1);

  const employeeList = employees || [];
  const totalEmployees = employeeList.length;
  const activeEmployees = employeeList.filter(e => e.status === 'ACTIVE').length;
  const onLeave = employeeList.filter(e => e.status === 'LEAVE' || e.status === 'VACATION').length;
  
  const totalPayroll = employeeList.filter(e => e.status === 'ACTIVE').reduce((sum, emp) => {
    return sum + (emp.salary || 0) + (emp.transportAllowance || 0) + (emp.foodAllowance || 0);
  }, 0);

  // Filter list based on search
  const filteredEmployees = employeeList.filter(e => 
    matchText(e.name, searchQuery) ||
    matchText(e.role, searchQuery) ||
    matchText(e.department, searchQuery) ||
    matchText(e.cpf, searchQuery) ||
    matchText(e.email, searchQuery) ||
    matchText(e.phone, searchQuery) ||
    matchText(e.status, searchQuery) ||
    matchText(e.notes, searchQuery)
  );

  const hasSearchResults = filteredEmployees.length > 0;

  const SearchBar = (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Pesquisar funcionários, cargos, departamentos..."
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
        <h3 className="font-bold text-slate-800 text-lg">Resultados da Pesquisa de RH</h3>
        <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
          {filteredEmployees.length} encontrados
        </span>
      </div>

      {!hasSearchResults ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">Nenhum resultado encontrado para "{searchQuery}"</p>
        </div>
      ) : (
        <Card className="p-4 bg-white shadow-sm space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Users className="w-4 h-4 text-indigo-500" /> Colaboradores ({filteredEmployees.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto no-scrollbar">
            {filteredEmployees.map(emp => (
              <div 
                key={emp.id} 
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                onClick={() => navigateWithDirtyCheck(`/funcionarios`)}
              >
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.role} • {emp.department || 'Geral'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full inline-block uppercase">
                    {emp.status}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{emp.phone || 'Sem fone'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800">Visão Geral do RH</h2>
        <div className="w-full md:max-w-md">
          {SearchBar}
        </div>
      </div>
      
      {SearchResultsView}

      {/* Quick Actions (available on both mobile & desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((item) => (
          <button 
            key={item.path} 
            onClick={() => navigateWithDirtyCheck(item.path)}
            className="w-full text-left bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col items-start relative overflow-hidden transition-transform active:scale-95 hover:scale-[1.01] hover:shadow-md cursor-pointer"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", item.bg, item.color)}>
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-[15px]">{item.title}</h3>
          </button>
        ))}
      </div>
      
      {/* Resumo / Statistics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 border-l-4 border-l-indigo-500 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Ativos</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {activeEmployees} <span className="text-xs font-normal text-slate-400">colaboradores</span>
          </h3>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-orange-500 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Afastados/Férias</p>
          <h3 className="text-2xl font-bold text-orange-600">{onLeave}</h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500 sm:col-span-2 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Folha Salarial Estimada (Mês)</p>
          <h3 className="text-2xl font-bold text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPayroll)}
          </h3>
        </Card>
      </section>

      {/* Main Content Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Employees Card */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" /> Colaboradores Ativos
            </h3>
            <div className="space-y-4">
              {activeEmployees === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum colaborador ativo encontrado.</p>
              ) : (
                employeeList.filter(e => e.status === 'ACTIVE').slice(0, 5).map(emp => (
                  <div key={emp.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.role || 'Sem cargo definido'}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      Admissão: {emp.admissionDate ? new Date(emp.admissionDate).toLocaleDateString('pt-BR') : 'N/A'}
                    </div>
                  </div>
                ))
              )}
            </div>
            {activeEmployees > 5 && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <Link to="/funcionarios" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Ver todos os funcionários
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Birthdays Card */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-500" /> Aniversariantes de {months[selectedMonth]}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {(() => {
                const birthdays = employeeList.filter(e => {
                  if (!e.birthDate) return false;
                  const birthMonth = new Date(e.birthDate).getUTCMonth();
                  return birthMonth === selectedMonth;
                }).sort((a, b) => {
                  const dayA = new Date(a.birthDate!).getUTCDate();
                  const dayB = new Date(b.birthDate!).getUTCDate();
                  return dayA - dayB;
                }) || [];

                if (birthdays.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <Gift className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Nenhum aniversariante em {months[selectedMonth]}.</p>
                    </div>
                  );
                }

                return birthdays.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 font-bold text-xs">
                        {new Date(emp.birthDate!).getUTCDate()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.role}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded-full">
                      Dia {new Date(emp.birthDate!).getUTCDate()}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
