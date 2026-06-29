import Dexie, { type EntityTable } from 'dexie';
import { Product, Category, Supplier, StockEvent, Expense, ExpenseCategory, CostCenter, Revenue, Employee, Insight } from '../types';

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
};

// Schema declaration
db.version(4).stores({
  products: 'id, name, internalCode, barcode, categoryId, supplierId, expirationDate, currentStock',
  categories: 'id, name',
  suppliers: 'id, companyName, cnpj',
  stockEvents: 'id, productId, type, date, supplierId',
  expenses: 'id, description, categoryId, dueDate, paymentDate, status, isRecurring, employeeId',
  expenseCategories: 'id, name',
  costCenters: 'id, name',
  revenues: 'id, description, date, source, status',
  employees: 'id, name, cpf, role, status',
  insights: 'id, date, category, severity',
  drafts: 'id, type, updatedAt',
  settings: 'id'
}).upgrade(tx => {
  // Migration logic if needed
});

// Utility function to generate UUIDs
export const generateId = () => crypto.randomUUID();

export { db };

