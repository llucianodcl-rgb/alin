import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../utils/cn';

export default function SimplifiedDre() {
  const expenses = useLiveQuery(() => db.expenses.where('status').equals('PAID').toArray(), []);
  const revenues = useLiveQuery(() => db.revenues.where('status').equals('RECEIVED').toArray(), []);
  const employees = useLiveQuery(() => db.employees.where('status').equals('ACTIVE').toArray(), []);

  // Calculation
  const receitaBruta = revenues?.reduce((acc, r) => acc + r.amount, 0) || 0;
  
  // Categorize expenses
  const impostos = 0; // Simplified for now, could add a flag in category
  const receitaLiquida = receitaBruta - impostos;

  const custoMercadorias = expenses?.filter(e => e.description.toLowerCase().includes('compra de mercadoria'))
    .reduce((acc, e) => acc + e.amount, 0) || 0;
  
  const lucroBruto = receitaLiquida - custoMercadorias;

  const salarios = employees?.reduce((acc, emp) => acc + emp.salary + (emp.transportAllowance || 0) + (emp.foodAllowance || 0), 0) || 0;
  const outrasDespesasOperacionais = (expenses?.reduce((acc, e) => acc + e.amount, 0) || 0) - custoMercadorias - salarios;
  const despesasOperacionais = salarios + outrasDespesasOperacionais;

  const lucroOperacional = lucroBruto - despesasOperacionais;
  const lucroLiquido = lucroOperacional; // No IR/CSLL for simplified

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getPercent = (value: number) => {
    if (receitaBruta === 0) return '0.0%';
    return ((value / receitaBruta) * 100).toFixed(1) + '%';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DRE Simplificada</h1>
        <p className="text-slate-500 mt-1">Demonstração do Resultado do Exercício</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 font-semibold text-base rounded-tl-xl">Descrição</th>
                  <th className="px-6 py-4 font-semibold text-base text-right">%</th>
                  <th className="px-6 py-4 font-semibold text-base text-right rounded-tr-xl">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">1. Receita Bruta de Vendas</td>
                  <td className="px-6 py-4 text-right text-slate-500">{getPercent(receitaBruta)}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(receitaBruta)}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <td className="px-6 py-3 text-slate-600 pl-10">(-) Deduções e Impostos</td>
                  <td className="px-6 py-3 text-right text-slate-400">{getPercent(impostos)}</td>
                  <td className="px-6 py-3 text-right text-red-500">-{formatCurrency(impostos)}</td>
                </tr>
                
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">2. Receita Líquida</td>
                  <td className="px-6 py-4 text-right text-slate-500">{getPercent(receitaLiquida)}</td>
                  <td className="px-6 py-4 text-right font-bold text-blue-600">{formatCurrency(receitaLiquida)}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <td className="px-6 py-3 text-slate-600 pl-10">(-) Custo das Mercadorias Vendidas (CMV)</td>
                  <td className="px-6 py-3 text-right text-slate-400">{getPercent(custoMercadorias)}</td>
                  <td className="px-6 py-3 text-right text-red-500">-{formatCurrency(custoMercadorias)}</td>
                </tr>
                
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">3. Lucro Bruto</td>
                  <td className="px-6 py-4 text-right text-slate-500">{getPercent(lucroBruto)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(lucroBruto)}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <td className="px-6 py-3 text-slate-600 pl-10">(-) Despesas com Pessoal (Salários)</td>
                  <td className="px-6 py-3 text-right text-slate-400">{getPercent(salarios)}</td>
                  <td className="px-6 py-3 text-right text-red-500">-{formatCurrency(salarios)}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <td className="px-6 py-3 text-slate-600 pl-10">(-) Outras Despesas Operacionais</td>
                  <td className="px-6 py-3 text-right text-slate-400">{getPercent(outrasDespesasOperacionais)}</td>
                  <td className="px-6 py-3 text-right text-red-500">-{formatCurrency(outrasDespesasOperacionais)}</td>
                </tr>
                
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">4. Lucro Operacional</td>
                  <td className="px-6 py-4 text-right text-slate-500">{getPercent(lucroOperacional)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(lucroOperacional)}</td>
                </tr>
                
                <tr className={cn(
                  "border-t-2 border-slate-200 text-lg",
                  lucroLiquido >= 0 ? "bg-emerald-50" : "bg-red-50"
                )}>
                  <td className={cn("px-6 py-5 font-bold", lucroLiquido >= 0 ? "text-emerald-900" : "text-red-900")}>5. Lucro Líquido do Exercício</td>
                  <td className={cn("px-6 py-5 text-right", lucroLiquido >= 0 ? "text-emerald-700" : "text-red-700")}>{getPercent(lucroLiquido)}</td>
                  <td className={cn("px-6 py-5 text-right font-bold", lucroLiquido >= 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(lucroLiquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
