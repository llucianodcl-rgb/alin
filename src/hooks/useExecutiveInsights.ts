import { useState, useEffect } from 'react';
import { db, generateId } from '../db/db';
import { Insight, InsightSeverity, InsightCategory } from '../types';

export type CompanyHealth = 'EXCELENTE' | 'MUITO_BOA' | 'BOA' | 'ATENCAO' | 'CRITICA';

export function useExecutiveInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [health, setHealth] = useState<CompanyHealth>('BOA');
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateAndLoadInsights();
  }, []);

  const generateAndLoadInsights = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);
      
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonth = lastMonthDate.toISOString().substring(0, 7);

      const [products, expenses, revenues, employees] = await Promise.all([
        db.products.toArray(),
        db.expenses.toArray(),
        db.revenues.toArray(),
        db.employees.where('status').equals('ACTIVE').toArray()
      ]);

      const newInsights: Omit<Insight, 'id' | 'date' | 'isRead'>[] = [];

      // 1. Finance Calculations
      const currentMonthRevenues = revenues.filter(r => r.date.startsWith(currentMonth));
      const lastMonthRevenues = revenues.filter(r => r.date.startsWith(lastMonth));
      
      const currentMonthExpenses = expenses.filter(e => (e.paymentDate || e.dueDate).startsWith(currentMonth));
      const lastMonthExpenses = expenses.filter(e => (e.paymentDate || e.dueDate).startsWith(lastMonth));

      const totalRevenueCurrent = currentMonthRevenues.reduce((sum, r) => sum + r.amount, 0);
      const totalRevenueLast = lastMonthRevenues.reduce((sum, r) => sum + r.amount, 0);
      
      const totalExpenseCurrent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalExpenseLast = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

      const netProfitCurrent = totalRevenueCurrent - totalExpenseCurrent;
      const netProfitLast = totalRevenueLast - totalExpenseLast;

      // 2. Finance Insights
      if (netProfitCurrent > netProfitLast && totalRevenueCurrent > 0) {
        newInsights.push({
          category: 'FINANCE',
          severity: 'INFO',
          title: 'Lucro em Alta',
          message: 'Seu lucro aumentou em relação ao mês anterior.'
        });
      }

      if (totalExpenseCurrent > totalExpenseLast && totalRevenueCurrent <= totalRevenueLast) {
        newInsights.push({
          category: 'FINANCE',
          severity: 'WARNING',
          title: 'Despesas Crescentes',
          message: 'As despesas cresceram mais que o faturamento. Analise seus custos.'
        });
      }

      const overdueExpenses = expenses.filter(e => e.status === 'OVERDUE');
      if (overdueExpenses.length > 0) {
        newInsights.push({
          category: 'FINANCE',
          severity: 'CRITICAL',
          title: 'Contas Atrasadas',
          message: `Você possui ${overdueExpenses.length} despesas vencidas aguardando pagamento.`
        });
      }

      const cashBalance = revenues.reduce((sum, r) => sum + r.amount, 0) - expenses.filter(e => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);
      
      if (cashBalance > totalExpenseCurrent * 1.5) {
        newInsights.push({
          category: 'FINANCE',
          severity: 'INFO',
          title: 'Caixa Saudável',
          message: 'O caixa está saudável. Sua empresa possui capital suficiente para novas operações.'
        });
      } else if (cashBalance < 0) {
        newInsights.push({
          category: 'FINANCE',
          severity: 'CRITICAL',
          title: 'Caixa Negativo',
          message: 'O caixa está negativo ou poderá ficar negativo nos próximos dias.'
        });
      }

      // 3. Stock Insights
      let totalStockValue = 0;
      let expiringSoon = 0;
      let expired = 0;
      let belowMinimum = 0;

      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const in30DaysStr = in30Days.toISOString().split('T')[0];

      products.forEach(p => {
        const value = (p.currentStock || 0) * (p.unitCost || 0);
        totalStockValue += value;

        if (p.expirationDate) {
          if (p.expirationDate < today) {
            expired++;
          } else if (p.expirationDate <= in30DaysStr) {
            expiringSoon++;
          }
        }

        if (p.currentStock !== undefined && p.minQuantity !== undefined && p.currentStock < p.minQuantity) {
          belowMinimum++;
        }
      });

      newInsights.push({
        category: 'STOCK',
        severity: 'INFO',
        title: 'Valor de Estoque',
        message: `O estoque da empresa está avaliado em aproximadamente ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalStockValue)}.`
      });

      if (expired > 0) {
        newInsights.push({
          category: 'STOCK',
          severity: 'CRITICAL',
          title: 'Produtos Vencidos',
          message: `Existem ${expired} produtos vencidos no estoque.`
        });
      } else if (expiringSoon > 0) {
        newInsights.push({
          category: 'STOCK',
          severity: 'WARNING',
          title: 'Vencimentos Próximos',
          message: `Há ${expiringSoon} produtos próximos do vencimento. Considere realizar uma promoção para reduzir perdas.`
        });
      }

      if (belowMinimum > 0) {
        newInsights.push({
          category: 'STOCK',
          severity: 'IMPORTANT',
          title: 'Estoque Baixo',
          message: `Alguns produtos (${belowMinimum}) estão abaixo do estoque mínimo.`
        });
      }

      // 4. Employees
      const totalPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0) + (emp.transportAllowance || 0) + (emp.foodAllowance || 0), 0);
      if (totalPayroll > 0) {
        newInsights.push({
          category: 'HR',
          severity: 'INFO',
          title: 'Folha Salarial',
          message: `A folha salarial deste mês é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPayroll)}.`
        });
      }

      // Health Calculation
      let healthScore = 100;
      if (netProfitCurrent < 0) healthScore -= 20;
      if (overdueExpenses.length > 0) healthScore -= 15;
      if (cashBalance < 0) healthScore -= 25;
      if (expired > 0) healthScore -= 10;
      if (belowMinimum > 0) healthScore -= 5;
      
      let currentHealth: CompanyHealth = 'EXCELENTE';
      if (healthScore >= 90) currentHealth = 'EXCELENTE';
      else if (healthScore >= 75) currentHealth = 'MUITO_BOA';
      else if (healthScore >= 60) currentHealth = 'BOA';
      else if (healthScore >= 40) currentHealth = 'ATENCAO';
      else currentHealth = 'CRITICA';
      
      setHealth(currentHealth);

      // Main Summary
      let summaryText = `📈 Hoje sua empresa apresenta um desempenho ${currentHealth.toLowerCase().replace('_', ' ')}. `;
      if (totalRevenueCurrent > totalRevenueLast && totalRevenueLast > 0) {
        const percent = Math.round(((totalRevenueCurrent - totalRevenueLast) / totalRevenueLast) * 100);
        summaryText += `O faturamento deste mês está ${percent}% acima do mês anterior. `;
      }
      summaryText += `O lucro líquido estimado é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netProfitCurrent)}. `;
      
      if (cashBalance > totalExpenseCurrent) {
        summaryText += `Você possui caixa suficiente para cobrir as despesas previstas.`;
      } else {
        summaryText += `Atenção ao fluxo de caixa para os próximos dias.`;
      }
      setSummary(summaryText);

      // Save insights to DB if they don't exist for today
      // For simplicity in this demo, we'll just clear old unread ones or append, but to avoid spamming we can delete today's and insert fresh
      await db.insights.where('date').equals(today).delete();
      
      const insightsToInsert: Insight[] = newInsights.map(i => ({
        ...i,
        id: generateId(),
        date: today,
        isRead: false
      }));

      if (insightsToInsert.length > 0) {
        await db.insights.bulkAdd(insightsToInsert);
      }

      // Load all from today
      const todaysInsights = await db.insights.where('date').equals(today).toArray();
      // Sort by severity: CRITICAL > IMPORTANT > WARNING > INFO
      const severityWeight = { 'CRITICAL': 4, 'IMPORTANT': 3, 'WARNING': 2, 'INFO': 1 };
      todaysInsights.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
      
      setInsights(todaysInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return { insights, health, summary, loading };
}
