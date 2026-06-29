import React from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { 
  Users,
  UserPlus,
  Briefcase,
  Calendar,
  Gift
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNavigation } from '../contexts/NavigationContext';

const MOBILE_MENU = [
  { title: 'Funcionários', icon: Users, path: '/funcionarios', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { title: 'Novo Funcionário', icon: UserPlus, path: '/funcionarios/novo', color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

export default function RhDashboard() {
  const isMobile = useIsMobile();
  const { navigateWithDirtyCheck } = useNavigation();
  
  const employees = useLiveQuery(() => db.employees.toArray());
  
  const totalEmployees = employees?.length || 0;
  const activeEmployees = employees?.filter(e => e.status === 'ACTIVE').length || 0;
  const onLeave = employees?.filter(e => e.status === 'LEAVE' || e.status === 'VACATION').length || 0;
  
  const totalPayroll = employees?.filter(e => e.status === 'ACTIVE').reduce((sum, emp) => {
    return sum + (emp.salary || 0) + (emp.transportAllowance || 0) + (emp.foodAllowance || 0);
  }, 0) || 0;

  if (isMobile) {
    return (
      <div className="pb-8 space-y-6">
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
          <h2 className="font-bold text-slate-800 text-lg mb-4">Resumo RH</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Ativos</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{activeEmployees}</h3>
            </Card>
            <Card className="p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Afastados/Férias</p>
              <h3 className="text-xl font-bold text-orange-600 mt-1">{onLeave}</h3>
            </Card>
            <Card className="p-4 shadow-sm col-span-2">
              <p className="text-xs font-bold text-slate-400 uppercase">Folha Salarial Estimada</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPayroll)}
              </h3>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Dashboard
  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Visão Geral do RH</h2>
      
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-5 border-l-4 border-l-indigo-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Ativos</p>
          <h3 className="text-2xl font-bold text-slate-800">{activeEmployees} <span className="text-xs font-normal text-slate-400">colaboradores</span></h3>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Afastados/Férias</p>
          <h3 className="text-2xl font-bold text-orange-600">{onLeave}</h3>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500 lg:col-span-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Folha Salarial Estimada (Mês)</p>
          <h3 className="text-2xl font-bold text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPayroll)}
          </h3>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" /> Colaboradores Ativos
            </h3>
            <div className="space-y-4">
              {activeEmployees === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum colaborador ativo encontrado.</p>
              ) : (
                employees?.filter(e => e.status === 'ACTIVE').slice(0, 5).map(emp => (
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

        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" /> Aniversariantes do Mês
            </h3>
            <div className="space-y-4">
              {(() => {
                const currentMonth = new Date().getMonth();
                const birthdays = employees?.filter(e => {
                  if (!e.birthDate) return false;
                  const birthMonth = new Date(e.birthDate).getMonth();
                  return birthMonth === currentMonth;
                }) || [];

                if (birthdays.length === 0) {
                  return <p className="text-slate-500 text-sm">Nenhum aniversariante este mês.</p>;
                }

                return birthdays.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.role}</p>
                    </div>
                    <div className="text-right text-sm font-bold text-pink-600">
                      {emp.birthDate ? new Date(emp.birthDate).getDate() : ''} / {currentMonth + 1}
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
