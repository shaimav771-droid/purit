import { ConsumptionIntelligence, Customer, ProductType, Sale, SaleItem } from '../types';
import { addDays, diffDays, getTodayString } from './dateUtils';

interface ProductPurchaseRecord {
  saleId: string;
  date: string;
  quantity: number;
  unit: string;
}

export function calculateConsumption(
  customerId: string,
  category: 'handwash' | 'tissue',
  sales: Sale[],
  saleItems: SaleItem[]
): ConsumptionIntelligence {
  const defaultUnit = category === 'handwash' ? 'L' : 'pack';
  
  // Filter sales for this customer that are active/confirmed (not cancelled)
  const validSaleIds = new Set(
    sales
      .filter(s => s.customerId === customerId && s.paymentStatus !== 'cancelled')
      .map(s => s.id)
  );

  // Group line items by saleId + category
  const salesMap = new Map<string, Sale>();
  sales.forEach(s => salesMap.set(s.id, s));

  // Find all items matching this category
  const matchingPurchasesMap = new Map<string, ProductPurchaseRecord>();

  saleItems.forEach(item => {
    if (validSaleIds.has(item.saleId) && item.category.toLowerCase() === category) {
      const sale = salesMap.get(item.saleId);
      if (!sale) return;

      const existing = matchingPurchasesMap.get(item.saleId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        matchingPurchasesMap.set(item.saleId, {
          saleId: item.saleId,
          date: sale.saleDate,
          quantity: item.quantity,
          unit: item.unit || defaultUnit,
        });
      }
    }
  });

  // Sort purchase records by date ascending
  const purchaseRecords = Array.from(matchingPurchasesMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const purchaseCount = purchaseRecords.length;

  if (purchaseCount === 0) {
    return {
      customerId,
      productCategory: category,
      purchaseCount: 0,
      latestPurchaseDate: null,
      latestQuantity: 0,
      previousPurchaseDate: null,
      previousQuantity: 0,
      elapsedDays: null,
      consumptionRatePerDay: null,
      consumptionRateDisplay: 'No purchase history',
      estimatedDurationDays: null,
      expectedNextPurchaseDate: null,
      status: 'insufficient_data',
      daysRemaining: null,
      daysOverdue: null,
      badgeText: 'No purchase history',
    };
  }

  if (purchaseCount === 1) {
    const latest = purchaseRecords[0];
    return {
      customerId,
      productCategory: category,
      purchaseCount: 1,
      latestPurchaseDate: latest.date,
      latestQuantity: latest.quantity,
      previousPurchaseDate: null,
      previousQuantity: 0,
      elapsedDays: null,
      consumptionRatePerDay: null,
      consumptionRateDisplay: 'Waiting for 2nd purchase',
      estimatedDurationDays: null,
      expectedNextPurchaseDate: null,
      status: 'insufficient_data',
      daysRemaining: null,
      daysOverdue: null,
      badgeText: 'Waiting for second purchase',
    };
  }

  // Two or more purchases: Take ONLY the latest two
  const prevPurchase = purchaseRecords[purchaseCount - 2];
  const latestPurchase = purchaseRecords[purchaseCount - 1];

  const rawElapsed = diffDays(latestPurchase.date, prevPurchase.date);
  const elapsedDays = Math.max(1, rawElapsed);

  // Rate = Previous purchased quantity divided by elapsed days
  const consumptionRatePerDay = prevPurchase.quantity / elapsedDays;

  // Format the rate display nicely
  let consumptionRateDisplay = '';
  const unit = latestPurchase.unit || defaultUnit;
  if (prevPurchase.quantity === 1 && elapsedDays > 1) {
    consumptionRateDisplay = `1 ${unit} / ${elapsedDays} days`;
  } else if (elapsedDays === 1) {
    consumptionRateDisplay = `${prevPurchase.quantity} ${unit} / day`;
  } else if (elapsedDays % prevPurchase.quantity === 0) {
    const daysPerUnit = elapsedDays / prevPurchase.quantity;
    consumptionRateDisplay = `1 ${unit} / ${daysPerUnit} days`;
  } else {
    const rateFormatted = consumptionRatePerDay >= 1 
      ? consumptionRatePerDay.toFixed(1).replace(/\.0$/, '')
      : (1 / consumptionRatePerDay).toFixed(1).replace(/\.0$/, '');
    
    if (consumptionRatePerDay >= 1) {
      consumptionRateDisplay = `${rateFormatted} ${unit} / day`;
    } else {
      consumptionRateDisplay = `1 ${unit} / ${rateFormatted} days`;
    }
  }

  // Estimate duration for the latest purchased quantity
  const estimatedDurationDays = Math.max(1, Math.round(latestPurchase.quantity / consumptionRatePerDay));
  const expectedNextPurchaseDate = addDays(latestPurchase.date, estimatedDurationDays);

  const today = getTodayString();
  const daysRemaining = diffDays(expectedNextPurchaseDate, today);

  let status: 'healthy' | 'approaching' | 'overdue' = 'healthy';
  let daysOverdue: number | null = null;
  let badgeText = '';

  if (daysRemaining < 0) {
    status = 'overdue';
    daysOverdue = Math.abs(daysRemaining);
    badgeText = `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
  } else if (daysRemaining === 0) {
    status = 'approaching';
    badgeText = 'Due Today';
  } else if (daysRemaining <= 3) {
    status = 'approaching';
    badgeText = `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
  } else {
    status = 'healthy';
    badgeText = `${daysRemaining} days remaining`;
  }

  return {
    customerId,
    productCategory: category,
    purchaseCount,
    latestPurchaseDate: latestPurchase.date,
    latestQuantity: latestPurchase.quantity,
    previousPurchaseDate: prevPurchase.date,
    previousQuantity: prevPurchase.quantity,
    elapsedDays,
    consumptionRatePerDay,
    consumptionRateDisplay,
    estimatedDurationDays,
    expectedNextPurchaseDate,
    status,
    daysRemaining,
    daysOverdue,
    badgeText,
  };
}

export function getOverallRepurchaseStatus(
  handwash: ConsumptionIntelligence,
  tissue: ConsumptionIntelligence
): { status: 'healthy' | 'approaching' | 'overdue' | 'insufficient_data'; mostUrgentDays: number | null; mostUrgentDate: string | null } {
  if (handwash.status === 'overdue' || tissue.status === 'overdue') {
    const maxOverdue = Math.max(handwash.daysOverdue || 0, tissue.daysOverdue || 0);
    return {
      status: 'overdue',
      mostUrgentDays: -maxOverdue,
      mostUrgentDate: (handwash.daysOverdue || 0) >= (tissue.daysOverdue || 0) 
        ? handwash.expectedNextPurchaseDate 
        : tissue.expectedNextPurchaseDate,
    };
  }

  if (handwash.status === 'approaching' || tissue.status === 'approaching') {
    const minDays = Math.min(
      handwash.daysRemaining ?? Infinity,
      tissue.daysRemaining ?? Infinity
    );
    return {
      status: 'approaching',
      mostUrgentDays: minDays === Infinity ? 0 : minDays,
      mostUrgentDate: (handwash.daysRemaining ?? Infinity) <= (tissue.daysRemaining ?? Infinity)
        ? handwash.expectedNextPurchaseDate
        : tissue.expectedNextPurchaseDate,
    };
  }

  if (handwash.status === 'healthy' || tissue.status === 'healthy') {
    const minDays = Math.min(
      handwash.daysRemaining ?? Infinity,
      tissue.daysRemaining ?? Infinity
    );
    return {
      status: 'healthy',
      mostUrgentDays: minDays === Infinity ? null : minDays,
      mostUrgentDate: (handwash.daysRemaining ?? Infinity) <= (tissue.daysRemaining ?? Infinity)
        ? handwash.expectedNextPurchaseDate
        : tissue.expectedNextPurchaseDate,
    };
  }

  return {
    status: 'insufficient_data',
    mostUrgentDays: null,
    mostUrgentDate: null,
  };
}
