import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection, cleanForFirestore } from '../lib/firebase';
import { 
  Activity,
  ActivityStatus,
  ActivityTask,
  ActivityType,
  BusinessSettings, 
  Customer, 
  CustomerRepurchaseSummary, 
  DateFilterType, 
  DateRange, 
  Dispenser, 
  DispenserReplacement, 
  Expense, 
  InventoryTransaction, 
  Payment, 
  Product, 
  Sale, 
  SaleItem 
} from '../types';
import {
  groupActivitiesByRestaurantAndDate,
  normalizeTasksFromActivity,
  calculateVisitStatus,
  normalizeTaskTypeName,
  getCustomerCanonicalKey,
  normalizeDueDate
} from '../lib/activityUtils';
import { 
  initialActivities,
  initialBusinessSettings, 
  initialCustomers, 
  initialDispensers, 
  initialDispenserReplacements, 
  initialExpenses, 
  initialProducts, 
  initialSales, 
  initialSaleItems, 
  initialPayments 
} from '../lib/seedData';
import { calculateConsumption, getOverallRepurchaseStatus } from '../lib/consumptionEngine';
import { getDateRange, getTodayString } from '../lib/dateUtils';
import { getNextInvoiceNumber } from '../lib/invoiceNumbering';
import confetti from 'canvas-confetti';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Data
  settings: BusinessSettings;
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  payments: Payment[];
  expenses: Expense[];
  dispensers: Dispenser[];
  dispenserReplacements: DispenserReplacement[];
  activities: Activity[];
  inventoryTransactions: InventoryTransaction[];
  isLoading: boolean;

  // Repurchase intelligence
  customerRepurchaseMap: Map<string, CustomerRepurchaseSummary>;
  overdueCustomers: CustomerRepurchaseSummary[];
  dueSoonCustomers: CustomerRepurchaseSummary[];

  // Navigation & UI state
  activeTab: 'activities' | 'dashboard' | 'sales' | 'customers' | 'inventory' | 'dispensers' | 'expenses' | 'reports' | 'settings';
  setActiveTab: (tab: 'activities' | 'dashboard' | 'sales' | 'customers' | 'inventory' | 'dispensers' | 'expenses' | 'reports' | 'settings') => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  dateFilter: DateFilterType;
  setDateFilter: (filter: DateFilterType) => void;
  customDateRange: DateRange;
  setCustomDateRange: (range: DateRange) => void;
  activeDateRange: DateRange;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Dashboard Protection
  isDashboardUnlocked: boolean;
  unlockDashboard: (pin: string) => boolean;
  lockDashboard: () => void;
  isDashboardAuthModalOpen: boolean;
  setIsDashboardAuthModalOpen: (open: boolean) => void;

  // Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalInvoicedSales' | 'totalPaid' | 'totalPending' | 'totalProfit' | 'totalHandwashPurchased' | 'totalTissuePurchased' | 'dispensersCount'>) => Promise<string>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<boolean>;
  
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>;
  addStock: (productId: string, quantity: number, unitCost: number, notes?: string) => Promise<void>;
  adjustStock: (productId: string, newStock: number, type: 'damaged' | 'adjustment', notes?: string) => Promise<void>;

  createSale: (
    saleData: {
      customerId: string;
      saleDate: string;
      notes?: string;
      discount?: number;
      isDispenserOnly?: boolean;
      gstEnabled?: boolean;
    },
    items: {
      productId: string;
      quantity: number;
      unitSellingPrice: number;
      discount?: number;
    }[],
    initialPayment?: {
      amount: number;
      paymentMethod: any;
      referenceNumber?: string;
      notes?: string;
    }
  ) => Promise<Sale>;

  addPayment: (
    saleId: string,
    amount: number,
    paymentMethod: any,
    paymentDate: string,
    referenceNumber?: string,
    notes?: string
  ) => Promise<void>;

  cancelSale: (saleId: string, reason?: string) => Promise<void>;

  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addDispenser: (dispenser: Omit<Dispenser, 'id' | 'createdAt'>) => Promise<string>;
  addDispenserReplacement: (replacement: Omit<DispenserReplacement, 'id' | 'createdAt'>) => Promise<string>;

  // Activity Actions
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'completedAt'> & { status?: ActivityStatus }) => Promise<string>;
  updateActivity: (id: string, data: Partial<Activity>) => Promise<void>;
  toggleActivityTask: (activityId: string, taskId: string, forceStatus?: 'pending' | 'completed') => Promise<void>;
  markActivityFinished: (id: string, completedBy?: string) => Promise<void>;
  reopenActivity: (id: string) => Promise<void>;
  deleteActivityTask: (activityId: string, taskId: string) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  resetToDemoData: () => Promise<void>;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Modals helpers
  isNewSaleModalOpen: boolean;
  setIsNewSaleModalOpen: (open: boolean) => void;
  isAddCustomerModalOpen: boolean;
  setIsAddCustomerModalOpen: (open: boolean) => void;
  isAddProductModalOpen: boolean;
  setIsAddProductModalOpen: (open: boolean) => void;
  isAddExpenseModalOpen: boolean;
  setIsAddExpenseModalOpen: (open: boolean) => void;
  isAddStockModalOpen: boolean;
  setIsAddStockModalOpen: (open: boolean) => void;
  selectedProductForStock: Product | null;
  setSelectedProductForStock: (p: Product | null) => void;
  isAddPaymentModalOpen: boolean;
  setIsAddPaymentModalOpen: (open: boolean) => void;
  selectedSaleForPayment: Sale | null;
  setSelectedSaleForPayment: (s: Sale | null) => void;

  // Activity Modals
  isAddActivityModalOpen: boolean;
  setIsAddActivityModalOpen: (open: boolean) => void;
  selectedActivityType: ActivityType | null;
  setSelectedActivityType: (t: ActivityType | null) => void;
  selectedActivityForEdit: Activity | null;
  setSelectedActivityForEdit: (a: Activity | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const VALID_TABS = ['activities', 'dashboard', 'sales', 'customers', 'inventory', 'dispensers', 'expenses', 'reports', 'settings'] as const;
type TabType = typeof VALID_TABS[number];

function getInitialTab(): TabType {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase() as TabType;
    if (VALID_TABS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('purit_active_tab') as TabType;
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  }
  return 'activities';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings>(initialBusinessSettings);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customersRef = useRef<Customer[]>([]);
  customersRef.current = customers;
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [dispenserReplacements, setDispenserReplacements] = useState<DispenserReplacement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const rawActivitiesRef = useRef<Activity[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Navigation & UI state - Persisted across page refreshes
  const [activeTab, setActiveTabState] = useState<TabType>(getInitialTab);

  const [selectedCustomerId, setSelectedCustomerIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hashStr = window.location.hash;
      if (hashStr.includes('id=')) {
        const match = hashStr.match(/id=([^&]+)/);
        if (match && match[1]) return decodeURIComponent(match[1]);
      }
      const searchStr = window.location.search;
      if (searchStr.includes('id=')) {
        const match = searchStr.match(/id=([^&]+)/);
        if (match && match[1]) return decodeURIComponent(match[1]);
      }
      return localStorage.getItem('purit_selected_customer_id') || null;
    }
    return null;
  });

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('purit_active_tab', tab);
        const currentCustId = localStorage.getItem('purit_selected_customer_id');
        if (tab === 'customers' && currentCustId) {
          window.history.replaceState(null, '', `#customers?id=${encodeURIComponent(currentCustId)}`);
        } else {
          window.history.replaceState(null, '', `#${tab}`);
        }
      } catch {}
    }
  }, []);

  const setSelectedCustomerId = useCallback((id: string | null) => {
    setSelectedCustomerIdState(id);
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem('purit_selected_customer_id', id);
          setActiveTabState('customers');
          localStorage.setItem('purit_active_tab', 'customers');
          const targetHash = `#customers?id=${encodeURIComponent(id)}`;
          if (window.location.hash !== targetHash) {
            window.location.hash = targetHash;
          }
        } else {
          localStorage.removeItem('purit_selected_customer_id');
          if (window.location.hash.includes('id=')) {
            window.location.hash = 'customers';
          }
        }
      } catch {}
    }
  }, []);

  // Synchronize hash changes and maintain active tab & selected customer on refresh
  useEffect(() => {
    const handleHashChange = () => {
      const hashStr = window.location.hash.replace(/^#\/?/, '');
      const tabPart = hashStr.split('?')[0].toLowerCase() as TabType;

      const match = hashStr.match(/id=([^&]+)/);
      if (match && match[1]) {
        const custId = decodeURIComponent(match[1]);
        setSelectedCustomerIdState(custId);
        try { localStorage.setItem('purit_selected_customer_id', custId); } catch {}
      } else {
        setSelectedCustomerIdState(null);
        try { localStorage.removeItem('purit_selected_customer_id'); } catch {}
      }

      if (VALID_TABS.includes(tabPart)) {
        setActiveTabState(prev => {
          if (prev !== tabPart) {
            try {
              localStorage.setItem('purit_active_tab', tabPart);
            } catch {}
            return tabPart;
          }
          return prev;
        });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (typeof window !== 'undefined' && !window.location.hash) {
      const currentCustId = localStorage.getItem('purit_selected_customer_id');
      if (activeTab === 'customers' && currentCustId) {
        window.history.replaceState(null, '', `#customers?id=${encodeURIComponent(currentCustId)}`);
      } else {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('this_month');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: getTodayString(),
    endDate: getTodayString(),
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dashboard Security State (Password Protected)
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState<boolean>(false);
  const [isDashboardAuthModalOpen, setIsDashboardAuthModalOpen] = useState<boolean>(false);

  // Modals state
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);

  // Activity Modals
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null);
  const [selectedActivityForEdit, setSelectedActivityForEdit] = useState<Activity | null>(null);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Compute active date range
  const activeDateRange = useMemo(() => {
    return getDateRange(dateFilter, customDateRange);
  }, [dateFilter, customDateRange]);

  // Connect to Firestore on mount
  useEffect(() => {
    testConnection();

    // Check if Firestore has data, otherwise seed or listen
    let unsubSettings: (() => void) | undefined;
    let unsubCustomers: (() => void) | undefined;
    let unsubProducts: (() => void) | undefined;
    let unsubSales: (() => void) | undefined;
    let unsubSaleItems: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;
    let unsubExpenses: (() => void) | undefined;
    let unsubDispensers: (() => void) | undefined;
    let unsubReplacements: (() => void) | undefined;
    let unsubActivities: (() => void) | undefined;
    let unsubInvTrans: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        // 1. Settings listener
        unsubSettings = onSnapshot(doc(db, 'businessSettings', 'main'), (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as BusinessSettings);
          } else {
            // Write default settings to firestore
            setDoc(doc(db, 'businessSettings', 'main'), cleanForFirestore(initialBusinessSettings)).catch(() => {});
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'businessSettings/main');
        });

        // 2. Customers listener
        unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
            // Sort by latest purchase date or created date descending
            list.sort((a, b) => {
              const dateA = a.latestPurchaseDate || a.createdAt;
              const dateB = b.latestPurchaseDate || b.createdAt;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            customersRef.current = list;
            setCustomers(list);
            if (rawActivitiesRef.current && rawActivitiesRef.current.length > 0) {
              setActivities(groupActivitiesByRestaurantAndDate(rawActivitiesRef.current, list));
            }
          } else {
            // Populate initial customers if empty
            bootstrapInitialData();
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'customers');
        });

        // 3. Products listener
        unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            setProducts(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'products');
        });

        // 4. Sales listener
        unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
            list.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
            setSales(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'sales');
        });

        // 5. SaleItems listener
        unsubSaleItems = onSnapshot(collection(db, 'saleItems'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SaleItem));
            setSaleItems(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'saleItems');
        });

        // 6. Payments listener
        unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
            list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            setPayments(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'payments');
        });

        // 7. Expenses listener
        unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExpenses(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'expenses');
        });

        // 8. Dispensers listener
        unsubDispensers = onSnapshot(collection(db, 'dispensers'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dispenser));
            setDispensers(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'dispensers');
        });

        // 9. Dispenser Replacements listener
        unsubReplacements = onSnapshot(collection(db, 'dispenserReplacements'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DispenserReplacement));
            setDispenserReplacements(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'dispenserReplacements');
        });

        // 10. Activities listener
        unsubActivities = onSnapshot(collection(db, 'activities'), (snapshot) => {
          if (!snapshot.empty) {
            // Deduplicate by ID
            const map = new Map<string, Activity>();
            snapshot.docs.forEach(d => {
              map.set(d.id, { id: d.id, ...d.data() } as Activity);
            });
            const rawList = Array.from(map.values());
            rawActivitiesRef.current = rawList;
            const groupedList = groupActivitiesByRestaurantAndDate(rawList, customersRef.current);
            setActivities(groupedList);
          } else {
            rawActivitiesRef.current = [];
            setActivities([]);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'activities');
        });

        // 11. Inventory Transactions listener
        unsubInvTrans = onSnapshot(collection(db, 'inventoryTransactions'), (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setInventoryTransactions(list);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'inventoryTransactions');
        });

        setIsLoading(false);
      } catch (e) {
        console.error("Firestore setup error:", e);
        setIsLoading(false);
      }
    };

    setupListeners();

    return () => {
      unsubSettings?.();
      unsubCustomers?.();
      unsubProducts?.();
      unsubSales?.();
      unsubSaleItems?.();
      unsubPayments?.();
      unsubExpenses?.();
      unsubDispensers?.();
      unsubReplacements?.();
      unsubActivities?.();
      unsubInvTrans?.();
    };
  }, []);

  // Bootstrap initial sample data if DB is blank
  const bootstrapInitialData = async () => {
    try {
      const batch = writeBatch(db);
      
      // Settings
      batch.set(doc(db, 'businessSettings', 'main'), cleanForFirestore(initialBusinessSettings));
      
      // Products
      initialProducts.forEach(p => {
        batch.set(doc(db, 'products', p.id), cleanForFirestore(p));
      });

      // Customers
      initialCustomers.forEach(c => {
        batch.set(doc(db, 'customers', c.id), cleanForFirestore(c));
      });

      // Sales
      initialSales.forEach(s => {
        batch.set(doc(db, 'sales', s.id), cleanForFirestore(s));
      });

      // SaleItems
      initialSaleItems.forEach(si => {
        batch.set(doc(db, 'saleItems', si.id), cleanForFirestore(si));
      });

      // Payments
      initialPayments.forEach(pay => {
        batch.set(doc(db, 'payments', pay.id), cleanForFirestore(pay));
      });

      // Expenses
      initialExpenses.forEach(exp => {
        batch.set(doc(db, 'expenses', exp.id), cleanForFirestore(exp));
      });

      // Dispensers
      initialDispensers.forEach(disp => {
        batch.set(doc(db, 'dispensers', disp.id), cleanForFirestore(disp));
      });

      // Replacements
      initialDispenserReplacements.forEach(rep => {
        batch.set(doc(db, 'dispenserReplacements', rep.id), cleanForFirestore(rep));
      });

      // Activities
      initialActivities.forEach(act => {
        batch.set(doc(db, 'activities', act.id), cleanForFirestore(act));
      });

      await batch.commit();
      console.log("Bootstrap sample data loaded into Firestore.");
    } catch (err) {
      console.warn("Bootstrap error:", err);
    }
  };

  const resetToDemoData = async () => {
    setIsLoading(true);
    await bootstrapInitialData();
    setIsLoading(false);
    showToast("PURIT database reset to demo dataset successfully!", "success");
  };

  // Pre-calculate Consumption & Repurchase Intelligence for all customers
  const customerRepurchaseMap = useMemo(() => {
    const map = new Map<string, CustomerRepurchaseSummary>();

    customers.forEach(customer => {
      const handwash = calculateConsumption(customer.id, 'handwash', sales, saleItems);
      const tissue = calculateConsumption(customer.id, 'tissue', sales, saleItems);
      const overall = getOverallRepurchaseStatus(handwash, tissue);

      map.set(customer.id, {
        customer,
        handwash,
        tissue,
        overallRepurchaseStatus: overall.status,
        nextUrgentDate: overall.mostUrgentDate,
        daysUntilUrgent: overall.mostUrgentDays,
      });
    });

    return map;
  }, [customers, sales, saleItems]);

  // Overdue customers list (for "Who to Contact Today" widget)
  const overdueCustomers = useMemo(() => {
    const list: CustomerRepurchaseSummary[] = Array.from(customerRepurchaseMap.values());
    return list.filter(
      item => item.customer.status !== 'lost' && item.overallRepurchaseStatus === 'overdue'
    );
  }, [customerRepurchaseMap]);

  // Due Soon customers list
  const dueSoonCustomers = useMemo(() => {
    const list: CustomerRepurchaseSummary[] = Array.from(customerRepurchaseMap.values());
    return list.filter(
      item => item.customer.status !== 'lost' && item.overallRepurchaseStatus === 'approaching'
    );
  }, [customerRepurchaseMap]);

  // CRUD for Customers
  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalInvoicedSales' | 'totalPaid' | 'totalPending' | 'totalProfit' | 'totalHandwashPurchased' | 'totalTissuePurchased' | 'dispensersCount'>): Promise<string> => {
    const id = `cust-${Date.now()}`;
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...data,
      id,
      totalInvoicedSales: 0,
      totalPaid: 0,
      totalPending: 0,
      totalProfit: 0,
      totalHandwashPurchased: 0,
      totalTissuePurchased: 0,
      dispensersCount: 0,
      latestPurchaseDate: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'customers', id), cleanForFirestore(newCustomer));
      setCustomers(prev => [newCustomer, ...prev]);
      showToast(`Customer "${newCustomer.restaurantName}" added successfully!`);
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `customers/${id}`);
      throw e;
    }
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    try {
      const updatePayload = cleanForFirestore({
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'customers', id), updatePayload);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatePayload } : c));
      showToast("Customer profile updated.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `customers/${id}`);
      throw e;
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    // Check if customer has confirmed sales
    const hasSales = sales.some(s => s.customerId === id && s.paymentStatus !== 'cancelled');
    if (hasSales) {
      showToast("Cannot delete customer with active sales invoices. Mark as 'Lost' instead.", "error");
      return false;
    }

    try {
      await deleteDoc(doc(db, 'customers', id));
      setCustomers(prev => prev.filter(c => c.id !== id));
      showToast("Customer removed.");
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `customers/${id}`);
      throw e;
    }
  };

  // CRUD for Products
  const addProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `prod-${Date.now()}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'products', id), cleanForFirestore(newProduct));
      setProducts(prev => [...prev, newProduct]);
      showToast(`Product "${newProduct.name}" added to catalog.`);
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `products/${id}`);
      throw e;
    }
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      const updatePayload = cleanForFirestore({
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'products', id), updatePayload);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatePayload } : p));
      showToast("Product updated.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `products/${id}`);
      throw e;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast("Product deleted from catalog.");
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
      throw e;
    }
  };

  // Inventory Stock Add with Weighted Average Cost calculation
  const addStock = async (productId: string, quantity: number, unitCost: number, notes?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const oldStock = Math.max(0, product.currentStock);
    const oldCost = product.makingCost;
    const newStock = oldStock + quantity;

    // Weighted Average Cost formula
    const newMakingCost = newStock > 0 
      ? ((oldStock * oldCost) + (quantity * unitCost)) / newStock
      : unitCost;

    const transactionId = `txn-${Date.now()}`;
    const now = new Date().toISOString();

    const transaction: InventoryTransaction = {
      id: transactionId,
      productId,
      productName: product.name,
      type: 'purchase',
      quantityChange: quantity,
      unitCost,
      previousStock: oldStock,
      newStock,
      notes: notes || `Stock added: +${quantity} ${product.unit}`,
      createdAt: now,
    };

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'products', productId), cleanForFirestore({
        currentStock: newStock,
        makingCost: Math.round((newMakingCost + Number.EPSILON) * 100) / 100,
        updatedAt: now,
      }));
      batch.set(doc(db, 'inventoryTransactions', transactionId), cleanForFirestore(transaction));

      await batch.commit();
      showToast(`Added ${quantity} ${product.unit} to ${product.name}. Stock: ${newStock}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `inventoryTransactions/${transactionId}`);
      throw e;
    }
  };

  const adjustStock = async (productId: string, newStock: number, type: 'damaged' | 'adjustment', notes?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const oldStock = product.currentStock;
    const quantityChange = newStock - oldStock;
    const transactionId = `txn-${Date.now()}`;
    const now = new Date().toISOString();

    const transaction: InventoryTransaction = {
      id: transactionId,
      productId,
      productName: product.name,
      type,
      quantityChange,
      unitCost: product.makingCost,
      previousStock: oldStock,
      newStock,
      notes: notes || `Stock adjusted from ${oldStock} to ${newStock} (${type})`,
      createdAt: now,
    };

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'products', productId), cleanForFirestore({
        currentStock: newStock,
        updatedAt: now,
      }));
      batch.set(doc(db, 'inventoryTransactions', transactionId), cleanForFirestore(transaction));

      await batch.commit();
      showToast(`Stock updated for ${product.name}: ${newStock} ${product.unit}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `inventoryTransactions/${transactionId}`);
      throw e;
    }
  };

  // Create New Sale Flow
  const createSale = async (
    saleData: {
      customerId: string;
      saleDate: string;
      notes?: string;
      discount?: number;
      isDispenserOnly?: boolean;
      gstEnabled?: boolean;
    },
    items: {
      productId: string;
      quantity: number;
      unitSellingPrice: number;
      discount?: number;
    }[],
    initialPayment?: {
      amount: number;
      paymentMethod: any;
      referenceNumber?: string;
      notes?: string;
    }
  ): Promise<Sale> => {
    const customer = customers.find(c => c.id === saleData.customerId);
    if (!customer) throw new Error("Customer not found");

    const now = new Date().toISOString();
    const saleId = `sale-${Date.now()}`;
    // Independent Sequential Invoice Numbering
    // GST invoices increment ONLY currentGstInvoiceNumber
    // Non-GST invoices increment ONLY currentNonGstInvoiceNumber
    const isGstInvoice = saleData.gstEnabled !== undefined
      ? saleData.gstEnabled
      : (customer.gstEnabled && (settings.isGstRegistered !== false));

    let invoiceNumber: string;
    let settingsUpdatePayload: Partial<BusinessSettings> = {};

    if (isGstInvoice) {
      const currentGst = settings.currentGstInvoiceNumber || `${settings.invoicePrefix || 'PURIT/00/'}12`;
      invoiceNumber = getNextInvoiceNumber(currentGst, settings.invoicePrefix || 'PURIT/00/', '12');
      settingsUpdatePayload = {
        currentGstInvoiceNumber: invoiceNumber,
        updatedAt: now,
      };
    } else {
      const currentNonGst = settings.currentNonGstInvoiceNumber || `${settings.nonGstInvoicePrefix || 'NON-GST/'}000`;
      invoiceNumber = getNextInvoiceNumber(currentNonGst, settings.nonGstInvoicePrefix || 'NON-GST/', '000');
      settingsUpdatePayload = {
        currentNonGstInvoiceNumber: invoiceNumber,
        updatedAt: now,
      };
    }

    // Line items calculation
    let subtotal = 0;
    let totalGrossProfit = 0;
    let handwashQty = 0;
    let tissueQty = 0;

    const lineItemsToSave: SaleItem[] = [];
    const inventoryUpdates: { productId: string; newStock: number; transaction: InventoryTransaction }[] = [];

    items.forEach((itemInput, idx) => {
      const product = products.find(p => p.id === itemInput.productId);
      if (!product) return;

      const itemDisc = itemInput.discount || 0;
      const lineTotalBeforeGst = (itemInput.quantity * itemInput.unitSellingPrice) - itemDisc;
      const unitCost = product.makingCost;
      const lineProfit = lineTotalBeforeGst - (itemInput.quantity * unitCost);

      subtotal += lineTotalBeforeGst;
      totalGrossProfit += lineProfit;

      if (product.category === 'handwash') handwashQty += itemInput.quantity;
      if (product.category === 'tissue') tissueQty += itemInput.quantity;

      const itemId = `si-${Date.now()}-${idx}`;
      lineItemsToSave.push({
        id: itemId,
        saleId,
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: itemInput.quantity,
        unit: product.unit,
        unitCost,
        unitSellingPrice: itemInput.unitSellingPrice,
        discount: itemDisc,
        totalBeforeGst: lineTotalBeforeGst,
        lineProfit,
        createdAt: now,
      });

      // Prepare inventory deduction
      const newStock = Math.max(0, product.currentStock - itemInput.quantity);
      inventoryUpdates.push({
        productId: product.id,
        newStock,
        transaction: {
          id: `txn-${Date.now()}-${idx}`,
          productId: product.id,
          productName: product.name,
          type: 'sale',
          quantityChange: -itemInput.quantity,
          unitCost,
          previousStock: product.currentStock,
          newStock,
          referenceId: saleId,
          notes: `Sold on invoice #${invoiceNumber}`,
          createdAt: now,
        },
      });
    });

    const saleDiscount = saleData.discount || 0;
    const discountedSubtotal = Math.max(0, subtotal - saleDiscount);
    const gstRate = isGstInvoice ? (settings.gstRate || 18) : 0;
    const gstAmount = isGstInvoice
      ? Math.round(((discountedSubtotal * gstRate) / 100 + Number.EPSILON) * 100) / 100
      : 0;
    const invoiceTotal = discountedSubtotal + gstAmount;

    // Automatic calculation of Old Due from previous unpaid sales
    const oldDue = customer.totalPending || 0;
    const totalDueWithOldDue = invoiceTotal + oldDue;

    const initialPaid = Math.min(invoiceTotal, initialPayment?.amount || 0);
    const pendingAmount = invoiceTotal - initialPaid;

    let paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
    if (initialPaid >= invoiceTotal) {
      paymentStatus = 'paid';
    } else if (initialPaid > 0) {
      paymentStatus = 'partially_paid';
    }

    const newSale: Sale = {
      id: saleId,
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.restaurantName,
      customerLegalName: customer.legalName || customer.restaurantName,
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      customerBillingAddress: customer.billingAddress || customer.address || '',
      customerState: customer.state || settings.state || 'Kerala',
      customerStateCode: customer.stateCode || settings.stateCode || '32',
      placeOfSupply: customer.state ? `${customer.state} (${customer.stateCode || '32'})` : (settings.placeOfSupply || `${settings.state || 'Kerala'} (${settings.stateCode || '32'})`),
      customerGstin: isGstInvoice ? (customer.gstin || '') : '',
      gstEnabled: isGstInvoice,
      saleDate: saleData.saleDate || getTodayString(),
      subtotal,
      discount: saleDiscount,
      gstRate,
      gstAmount,
      invoiceTotal,
      oldDue,
      totalDueWithOldDue,
      paidAmount: initialPaid,
      pendingAmount,
      paymentStatus,
      grossProfit: totalGrossProfit,
      notes: saleData.notes || '',
      isDispenserOnly: saleData.isDispenserOnly || false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const batch = writeBatch(db);

      // 1. Save Sale doc
      batch.set(doc(db, 'sales', saleId), cleanForFirestore(newSale));

      // 2. Save Sale Items
      lineItemsToSave.forEach(item => {
        batch.set(doc(db, 'saleItems', item.id), cleanForFirestore(item));
      });

      // 3. Update inventory & log transactions
      inventoryUpdates.forEach(inv => {
        batch.update(doc(db, 'products', inv.productId), cleanForFirestore({
          currentStock: inv.newStock,
          updatedAt: now,
        }));
        batch.set(doc(db, 'inventoryTransactions', inv.transaction.id), cleanForFirestore(inv.transaction));
      });

      // 4. Save Initial Payment if any
      if (initialPaid > 0 && initialPayment) {
        const paymentId = `pay-${Date.now()}`;
        const paymentRecord: Payment = {
          id: paymentId,
          saleId,
          invoiceNumber,
          customerId: customer.id,
          customerName: customer.restaurantName,
          amount: initialPaid,
          paymentDate: saleData.saleDate || getTodayString(),
          paymentMethod: initialPayment.paymentMethod || 'cash',
          referenceNumber: initialPayment.referenceNumber || '',
          notes: initialPayment.notes || 'Payment on sale confirmation',
          createdAt: now,
        };
        batch.set(doc(db, 'payments', paymentId), cleanForFirestore(paymentRecord));
      }

      // 5. Update Customer stats
      batch.update(doc(db, 'customers', customer.id), cleanForFirestore({
        totalInvoicedSales: (customer.totalInvoicedSales || 0) + invoiceTotal,
        totalPaid: (customer.totalPaid || 0) + initialPaid,
        totalPending: (customer.totalPending || 0) + pendingAmount,
        totalProfit: (customer.totalProfit || 0) + totalGrossProfit,
        totalHandwashPurchased: (customer.totalHandwashPurchased || 0) + handwashQty,
        totalTissuePurchased: (customer.totalTissuePurchased || 0) + tissueQty,
        latestPurchaseDate: saleData.saleDate || getTodayString(),
        status: 'active', // Active upon new purchase
        updatedAt: now,
      }));

      // 6. Update invoice sequence in settings (ONLY the relevant GST or Non-GST counter)
      batch.update(doc(db, 'businessSettings', 'main'), cleanForFirestore(settingsUpdatePayload));
      setSettings(prev => ({ ...prev, ...settingsUpdatePayload }));

      await batch.commit();

      // Confetti celebration
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}

      showToast(`Invoice #${invoiceNumber} confirmed successfully!`);
      return newSale;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sales/${saleId}`);
      throw e;
    }
  };

  // Add Payment Flow
  const addPayment = async (
    saleId: string,
    amount: number,
    paymentMethod: any,
    paymentDate: string,
    referenceNumber?: string,
    notes?: string
  ) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) throw new Error("Sale not found");

    const customer = customers.find(c => c.id === sale.customerId);
    const now = new Date().toISOString();
    const paymentId = `pay-${Date.now()}`;

    const newPaid = sale.paidAmount + amount;
    const newPending = Math.max(0, sale.invoiceTotal - newPaid);
    let newPaymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
    if (newPaid >= sale.invoiceTotal) {
      newPaymentStatus = 'paid';
    } else if (newPaid > 0) {
      newPaymentStatus = 'partially_paid';
    }

    const paymentRecord: Payment = {
      id: paymentId,
      saleId,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      amount,
      paymentDate: paymentDate || getTodayString(),
      paymentMethod,
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      createdAt: now,
    };

    try {
      const batch = writeBatch(db);

      // 1. Save payment record
      batch.set(doc(db, 'payments', paymentId), cleanForFirestore(paymentRecord));

      // 2. Update sale
      batch.update(doc(db, 'sales', saleId), cleanForFirestore({
        paidAmount: newPaid,
        pendingAmount: newPending,
        paymentStatus: newPaymentStatus,
        updatedAt: now,
      }));

      // 3. Update customer financial balance
      if (customer) {
        batch.update(doc(db, 'customers', customer.id), cleanForFirestore({
          totalPaid: (customer.totalPaid || 0) + amount,
          totalPending: Math.max(0, (customer.totalPending || 0) - amount),
          updatedAt: now,
        }));
      }

      await batch.commit();
      showToast(`Payment of ₹${amount.toLocaleString('en-IN')} recorded for Invoice #${sale.invoiceNumber}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `payments/${paymentId}`);
      throw e;
    }
  };

  // Cancel Sale (Void)
  const cancelSale = async (saleId: string, reason?: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const customer = customers.find(c => c.id === sale.customerId);
    const relatedItems = saleItems.filter(si => si.saleId === saleId);
    const now = new Date().toISOString();

    try {
      const batch = writeBatch(db);

      // 1. Mark sale as cancelled
      batch.update(doc(db, 'sales', saleId), cleanForFirestore({
        paymentStatus: 'cancelled',
        notes: `[CANCELLED] ${reason || ''} | ${sale.notes || ''}`,
        updatedAt: now,
      }));

      // 2. Restore inventory stock
      relatedItems.forEach((item, idx) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const restoredStock = product.currentStock + item.quantity;
          batch.update(doc(db, 'products', product.id), cleanForFirestore({
            currentStock: restoredStock,
            updatedAt: now,
          }));
          const txnId = `txn-void-${Date.now()}-${idx}`;
          batch.set(doc(db, 'inventoryTransactions', txnId), cleanForFirestore({
            id: txnId,
            productId: product.id,
            productName: product.name,
            type: 'adjustment',
            quantityChange: item.quantity,
            unitCost: item.unitCost,
            previousStock: product.currentStock,
            newStock: restoredStock,
            referenceId: saleId,
            notes: `Stock restored from cancelled invoice #${sale.invoiceNumber}`,
            createdAt: now,
          }));
        }
      });

      // 3. Deduct from customer invoiced totals
      if (customer) {
        batch.update(doc(db, 'customers', customer.id), cleanForFirestore({
          totalInvoicedSales: Math.max(0, (customer.totalInvoicedSales || 0) - sale.invoiceTotal),
          totalPaid: Math.max(0, (customer.totalPaid || 0) - sale.paidAmount),
          totalPending: Math.max(0, (customer.totalPending || 0) - sale.pendingAmount),
          totalProfit: Math.max(0, (customer.totalProfit || 0) - sale.grossProfit),
          updatedAt: now,
        }));
      }

      await batch.commit();
      showToast(`Invoice #${sale.invoiceNumber} has been cancelled and stock restored.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `sales/${saleId}`);
      throw e;
    }
  };

  // Expenses CRUD
  const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    const id = `exp-${Date.now()}`;
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...data,
      id,
      createdAt: now,
    };

    try {
      await setDoc(doc(db, 'expenses', id), cleanForFirestore(newExpense));
      setExpenses(prev => [newExpense, ...prev]);
      showToast(`Expense of ₹${data.amount.toLocaleString('en-IN')} added.`);
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `expenses/${id}`);
      throw e;
    }
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    try {
      const updatePayload = cleanForFirestore({
        ...data,
      });
      await updateDoc(doc(db, 'expenses', id), updatePayload);
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      showToast("Expense updated.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `expenses/${id}`);
      throw e;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
      setExpenses(prev => prev.filter(e => e.id !== id));
      showToast("Expense deleted.");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `expenses/${id}`);
      throw e;
    }
  };

  // Dispensers
  const addDispenser = async (data: Omit<Dispenser, 'id' | 'createdAt'>): Promise<string> => {
    const id = `disp-${Date.now()}`;
    const now = new Date().toISOString();
    const newDisp: Dispenser = {
      ...data,
      id,
      createdAt: now,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'dispensers', id), cleanForFirestore(newDisp));

      // Update customer dispenser count
      const customer = customers.find(c => c.id === data.customerId);
      if (customer) {
        batch.update(doc(db, 'customers', customer.id), cleanForFirestore({
          dispensersCount: (customer.dispensersCount || 0) + data.installedQuantity,
          updatedAt: now,
        }));
      }

      await batch.commit();
      showToast(`Installed ${data.installedQuantity} dispenser(s) at ${data.customerName}.`);
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `dispensers/${id}`);
      throw e;
    }
  };

  const addDispenserReplacement = async (data: Omit<DispenserReplacement, 'id' | 'createdAt'>): Promise<string> => {
    const id = `rep-${Date.now()}`;
    const now = new Date().toISOString();
    const newRep: DispenserReplacement = {
      ...data,
      id,
      createdAt: now,
    };

    try {
      await setDoc(doc(db, 'dispenserReplacements', id), cleanForFirestore(newRep));
      setDispenserReplacements(prev => [newRep, ...prev]);
      showToast(`Replacement record saved for ${data.customerName}.`);
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `dispenserReplacements/${id}`);
      throw e;
    }
  };

  // Activities Actions (ONE RESTAURANT + ONE DATE = ONE COMBINED OPERATIONAL CARD)
  const addActivity = async (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'completedAt'> & { status?: ActivityStatus }): Promise<string> => {
    const now = new Date().toISOString();
    const currentCustomers = customersRef.current || customers || [];
    const customer = currentCustomers.find(c => c.id === data.customerId);
    const custId = data.customerId || customer?.id || `adhoc-${Date.now()}`;
    const custName = data.customerName || customer?.restaurantName || 'Customer';
    const targetDueDate = normalizeDueDate(data.dueDate || getTodayString());
    const incomingTasks = normalizeTasksFromActivity(data as Activity);

    const targetCanonical = getCustomerCanonicalKey(custId, custName, currentCustomers);

    // Search RAW Firestore docs directly to avoid stale state or missing un-rendered state
    const existingRawDoc = (rawActivitiesRef.current || []).find((a) => {
      const aCanonical = getCustomerCanonicalKey(a.customerId, a.customerName, currentCustomers);
      return aCanonical.key === targetCanonical.key && normalizeDueDate(a.dueDate) === targetDueDate;
    });

    if (existingRawDoc) {
      const currentTasks = normalizeTasksFromActivity(existingRawDoc);
      const mergedTasks = [...currentTasks];

      incomingTasks.forEach(newTask => {
        const normType = normalizeTaskTypeName(newTask.type);
        const existingIdx = mergedTasks.findIndex(t => normalizeTaskTypeName(t.type) === normType);
        if (existingIdx >= 0) {
          if (newTask.remarks) {
            const oldRem = mergedTasks[existingIdx].remarks || '';
            if (!oldRem.includes(newTask.remarks)) {
              mergedTasks[existingIdx].remarks = oldRem ? `${oldRem}; ${newTask.remarks}` : newTask.remarks;
            }
          }
          if (newTask.status === 'pending') {
            mergedTasks[existingIdx].status = 'pending';
            mergedTasks[existingIdx].completedAt = null;
          }
        } else {
          const typeSlug = normType.toLowerCase().replace(/[^a-z0-9]/g, '-');
          mergedTasks.push({
            ...newTask,
            id: `task-${existingRawDoc.id}-${typeSlug}-${Date.now()}`,
            type: normType,
            status: 'pending',
          });
        }
      });

      const uniqueTypes = Array.from(new Set(mergedTasks.map(t => normalizeTaskTypeName(t.type))));
      const overallStatus = calculateVisitStatus(mergedTasks);

      const updatePayload: Partial<Activity> = {
        tasks: mergedTasks,
        status: overallStatus,
        activityType: uniqueTypes.join(' + '),
        activityTypes: uniqueTypes,
        type: uniqueTypes.join(' + '),
        updatedAt: now,
        dueDate: targetDueDate,
        customerPhone: data.customerPhone || existingRawDoc.customerPhone,
        customerAddress: data.customerAddress || existingRawDoc.customerAddress,
        assignedTo: data.assignedTo || existingRawDoc.assignedTo,
        remarks: data.remarks && !existingRawDoc.remarks?.includes(data.remarks)
          ? (existingRawDoc.remarks ? `${existingRawDoc.remarks} • ${data.remarks}` : data.remarks)
          : existingRawDoc.remarks,
        completedAt: overallStatus === 'completed' ? (existingRawDoc.completedAt || now) : null,
      };

      try {
        await updateDoc(doc(db, 'activities', existingRawDoc.id), cleanForFirestore(updatePayload));
        showToast(`Updated visit for ${custName}!`, 'success');
        return existingRawDoc.id;
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `activities/${existingRawDoc.id}`);
        throw e;
      }
    }

    // Create single primary document in Firestore
    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initialTasks: ActivityTask[] = incomingTasks.length > 0
      ? incomingTasks.map((t, idx) => {
          const normType = normalizeTaskTypeName(t.type);
          const typeSlug = normType.toLowerCase().replace(/[^a-z0-9]/g, '-');
          return {
            ...t,
            id: `task-${id}-${typeSlug}-${idx}`,
            type: normType,
          };
        })
      : [{
          id: `task-${id}-fitting-0`,
          type: normalizeTaskTypeName(data.activityType || 'Dispenser Fitting'),
          status: data.status === 'completed' ? 'completed' : 'pending',
          remarks: data.remarks,
        }];

    const overallStatus = calculateVisitStatus(initialTasks);
    const uniqueTypes = Array.from(new Set(initialTasks.map(t => normalizeTaskTypeName(t.type))));

    const newActivity: Activity = {
      ...data,
      id,
      customerId: custId,
      customerName: custName,
      customerPhone: data.customerPhone || customer?.phone,
      customerAddress: data.customerAddress || customer?.address,
      dueDate: targetDueDate,
      status: overallStatus,
      tasks: initialTasks,
      activityType: uniqueTypes.join(' + '),
      activityTypes: uniqueTypes,
      type: uniqueTypes.join(' + '),
      createdAt: now,
      updatedAt: now,
      completedAt: overallStatus === 'completed' ? now : null,
    };

    try {
      await setDoc(doc(db, 'activities', id), cleanForFirestore(newActivity));
      showToast("Visit scheduled successfully!");
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `activities/${id}`);
      throw e;
    }
  };

  const updateActivity = async (id: string, data: Partial<Activity>) => {
    try {
      const now = new Date().toISOString();
      const existingActivity = activities.find(a => a.id === id);
      
      let tasks = data.tasks;
      if (!tasks && existingActivity) {
        tasks = normalizeTasksFromActivity({ ...existingActivity, ...data });
      }

      const overallStatus = tasks ? calculateVisitStatus(tasks) : (data.status || 'pending');
      const uniqueTypes = tasks ? Array.from(new Set(tasks.map(t => normalizeTaskTypeName(t.type)))) : undefined;

      const updatePayload = cleanForFirestore({
        ...data,
        ...(tasks ? { tasks } : {}),
        ...(uniqueTypes ? { activityType: uniqueTypes.join(' + '), activityTypes: uniqueTypes, type: uniqueTypes.join(' + ') } : {}),
        status: overallStatus,
        updatedAt: now,
        completedAt: overallStatus === 'completed' ? (existingActivity?.completedAt || now) : null,
      });

      const docIdsToUpdate = existingActivity?.allDocIds && existingActivity.allDocIds.length > 0
        ? existingActivity.allDocIds
        : [id];

      await Promise.all(
        docIdsToUpdate.map(dId => updateDoc(doc(db, 'activities', dId), updatePayload))
      );
      showToast("Visit updated successfully.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `activities/${id}`);
      throw e;
    }
  };

  const toggleActivityTask = async (activityId: string, taskId: string, forceStatus?: 'pending' | 'completed') => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const currentTasks = normalizeTasksFromActivity(activity);
    const now = new Date().toISOString();
    let justCompletedAll = false;

    const updatedTasks = currentTasks.map(t => {
      if (t.id === taskId || (t.type && normalizeTaskTypeName(t.type) === normalizeTaskTypeName(taskId))) {
        const nextStatus = forceStatus || (t.status === 'completed' ? 'pending' : 'completed');
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? now : null,
        };
      }
      return t;
    });

    const overallStatus = calculateVisitStatus(updatedTasks);
    if (overallStatus === 'completed' && activity.status !== 'completed') {
      justCompletedAll = true;
    }

    const uniqueTypes = Array.from(new Set(updatedTasks.map(t => normalizeTaskTypeName(t.type))));

    const updatePayload: Partial<Activity> = {
      tasks: updatedTasks,
      status: overallStatus,
      activityType: uniqueTypes.join(' + '),
      activityTypes: uniqueTypes,
      type: uniqueTypes.join(' + '),
      completedAt: overallStatus === 'completed' ? now : null,
      updatedAt: now,
    };

    const docIdsToUpdate = activity.allDocIds && activity.allDocIds.length > 0
      ? activity.allDocIds
      : [activityId];

    try {
      await Promise.all(
        docIdsToUpdate.map(dId =>
          updateDoc(doc(db, 'activities', dId), cleanForFirestore(updatePayload))
        )
      );

      if (justCompletedAll) {
        try {
          confetti({
            particleCount: 65,
            spread: 70,
            origin: { y: 0.8 },
          });
        } catch {}
        showToast(`All tasks completed for ${activity.customerName}!`, 'success');
      } else {
        showToast(`Task status updated.`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `activities/${activityId}`);
      throw e;
    }
  };

  const markActivityFinished = async (id: string, completedBy?: string) => {
    try {
      const now = new Date().toISOString();
      const activity = activities.find(a => a.id === id);
      const currentTasks = activity ? normalizeTasksFromActivity(activity) : [];
      const completedTasks: ActivityTask[] = currentTasks.map(t => ({
        ...t,
        status: 'completed',
        completedAt: t.completedAt || now,
        completedBy: completedBy || 'Team Member',
      }));

      const updatePayload = cleanForFirestore({
        status: 'completed',
        tasks: completedTasks,
        completedAt: now,
        completedBy: completedBy || 'Team Member',
        updatedAt: now,
      });

      const docIdsToUpdate = activity?.allDocIds && activity.allDocIds.length > 0
        ? activity.allDocIds
        : [id];

      await Promise.all(
        docIdsToUpdate.map(dId => updateDoc(doc(db, 'activities', dId), updatePayload))
      );

      // Celebration
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.8 },
        });
      } catch {}

      showToast("Visit marked as finished! Great job.", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `activities/${id}`);
      throw e;
    }
  };

  const reopenActivity = async (id: string) => {
    try {
      const now = new Date().toISOString();
      const activity = activities.find(a => a.id === id);
      const currentTasks = activity ? normalizeTasksFromActivity(activity) : [];
      const pendingTasks: ActivityTask[] = currentTasks.map(t => ({
        ...t,
        status: 'pending',
        completedAt: null,
      }));

      const updatePayload = cleanForFirestore({
        status: 'pending',
        tasks: pendingTasks,
        completedAt: null,
        updatedAt: now,
      });

      const docIdsToUpdate = activity?.allDocIds && activity.allDocIds.length > 0
        ? activity.allDocIds
        : [id];

      await Promise.all(
        docIdsToUpdate.map(dId => updateDoc(doc(db, 'activities', dId), updatePayload))
      );

      showToast("Visit reopened and moved back to active list.", "info");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `activities/${id}`);
      throw e;
    }
  };

  const deleteActivityTask = async (activityId: string, taskId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const currentTasks = normalizeTasksFromActivity(activity);
    const remainingTasks = currentTasks.filter(
      t => t.id !== taskId && normalizeTaskTypeName(t.type) !== normalizeTaskTypeName(taskId)
    );

    if (remainingTasks.length === 0) {
      return deleteActivity(activityId);
    }

    const overallStatus = calculateVisitStatus(remainingTasks);
    const uniqueTypes = Array.from(new Set(remainingTasks.map(t => normalizeTaskTypeName(t.type))));
    const now = new Date().toISOString();

    const updatePayload: Partial<Activity> = {
      tasks: remainingTasks,
      status: overallStatus,
      activityType: uniqueTypes.join(' + '),
      activityTypes: uniqueTypes,
      type: uniqueTypes.join(' + '),
      updatedAt: now,
      completedAt: overallStatus === 'completed' ? (activity.completedAt || now) : null,
    };

    const docIdsToUpdate = activity.allDocIds && activity.allDocIds.length > 0
      ? activity.allDocIds
      : [activityId];

    try {
      await Promise.all(
        docIdsToUpdate.map(dId =>
          updateDoc(doc(db, 'activities', dId), cleanForFirestore(updatePayload))
        )
      );
      showToast("Task removed from visit.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `activities/${activityId}`);
      throw e;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const activity = activities.find(a => a.id === id);
      if (activity && Array.isArray(activity.allDocIds) && activity.allDocIds.length > 0) {
        await Promise.all(activity.allDocIds.map(docId => deleteDoc(doc(db, 'activities', docId))));
      } else {
        await deleteDoc(doc(db, 'activities', id));
      }
      showToast("Visit deleted.");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `activities/${id}`);
      throw e;
    }
  };

  // Dashboard Protection
  const unlockDashboard = (pin: string): boolean => {
    const correctPin = (settings.dashboardPassword || '1075').trim();
    if (pin.trim() === correctPin) {
      setIsDashboardUnlocked(true);
      setIsDashboardAuthModalOpen(false);
      showToast("Dashboard unlocked.", "success");
      return true;
    } else {
      showToast("Incorrect dashboard PIN / Password.", "error");
      return false;
    }
  };

  const lockDashboard = () => {
    setIsDashboardUnlocked(false);
    showToast("Dashboard locked.", "info");
  };

  // Business Settings
  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    try {
      const updatePayload = cleanForFirestore({
        ...newSettings,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'businessSettings', 'main'), updatePayload);
      setSettings(prev => ({ ...prev, ...updatePayload }));
      showToast("Business profile & settings updated.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `businessSettings/main`);
      throw e;
    }
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        customers,
        products,
        sales,
        saleItems,
        payments,
        expenses,
        dispensers,
        dispenserReplacements,
        activities,
        inventoryTransactions,
        isLoading,

        customerRepurchaseMap,
        overdueCustomers,
        dueSoonCustomers,

        activeTab,
        setActiveTab,
        selectedCustomerId,
        setSelectedCustomerId,
        dateFilter,
        setDateFilter,
        customDateRange,
        setCustomDateRange,
        activeDateRange,
        searchQuery,
        setSearchQuery,

        isDashboardUnlocked,
        unlockDashboard,
        lockDashboard,
        isDashboardAuthModalOpen,
        setIsDashboardAuthModalOpen,

        addCustomer,
        updateCustomer,
        deleteCustomer,

        addProduct,
        updateProduct,
        deleteProduct,
        addStock,
        adjustStock,

        createSale,
        addPayment,
        cancelSale,

        addExpense,
        updateExpense,
        deleteExpense,

        addDispenser,
        addDispenserReplacement,

        addActivity,
        updateActivity,
        toggleActivityTask,
        markActivityFinished,
        reopenActivity,
        deleteActivityTask,
        deleteActivity,

        updateSettings,
        resetToDemoData,

        toasts,
        showToast,
        removeToast,

        isNewSaleModalOpen,
        setIsNewSaleModalOpen,
        isAddCustomerModalOpen,
        setIsAddCustomerModalOpen,
        isAddProductModalOpen,
        setIsAddProductModalOpen,
        isAddExpenseModalOpen,
        setIsAddExpenseModalOpen,
        isAddStockModalOpen,
        setIsAddStockModalOpen,
        selectedProductForStock,
        setSelectedProductForStock,
        isAddPaymentModalOpen,
        setIsAddPaymentModalOpen,
        selectedSaleForPayment,
        setSelectedSaleForPayment,

        isAddActivityModalOpen,
        setIsAddActivityModalOpen,
        selectedActivityType,
        setSelectedActivityType,
        selectedActivityForEdit,
        setSelectedActivityForEdit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
