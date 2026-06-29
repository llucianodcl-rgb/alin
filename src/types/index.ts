export type LocationType = 'WAREHOUSE' | 'SECTOR' | 'AISLE' | 'SHELF' | 'LEVEL' | 'POSITION' | 'FREEZER' | 'COLD_ROOM' | 'RECEIVING' | 'DISPATCH' | 'EXTERNAL';

export interface WarehouseLocation {
  id?: string;
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type Category = {
  id?: string;
  name: string;
  description?: string;
};

export type Supplier = {
  id?: string;
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
};

export type Product = {
  id?: string;
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
};

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
  
  notes?: string;
};

export type ExpenseStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type RecurrencePeriod = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';
export type InsightSeverity = 'INFO' | 'WARNING' | 'IMPORTANT' | 'CRITICAL';
export type InsightCategory = 'FINANCE' | 'STOCK' | 'HR' | 'GENERAL';

export interface Insight {
  id?: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  category: InsightCategory;
  date: string;
  isRead: boolean;
}

export interface Expense {
  id?: string;
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
  createdAt: string;
}

export interface ExpenseCategory {
  id?: string;
  name: string;
  description?: string;
}

export interface CostCenter {
  id?: string;
  name: string;
  description?: string;
}

export interface Revenue {
  id?: string;
  description: string;
  amount: number;
  date: string;
  source: 'SALE' | 'SERVICE' | 'FINANCIAL' | 'OTHER';
  referenceId?: string; // To link to stock exit
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  createdAt: string;
}

export interface Employee {
  id?: string;
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
  createdAt: string;
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

export interface Inventory {
  id?: string;
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
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export type AuditModule = 'ALMOXARIFADO' | 'FINANCEIRO' | 'RH' | 'SISTEMA';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'SYNC' | 'ERROR' | 'APPROVE' | 'REJECT';

export interface AuditLog {
  id?: string;
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
  details?: string;
  device?: string;
  syncStatus?: 'PENDING' | 'SYNCED' | 'ERROR';
}

export type Draft = {
  id: string;
  type: string;
  data: any;
  updatedAt: string;
};

export interface ImportTemplate {
  id?: string;
  name: string;
  type: 'SALES' | 'PRODUCTS' | 'SUPPLIERS';
  fieldMapping: Record<string, string>; // e.g., { 'barcode': 'coluna1', 'quantity': 'coluna2' }
  createdAt: string;
  updatedAt: string;
}

export interface ImportHistory {
  id?: string;
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
  details?: string;
  errors?: {row: number; reason: string; item?: any}[];
}

export interface ScanLog {
  id?: string;
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
