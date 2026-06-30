export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'PENDING' | 'SYNCED' | 'ERROR';
  lastSyncedAt?: string;
  deleted?: boolean;
}

export interface CashRegister extends BaseEntity {
  name: string;
  code?: string;
  description?: string;
  defaultOperatorId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  color: string;
  notes?: string;
}

export interface CashRegisterClosure extends BaseEntity {
  cashRegisterId: string;
  operatorId?: string;
  date: string;
  totalSales: number;
  totalReceived: number;
  totalWithdrawals: number;
  totalDeposits: number;
  totalExpenses: number;
  expectedAmount: number;
  informedAmount: number;
  difference: number;
  notes?: string;
}

export type LocationType = 'WAREHOUSE' | 'SECTOR' | 'AISLE' | 'SHELF' | 'LEVEL' | 'POSITION' | 'FREEZER' | 'COLD_ROOM' | 'RECEIVING' | 'DISPATCH' | 'EXTERNAL';

export interface WarehouseLocation extends BaseEntity {
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
}

export interface Supplier extends BaseEntity {
  companyName: string;
  tradeName?: string;
  cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  number?: string;
  complement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  neighborhood?: string;
  website?: string;
  contactName?: string;
  notes?: string;
}

export interface Product extends BaseEntity {
  name: string;
  internalCode?: string;
  barcode?: string;
  categoryId: string;
  supplierId?: string;
  brand?: string;
  unitOfMeasure: 'Unidade' | 'Caixa' | 'Fardo' | 'Quilograma' | 'Litro' | 'Metro' | 'Pacote' | 'Outro';
  minQuantity: number;
  quantityPerPackage?: number;
  unitCost?: number;
  packageCost?: number;
  batch?: string;
  manufactureDate?: string;
  deliveryDate?: string;
  noExpiration: boolean;
  expirationDate?: string;
  locationId?: string;
  locationPath?: string;
  description?: string;
  notes?: string;
  photoUrl?: string;
  
  // Computed/Cached stock value (must be updated via events)
  currentStock: number;
}

export type StockEventType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'INVENTARIO';

export type StockEvent = {
  id?: string;
  productId: string;
  type: StockEventType;
  quantity: number;
  date: string;
  userId?: string;
  
  // Specific to Entrada
  supplierId?: string;
  invoiceNumber?: string;
  unitCost?: number;
  batch?: string;
  expirationDate?: string;
  
  // Specific to Saida
  reason?: 'Venda' | 'Perda' | 'Quebra' | 'Troca' | 'Uso interno' | 'Vencimento' | 'Doacao' | 'Outro';
  
  // Cash Register
  cashRegisterId?: string;
  
  notes?: string;
};

export type ExpenseStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type RecurrencePeriod = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';
export type InsightSeverity = 'INFO' | 'WARNING' | 'IMPORTANT' | 'CRITICAL';
export type InsightCategory = 'FINANCE' | 'STOCK' | 'HR' | 'GENERAL';

export interface Insight extends BaseEntity {
  title: string;
  message: string;
  severity: InsightSeverity;
  category: InsightCategory;
  date: string;
  isRead: boolean;
}

export interface Expense extends BaseEntity {
  description: string;
  categoryId?: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  supplierId?: string;
  employeeId?: string;
  paymentMethod?: string;
  costCenterId?: string;
  notes?: string;
  status: ExpenseStatus;
  isRecurring: boolean;
  recurrencePeriod: RecurrencePeriod;
  referenceId?: string; // To link to a purchase/stock entry
  cashRegisterId?: string;
}

export interface ExpenseCategory extends BaseEntity {
  name: string;
  description?: string;
}

export interface CostCenter extends BaseEntity {
  name: string;
  description?: string;
}

export interface Revenue extends BaseEntity {
  description: string;
  amount: number;
  date: string;
  source: 'SALE' | 'SERVICE' | 'FINANCIAL' | 'OTHER';
  referenceId?: string; // To link to stock exit
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  cashRegisterId?: string;
}

