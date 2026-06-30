import { db, generateId } from './db';
import { syncService, SyncAction } from '../services/SyncService';
import { statsService } from '../services/StatsService';
import { BaseEntity, GlobalStats } from '../types';

export class Repository<T extends BaseEntity> {
  constructor(private collectionName: string) {}

  async get(id: string): Promise<T | undefined> {
    const table = (db as any)[this.collectionName];
    return await table.get(id);
  }

  async getAll(): Promise<T[]> {
    const table = (db as any)[this.collectionName];
    return await table.toArray();
  }

  async list(filter?: Partial<T>): Promise<T[]> {
    const table = (db as any)[this.collectionName];
    if (!filter || Object.keys(filter).length === 0) {
      return await table.toArray();
    }
    return await table.where(filter).toArray();
  }

  async add(data: Omit<T, 'createdAt' | 'updatedAt' | 'syncStatus'>, statsUpdates?: Partial<Record<keyof GlobalStats, number>>): Promise<string> {
    const id = data.id || generateId();
    const now = new Date().toISOString();
    
    const entity = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING'
    } as any;

    const table = (db as any)[this.collectionName];
    await table.add(entity);

    // Enqueue for background sync
    await syncService.enqueue(this.collectionName, id, 'CREATE', entity);

    // Update global stats if provided
    if (statsUpdates) {
      await statsService.updateMetrics(statsUpdates);
    }

    return id;
  }

  async update(id: string, data: Partial<T>, statsUpdates?: Partial<Record<keyof GlobalStats, number>>): Promise<void> {
    const now = new Date().toISOString();
    const table = (db as any)[this.collectionName];
    
    await table.update(id, {
      ...data,
      updatedAt: now,
      syncStatus: 'PENDING'
    });

    const updatedItem = await table.get(id);
    if (updatedItem) {
      await syncService.enqueue(this.collectionName, id, 'UPDATE', updatedItem);
    }

    if (statsUpdates) {
      await statsService.updateMetrics(statsUpdates);
    }
  }

  async delete(id: string, statsUpdates?: Partial<Record<keyof GlobalStats, number>>): Promise<void> {
    const table = (db as any)[this.collectionName];
    await table.delete(id);
    
    await syncService.enqueue(this.collectionName, id, 'DELETE', { id });

    if (statsUpdates) {
      await statsService.updateMetrics(statsUpdates);
    }
  }
}

// Export specific repositories
export const productRepository = new Repository<any>('products');
export const categoryRepository = new Repository<any>('categories');
export const supplierRepository = new Repository<any>('suppliers');
export const stockEventRepository = new Repository<any>('stockEvents');
export const expenseRepository = new Repository<any>('expenses');
export const revenueRepository = new Repository<any>('revenues');
export const employeeRepository = new Repository<any>('employees');
export const locationRepository = new Repository<any>('locations');
export const auditRepository = new Repository<any>('auditLogs');
export const inventoryRepository = new Repository<any>('inventories');
export const cashRegisterRepository = new Repository<any>('cashRegisters');
export const cashRegisterClosureRepository = new Repository<any>('cashRegisterClosures');
export const investigationRepository = new Repository<any>('investigations');
export const cashReconciliationRepository = new Repository<any>('cashReconciliations');
export const expenseCategoryRepository = new Repository<any>('expenseCategories');
export const costCenterRepository = new Repository<any>('costCenters');
export const importTemplateRepository = new Repository<any>('importTemplates');
export const importHistoryRepository = new Repository<any>('importHistory');
export const scanLogRepository = new Repository<any>('scanLogs');
export const systemSettingsRepository = new Repository<any>('systemSettings');
