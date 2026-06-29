import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowUpFromLine, ArrowDownToLine, Wallet } from 'lucide-react';
import { cn } from '../utils/cn';

export default function CashFlow() {
  const expenses = useLiveQuery(() => db.expenses.where('status').equals('PAID').toArray(), []);
  const revenues = useLiveQuery(() => db.revenues.where('status').equals('RECEIVED').toArray(), []);

  // For simplicity, we just merge them and sort by date. 
  // In a real scenario, this would have date filters.
  
  const transactions = [
    ...(expenses?.map(e => ({
      id: e.id,
      description: e.description,
      amount: -e.amount, // Negative for expenses
      date: e.paymentDate || e.dueDate,
      type: 'EXPENSE'
    })) || []),
    ...(revenues?.map(r => ({
      id: r.id,
      description: r.description,
      amount: r.amount,
      date: r.date,
      type: 'REVENUE'
    })) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIn = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const totalOut = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const balance = totalIn - totalOut;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fluxo de Caixa</h1>
        <p className="text-slate-500 mt-1">Acompanhe as entradas e saídas financeiras (Realizado)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <ArrowUpFromLine className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">Entradas</p>
              <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalIn)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Saídas</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalOut)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-slate-200",
          balance >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"
        )}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              balance >= 0 ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
            )}>
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className={cn("text-sm font-medium", balance >= 0 ? "text-blue-800" : "text-orange-800")}>Saldo Atual</p>
              <p className={cn("text-2xl font-bold", balance >= 0 ? "text-blue-900" : "text-orange-900")}>{formatCurrency(balance)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!transactions.length ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 w-32">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{t.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        t.type === 'REVENUE' ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"
                      )}>
                        {t.type === 'REVENUE' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-medium",
                      t.amount > 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