export interface Employee extends BaseEntity {
  photo?: string;
  name: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: string;
  civilStatus?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  zipCode?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  role: string;
  department?: string;
  admissionDate: string;
  terminationDate?: string;
  status: 'ACTIVE' | 'VACATION' | 'LEAVE' | 'SUSPENDED' | 'TERMINATED';
  notes?: string;
  salary: number;
  transportAllowance?: number;
  foodAllowance?: number;
  commission?: number;
  bonus?: number;
  deductions?: number;
  payday: number; // Day of the month
  bank?: string;
  agency?: string;
  account?: string;
  pix?: string;
}

export type InventoryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type InventoryJustification = 'Quebra' | 'Produto vencido' | 'Perda' | 'Erro de lançamento' | 'Erro de contagem' | 'Avaria' | 'Produto furtado ou extraviado' | 'Outro';

export interface InventoryItem {
  productId: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  financialDiff: number;
  justification?: InventoryJustification;
  notes?: string;
}

export interface Inventory extends BaseEntity {
  name: string;
  responsibleId: string;
  responsibleName: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  type: 'FULL' | 'PARTIAL';
  categories?: string[];
  suppliers?: string[];
  status: InventoryStatus;
  totalSystemQty: number;
  totalPhysicalQty: number;
  totalDifference: number;
  totalFinancialDifference: number;
  items: InventoryItem[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export type AuditModule = 'ALMOXARIFADO' | 'FINANCEIRO' | 'RH' | 'SISTEMA';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'SYNC' | 'ERROR' | 'APPROVE' | 'REJECT';

export interface AuditLog extends BaseEntity {
  userId: string;
  userName: string;
  timestamp: string;
  module: AuditModule;
  action: AuditAction;
  targetId?: string;
  targetName?: string;
  oldValue?: any;
  newValue?: any;
  quantityChanged?: number;
  cashRegisterId?: string;
  details?: string;
  device?: string;
}

export type Draft = {
  id: string;
  type: string;
  data: any;
  updatedAt: string;
};

export interface ImportTemplate extends BaseEntity {
  name: string;
  type: 'SALES' | 'PRODUCTS' | 'SUPPLIERS';
  fieldMapping: Record<string, string>; // e.g., { 'barcode': 'coluna1', 'quantity': 'coluna2' }
}

export interface ImportHistory extends BaseEntity {
  date: string;
  fileName: string;
  fileHash: string;
  type: string;
  recordsTotal: number;
  successCount: number;
  errorCount: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  timeMs: number;
  userId: string;
  cashRegisterId?: string;
  details?: string;
  errors?: {row: number; reason: string; item?: any}[];
}

export interface CashReconciliation extends BaseEntity {
  cashRegisterId: string;
  date: string;
  operatorId?: string;
  totalSales: number;
  expectedAmount: number;
  informedAmount: number;
  difference: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  notes?: string;
  suggestedCauses?: string[];
  source: 'CLOSURE' | 'IMPORT';
  referenceId?: string;
}

export interface SystemSettings extends BaseEntity {
  reconciliationWarningLimit?: number;
  reconciliationCriticalLimit?: number;
  appPin?: string;
  isLockEnabled?: boolean;
}

export interface Investigation extends BaseEntity {
  reconciliationId: string;
  cashRegisterId: string;
  operatorId?: string;
  date: string;
  difference: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  checklist: Record<string, 'PENDING' | 'VERIFIED' | 'ATTENTION' | 'PROBLEM'>;
  notes: string;
  evidences: { id: string; name: string; url: string; type: string; timestamp: string }[];
  conclusionReason?: string;
  conclusionDetails?: string;
  investigatorId: string;
}

export interface ScanLog extends BaseEntity {
  userId: string;
  userName: string;
  timestamp: string;
  code: string;
  format: string;
  type: 'PRODUCT' | 'LOCATION' | 'EMPLOYEE' | 'OTHER';
  targetId?: string;
  targetName?: string;
  operation: string;
  device: string;
}

export interface GlobalStats {
  id: string; // 'current' or 'global'
  totalProducts: number;
  expiredProducts: number;
  nearExpirationProducts: number;
  lowStockProducts: number;
  totalStockValue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  totalEmployees: number;
  activeEvents: number;
  unresolvedInventories: number;
  criticalInvestigations: number;
  lastUpdated: string;
}
