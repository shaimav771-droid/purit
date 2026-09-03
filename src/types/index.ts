export type ProductType = 'handwash' | 'tissue' | 'dispenser' | 'other';
export type ProductCategory = ProductType;
export type ExpenseCategory = string;
export type UnitType = 'L' | 'pack' | 'piece' | 'can' | 'box' | 'unit';
export type CustomerStatus = 'active' | 'due_soon' | 'overdue' | 'lost';
export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | 'other';
export type LostReason = 'switched_supplier' | 'restaurant_closed' | 'price_issue' | 'product_issue' | 'unknown' | 'other';
export type InventoryTransactionType = 'purchase' | 'sale' | 'damaged' | 'adjustment' | 'dispenser_install';
export type DispenserStatus = 'active' | 'replaced' | 'removed';
export type DispenserReplaceReason = 'damaged' | 'malfunction' | 'upgrade' | 'lost' | 'other';
export type ConsumptionStatus = 'insufficient_data' | 'healthy' | 'approaching' | 'overdue';

export type ActivityType = string;
export type ActivityStatus = 'pending' | 'completed' | 'partially_completed';

export interface ActivityTask {
  id: string;
  type: 'Dispenser Fitting' | 'Dispenser Service' | 'Delivery' | string;
  status: 'pending' | 'completed';
  remarks?: string;
  completedAt?: string | null;
  completedBy?: string;
  assignedTo?: string;
  dispenserCount?: number;
  costPerDispenser?: number;
  totalDispenserCost?: number;
  serviceCost?: number;
}

export interface Activity {
  id: string;
  groupId?: string;
  canonicalKey?: string;
  allDocIds?: string[];
  underlyingDocIds?: string[];
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  dueDate: string; // YYYY-MM-DD
  status: ActivityStatus;
  remarks?: string; // Overall visit remarks
  tasks?: ActivityTask[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  createdBy?: string;
  completedBy?: string;
  assignedTo?: string;

  // Dispenser details
  dispenserCount?: number;
  costPerDispenser?: number;
  totalDispenserCost?: number;
  serviceCost?: number;
  
  // Legacy / backwards compatibility fields:
  activityType?: ActivityType;
  activityTypes?: string[];
  type?: ActivityType;
}

export interface BusinessSettings {
  id?: string;
  businessName: string;
  shortName?: string;
  tagline?: string; // e.g. 'BAAMC'
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  isGstRegistered?: boolean; // GST Registered: ON/OFF
  gstin: string;
  gstRate: number; // e.g. 18
  cgstRate?: number; // e.g. 9
  sgstRate?: number; // e.g. 9
  state?: string; // e.g. 'Kerala'
  stateCode?: string; // e.g. '32'
  placeOfSupply?: string; // e.g. 'Kerala (32)'
  authorizedSignatory?: string; // e.g. 'Sinan Abdulatif'
  invoicePrefix: string; // GST Invoice Prefix, e.g. 'PURIT/00/'
  currentGstInvoiceNumber?: string; // e.g. 'PURIT/00/12'
  nonGstInvoicePrefix?: string; // e.g. 'NON-GST/'
  currentNonGstInvoiceNumber?: string; // e.g. 'NON-GST/000'
  invoiceNextNumber?: number; // Legacy sequence counter
  invoiceFooter: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  currency: string; // '₹'
  dashboardPassword?: string; // e.g. '1075'
  updatedAt?: string;
}

export interface Customer {
  id: string;
  restaurantName: string;
  legalName?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  billingAddress?: string;
  state?: string;
  stateCode?: string;
  gstEnabled: boolean;
  gstin?: string;
  notes?: string;
  status: CustomerStatus;
  lostReason?: LostReason;
  lostNotes?: string;
  totalInvoicedSales: number;
  totalPaid: number;
  totalPending: number;
  totalProfit: number;
  totalHandwashPurchased: number; // in Liters
  totalTissuePurchased: number; // in packs
  dispensersCount: number;
  latestPurchaseDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductType;
  unit: UnitType;
  currentStock: number;
  reorderLevel: number;
  makingCost: number; // Weighted average cost per unit
  defaultSellingPrice: number;
  supplier?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: InventoryTransactionType;
  quantityChange: number; // positive or negative
  unitCost: number;
  previousStock: number;
  newStock: number;
  referenceId?: string; // saleId or purchaseId
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  category: ProductType;
  quantity: number;
  unit: UnitType;
  unitCost: number; // Snapshot of cost at sale time
  unitSellingPrice: number;
  discount: number;
  totalBeforeGst: number;
  lineProfit: number; // (unitSellingPrice - discount/qty - unitCost) * qty
  createdAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerLegalName?: string;
  customerPhone: string;
  customerAddress: string;
  customerBillingAddress?: string;
  customerState?: string;
  customerStateCode?: string;
  placeOfSupply?: string;
  customerGstin?: string;
  gstEnabled: boolean;
  saleDate: string;
  subtotal: number; // Sum of items before GST
  discount: number;
  gstRate: number; // e.g. 18
  gstAmount: number;
  invoiceTotal: number; // Subtotal - discount + gstAmount
  oldDue: number; // Outstanding due of customer before this invoice
  totalDueWithOldDue: number; // invoiceTotal + oldDue
  paidAmount: number;
  pendingAmount: number; // invoiceTotal - paidAmount
  paymentStatus: PaymentStatus;
  grossProfit: number; // Total profit before expenses & GST
  notes?: string;
  isDispenserOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  saleId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title?: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string;
  referenceNumber?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface Dispenser {
  id: string;
  customerId: string;
  customerName: string;
  model: string;
  installedQuantity: number;
  installationDate: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
  status: DispenserStatus;
  createdAt: string;
}

export interface DispenserReplacement {
  id: string;
  dispenserId: string;
  customerId: string;
  customerName: string;
  replacementDate: string;
  model: string;
  quantity: number;
  reason: DispenserReplaceReason;
  unitCost: number;
  notes?: string;
  createdAt: string;
}

export interface ConsumptionIntelligence {
  customerId: string;
  productCategory: 'handwash' | 'tissue';
  purchaseCount: number;
  latestPurchaseDate: string | null;
  latestQuantity: number;
  previousPurchaseDate: string | null;
  previousQuantity: number;
  elapsedDays: number | null;
  consumptionRatePerDay: number | null; // quantity consumed per day
  consumptionRateDisplay: string; // e.g. "1 L / 2 days" or "1 pack / 3 days"
  estimatedDurationDays: number | null; // estimated days latest quantity will last
  expectedNextPurchaseDate: string | null; // YYYY-MM-DD
  status: ConsumptionStatus;
  daysRemaining: number | null; // positive if in future
  daysOverdue: number | null; // positive if past expected date
  badgeText: string;
}

export interface CustomerRepurchaseSummary {
  customer: Customer;
  handwash: ConsumptionIntelligence;
  tissue: ConsumptionIntelligence;
  overallRepurchaseStatus: ConsumptionStatus;
  nextUrgentDate: string | null;
  daysUntilUrgent: number | null;
}

export type DateFilterType = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}
