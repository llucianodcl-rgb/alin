import { db } from '../db/db';
import { cashReconciliationRepository, auditRepository } from '../db/repository';
import { CashReconciliation } from '../types';

export class ReconciliationEngine {
  static async runReconciliation(
    cashRegisterId: string, 
    operatorId: string | undefined, 
    source: 'CLOSURE' | 'IMPORT',
    referenceId: string | undefined,
    informedAmount: number,
    expectedAmount: number,
    totalSales: number
  ) {
    const settings = await db.systemSettings.toCollection().first();
    const warningLimit = settings?.reconciliationWarningLimit ?? 10;
    const criticalLimit = settings?.reconciliationCriticalLimit ?? 50;

    const difference = informedAmount - expectedAmount;
    const absDifference = Math.abs(difference);
    
    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (absDifference > criticalLimit) {
      status = 'CRITICAL';
    } else if (absDifference > warningLimit) {
      status = 'WARNING';
    }

    const suggestedCauses: string[] = [];
    
    if (status !== 'OK') {
      if (difference < 0) {
        suggestedCauses.push('Sangria não registrada');
        suggestedCauses.push('Venda cancelada sem estorno');
        suggestedCauses.push('Despesa paga com dinheiro do caixa não lançada');
        suggestedCauses.push('Erro de troco');
      } else {
        suggestedCauses.push('Suprimento de caixa não registrado');
        suggestedCauses.push('Lançamento duplicado de despesa');
        suggestedCauses.push('Recebimento não registrado no sistema');
        suggestedCauses.push('Importação de vendas incompleta');
      }
    }

    // Identify repeated problems
    const pastIssues = await db.cashReconciliations
      .where('cashRegisterId').equals(cashRegisterId)
      .and(r => r.status !== 'OK' && Math.sign(r.difference) === Math.sign(difference))
      .toArray();

    let notes = '';
    if (pastIssues.length >= 3 && status !== 'OK') {
      notes = `Foi identificado que este mesmo tipo de divergência ocorreu diversas vezes nos últimos meses (${pastIssues.length} ocorrências registradas).`;
    }

    const reconciliationId = await cashReconciliationRepository.add({
      cashRegisterId,
      date: new Date().toISOString(),
      operatorId: operatorId || '',
      totalSales,
      expectedAmount,
      informedAmount,
      difference,
      status,
      suggestedCauses,
      notes,
      source,
      referenceId: referenceId || ''
    } as any);

    await auditRepository.add({
      userId: operatorId || 'system',
      userName: 'Sistema (Conciliação)',
      timestamp: new Date().toISOString(),
      module: 'FINANCEIRO',
      action: 'CREATE',
      targetId: reconciliationId,
      targetName: 'Conciliação Inteligente',
      cashRegisterId,
      details: `Conciliação automática gerada. Status: ${status}. Diferença: R$ ${difference.toFixed(2)}`
    } as any);

    return await cashReconciliationRepository.get(reconciliationId) as CashReconciliation;
  }
}
