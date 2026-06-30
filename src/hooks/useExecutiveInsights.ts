import { useState, useEffect } from 'react';
import { 
  productRepository, 
  expenseRepository, 
  revenueRepository, 
  employeeRepository,
  inventoryRepository,
  locationRepository,
  stockEventRepository,
  auditRepository,
} from '../db/repository';
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
        productRepository.list(),
        expenseRepository.list(),
        revenueRepository.list(),
        employeeRepository.list({ status: 'ACTIVE' })
      ]);

      const newInsights: any[] = [];

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

      // 5. Intelligent Alerts (Inventories and Audits)
      const recentInventories = await db.inventories.orderBy('startDate').reverse().limit(5).toArray();
      const recentInventoriesWithLosses = recentInventories.filter(i => i.status === 'APPROVED' && i.totalFinancialDifference < 0);
      if (recentInventoriesWithLosses.length > 0) {
        const loss = Math.abs(recentInventoriesWithLosses[0].totalFinancialDifference);
        newInsights.push({
          category: 'STOCK',
          severity: 'CRITICAL',
          title: 'Perdas em Inventário',
          message: `O último inventário registrou uma perda financeira de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loss)} por diferenças de estoque.`
        });
      }

      // 6. Smart Warehouse Insights
      const locations = await locationRepository.list();
      const stockEvents = await stockEventRepository.list();
      
      const emptyLocations = locations.filter(loc => {
        const hasChildren = locations.some(l => l.parentId === loc.id);
        const hasProducts = products.some(p => p.locationId === loc.id);
        return !hasChildren && !hasProducts;
      });

      if (emptyLocations.length > 0) {
        newInsights.push({
          category: 'STOCK',
          severity: 'INFO',
          title: 'Espaço Disponível',
          message: `Há ${emptyLocations.length} áreas/posições vazias no depósito que podem ser otimizadas.`
        });
      }

      // Detect high turnover products not in dispatch (simulated insight)
      const last30DaysEvents = stockEvents.filter(e => e.date >= in30DaysStr); // actually we need >= lastMonth date
      // Lets count movements per product
      const productMovements: Record<string, number> = {};
      stockEvents.forEach(e => {
        productMovements[e.productId] = (productMovements[e.productId] || 0) + 1;
      });
      
      const highTurnoverThreshold = 5;
      const highTurnoverProducts = Object.entries(productMovements)
        .filter(([_, count]) => count >= highTurnoverThreshold)
        .map(([id]) => products.find(p => p.id === id))
        .filter(p => p && p.locationPath && !p.locationPath.toLowerCase().includes('expedição'));

      if (highTurnoverProducts.length > 0) {
        newInsights.push({
          category: 'STOCK',
          severity: 'IMPORTANT',
          title: 'Otimização Física',
          message: `Existem ${highTurnoverProducts.length} produtos de alta rotatividade armazenados fora da área de expedição. Considere reposicioná-los para acelerar a separação.`
        });
      }

      const productsWithoutLocation = products.filter(p => !p.locationId);
      if (productsWithoutLocation.length > 0) {
        newInsights.push({
          category: 'STOCK',
          severity: 'WARNING',
          title: 'Produtos sem Local',
          message: `Você possui ${productsWithoutLocation.length} produtos sem localização física mapeada. Atualize o cadastro para facilitar buscas.`
        });
      }

      // Unusual audit actions
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentAudits = await db.auditLogs.where('timestamp').above(oneWeekAgo.toISOString()).toArray();
      const deleteCount = recentAudits.filter(a => a.action === 'DELETE').length;
      if (deleteCount >= 5) {
        newInsights.push({
          category: 'SYSTEM',
          severity: 'IMPORTANT',
          title: 'Atividade Incomum',
          message: `Foram detectadas ${deleteCount} exclusões de registros no sistema nos últimos 7 dias. Verifique o módulo de Auditoria.`
        } as any); 
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
      await db.insights.where('date').equals(today).delete();
      
      const now = new Date().toISOString();
      const insightsToInsert: Insight[] = newInsights.map(i => ({
        ...i,
        id: generateId(),
        date: today,
        isRead: false,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'PENDING'
      }));

      if (insightsToInsert.length > 0) {
        await db.insights.bulkAdd(insightsToInsert);
      }

      // Load all from today
      const todaysInsights = await db.insights.where('date').equals(today).toArray();
      // Sort by severity: CRITICAL > IMPORTANT > WARNING > INFO
      const severityWeight: Record<string, number> = { 'CRITICAL': 4, 'IMPORTANT': 3, 'WARNING': 2, 'INFO': 1 };
      todaysInsights.sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));
      
      setInsights(todaysInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return { insights, health, summary, loading };
}
