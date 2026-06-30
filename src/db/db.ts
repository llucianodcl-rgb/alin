import Dexie, { type EntityTable } from 'dexie';
import { Product, Category, Supplier, StockEvent, Expense, ExpenseCategory, CostCenter, Revenue, Employee, Insight, Inventory, AuditLog, WarehouseLocation, ImportTemplate, ImportHistory, ScanLog, CashRegister, CashRegisterClosure } from '../types';

const db = new Dexie('AlinDB') as Dexie & {
  products: EntityTable<Product, 'id'>;
  categories: EntityTable<Category, 'id'>;
  suppliers: EntityTable<Supplier, 'id'>;
  stockEvents: EntityTable<StockEvent, 'id'>;
  expenses: EntityTable<Expense, 'id'>;
  expenseCategories: EntityTable<ExpenseCategory, 'id'>;
  costCenters: EntityTable<CostCenter, 'id'>;
  revenues: EntityTable<Revenue, 'id'>;
  employees: EntityTable<Employee, 'id'>;
  insights: EntityTable<Insight, 'id'>;
  inventories: EntityTable<Inventory, 'id'>;
  auditLogs: EntityTable<AuditLog, 'id'>;
  locations: EntityTable<WarehouseLocation, 'id'>;
  importTemplates: EntityTable<ImportTemplate, 'id'>;
  importHistory: EntityTable<ImportHistory, 'id'>;
  scanLogs: EntityTable<ScanLog, 'id'>;
  cashRegisters: EntityTable<CashRegister, 'id'>;
  cashRegisterClosures: EntityTable<CashRegisterClosure, 'id'>;
  cashReconciliations: EntityTable<import('../types').CashReconciliation, 'id'>;
  systemSettings: EntityTable<import('../types').SystemSettings, 'id'>;
  investigations: EntityTable<import('../types').Investigation, 'id'>;
  syncQueue: EntityTable<{
    id: string;
    collection: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    data: any;
    timestamp: string;
    priority: number;
    status: 'PENDING' | 'SYNCING' | 'ERROR';
    errorMessage?: string;
    attempts: number;
  }, 'id'>;
};

// Schema declaration
db.version(12).stores({
  products: 'id, name, internalCode, barcode, categoryId, supplierId, expirationDate, currentStock, locationId, syncStatus',
  categories: 'id, name, syncStatus',
  suppliers: 'id, companyName, cnpj, syncStatus',
  stockEvents: 'id, productId, type, date, supplierId, cashRegisterId, syncStatus',
  expenses: 'id, description, categoryId, dueDate, paymentDate, status, isRecurring, employeeId, cashRegisterId, syncStatus',
  expenseCategories: 'id, name, syncStatus',
  costCenters: 'id, name, syncStatus',
  revenues: 'id, description, date, source, status, cashRegisterId, syncStatus',
  employees: 'id, name, cpf, role, status, syncStatus',
  insights: 'id, date, category, severity, syncStatus',
  drafts: 'id, type, updatedAt',
  settings: 'id',
  inventories: 'id, name, responsibleName, startDate, status, syncStatus',
  auditLogs: 'id, userName, timestamp, module, action, cashRegisterId, syncStatus',
  locations: 'id, name, code, type, parentId, status, syncStatus',
  importTemplates: 'id, name, type, syncStatus',
  importHistory: 'id, date, fileName, type, status, cashRegisterId, syncStatus',
  scanLogs: 'id, timestamp, code, type, operation, syncStatus',
  cashRegisters: 'id, name, status, syncStatus',
  cashRegisterClosures: 'id, cashRegisterId, date, syncStatus',
  cashReconciliations: 'id, cashRegisterId, date, status, source, syncStatus',
  systemSettings: 'id',
  investigations: 'id, reconciliationId, cashRegisterId, status, date, syncStatus',
  syncQueue: 'id, collection, action, timestamp, status, priority'
})
.upgrade(tx => {
  // Migration logic if needed
});

// Utility function to generate UUIDs
export const generateId = () => crypto.randomUUID();

export { db };

