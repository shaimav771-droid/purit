import { Activity, ActivityTask, ActivityStatus, ActivityType, Customer } from '../types';
import { getTodayString } from './dateUtils';

export function normalizeTaskTypeName(rawType?: string | null): ActivityType {
  if (!rawType) return 'Dispenser Service';
  const trimmed = rawType.trim().toLowerCase();
  if (trimmed.includes('fit') || trimmed.includes('install')) return 'Dispenser Fitting';
  if (trimmed.includes('serv') || trimmed.includes('maint') || trimmed.includes('check') || trimmed.includes('clean')) return 'Dispenser Service';
  if (trimmed.includes('deliv') || trimmed.includes('suppl') || trimmed.includes('refill') || trimmed.includes('drop')) return 'Delivery';
  return 'Dispenser Service';
}

export function normalizeTasksFromActivity(activity: Activity): ActivityTask[] {
  if (Array.isArray(activity.tasks) && activity.tasks.length > 0) {
    return activity.tasks.map((t, idx) => ({
      ...t,
      id: t.id ? String(t.id) : `subtask-${activity.id}-${idx}`,
      type: normalizeTaskTypeName(t.type),
      status: t.status === 'completed' ? 'completed' : 'pending',
      remarks: t.remarks || '',
    }));
  }
  const typeStr = activity.activityType || activity.type || 'Dispenser Service';
  return [{
    id: `subtask-${activity.id}-0`,
    type: normalizeTaskTypeName(typeStr),
    status: activity.status === 'completed' ? 'completed' : 'pending',
    remarks: activity.remarks || '',
  }];
}

export function calculateVisitStatus(tasks: ActivityTask[]): ActivityStatus {
  if (!tasks || tasks.length === 0) return 'pending';
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  if (completedCount === tasks.length) return 'completed';
  if (completedCount > 0) return 'partially_completed';
  return 'pending';
}

export function getCustomerCanonicalKey(
  customerId?: string,
  customerName?: string,
  customersList?: Customer[]
): { key: string; name: string; id: string } {
  const safeList = Array.isArray(customersList) ? customersList : [];
  const rawId = (customerId || '').trim();
  const rawName = (customerName || '').trim();

  // Match by direct ID
  if (rawId && !rawId.startsWith('adhoc-')) {
    const matched = safeList.find(c => c && String(c.id).toLowerCase() === rawId.toLowerCase());
    if (matched) {
      return {
        key: `cust_${matched.id}`,
        name: matched.restaurantName || rawName || 'Restaurant Visit',
        id: matched.id
      };
    }
  }

  // Match by aggressive name normalization
  if (rawName) {
    const cleanName = rawName.toLowerCase()
      .replace(/\b(the|restaurant|cafe|bistro|bar|kitchen|hotel|pizzeria|grill|house|ltd|pvt|and|&)\b/gi, '')
      .replace(/[^a-z0-9]/g, '');

    const matched = safeList.find(c => {
      if (!c || !c.restaurantName) return false;
      const cClean = c.restaurantName.toLowerCase()
        .replace(/\b(the|restaurant|cafe|bistro|bar|kitchen|hotel|pizzeria|grill|house|ltd|pvt|and|&)\b/gi, '')
        .replace(/[^a-z0-9]/g, '');
      return (cleanName && cClean && (cleanName === cClean || cleanName.includes(cClean) || cClean.includes(cleanName))) ||
             (rawName.toLowerCase() === c.restaurantName.toLowerCase().trim());
    });

    if (matched) {
      return {
        key: `cust_${matched.id}`,
        name: matched.restaurantName,
        id: matched.id
      };
    }

    return {
      key: `name_${cleanName || 'unnamed'}`,
      name: rawName,
      id: rawId || `adhoc-${cleanName || Date.now()}`
    };
  }

  return {
    key: `id_${rawId.toLowerCase() || 'unknown'}`,
    name: rawName || 'Restaurant Visit',
    id: rawId || 'unknown'
  };
}

export function normalizeDueDate(dueDate?: string | null): string {
  if (!dueDate) return getTodayString();
  const trimmed = String(dueDate).trim();
  if (!trimmed) return getTodayString();
  const datePart = trimmed.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}
  return datePart || getTodayString();
}

/**
 * Pure deterministic grouping: 
 * Groups raw Firestore activities by Location Canonical Key + Date.
 * Ensures parent ID is always a real, primary Firestore document ID.
 */
export function groupActivitiesByRestaurantAndDate(
  rawActivities: Activity[],
  customersList?: Customer[]
): Activity[] {
  if (!Array.isArray(rawActivities) || rawActivities.length === 0) return [];

  // 1. In-memory Deduplication of raw docs by id
  const docMap = new Map<string, Activity>();
  rawActivities.forEach(act => {
    if (act && act.id) docMap.set(act.id, act);
  });
  const uniqueRaw = Array.from(docMap.values());

  // 2. Group by canonicalKey + dueDate
  const groupMap = new Map<string, {
    primaryDoc: Activity;
    allDocIds: string[];
    allTasks: ActivityTask[];
    allRemarks: string[];
    dueDate: string;
  }>();

  uniqueRaw.forEach(rawAct => {
    const { key: custKey, name: canonicalName, id: canonicalId } = getCustomerCanonicalKey(
      rawAct.customerId,
      rawAct.customerName,
      customersList
    );
    const normDueDate = normalizeDueDate(rawAct.dueDate);
    const groupKey = `${custKey}___${normDueDate}`;

    const existing = groupMap.get(groupKey);
    const tasks = normalizeTasksFromActivity(rawAct);

    if (!existing) {
      groupMap.set(groupKey, {
        primaryDoc: {
          ...rawAct,
          customerName: canonicalName || rawAct.customerName,
          customerId: canonicalId || rawAct.customerId,
          dueDate: normDueDate,
        },
        allDocIds: [rawAct.id],
        allTasks: [...tasks],
        allRemarks: rawAct.remarks ? [rawAct.remarks] : [],
        dueDate: normDueDate,
      });
    } else {
      if (!existing.allDocIds.includes(rawAct.id)) {
        existing.allDocIds.push(rawAct.id);
      }
      if (rawAct.remarks && !existing.allRemarks.includes(rawAct.remarks)) {
        existing.allRemarks.push(rawAct.remarks);
      }

      // Merge sub-tasks without duplicate types
      tasks.forEach(newTask => {
        const normType = normalizeTaskTypeName(newTask.type);
        const idx = existing.allTasks.findIndex(t => normalizeTaskTypeName(t.type) === normType);
        if (idx >= 0) {
          if (newTask.status === 'completed') {
            existing.allTasks[idx].status = 'completed';
            existing.allTasks[idx].completedAt = newTask.completedAt || existing.allTasks[idx].completedAt;
          }
        } else {
          existing.allTasks.push(newTask);
        }
      });
    }
  });

  // 3. Assemble unified cards with guaranteed unique keys
  const result: Activity[] = [];

  groupMap.forEach(({ primaryDoc, allDocIds, allTasks, allRemarks, dueDate }, groupKey) => {
    const overallStatus = calculateVisitStatus(allTasks);
    const combinedRemarks = allRemarks.filter(Boolean).join(' • ');
    
    // Deduplicate subtasks by type
    const sanitizedTasks: ActivityTask[] = [];
    const seenTypes = new Set<string>();

    allTasks.forEach((t, index) => {
      const normType = normalizeTaskTypeName(t.type);
      if (!seenTypes.has(normType)) {
        seenTypes.add(normType);
        sanitizedTasks.push({
          ...t,
          id: `task-${primaryDoc.id}-${normType.toLowerCase().replace(/[^a-z0-9]/g, '')}-${index}`,
          type: normType,
          status: t.status === 'completed' ? 'completed' : 'pending',
        });
      }
    });

    const taskTypes = sanitizedTasks.map(t => t.type);

    result.push({
      ...primaryDoc,
      id: primaryDoc.id, // Keep real primary doc ID for Firestore updates
      canonicalKey: groupKey,
      allDocIds,
      underlyingDocIds: allDocIds,
      dueDate,
      tasks: sanitizedTasks,
      status: overallStatus,
      remarks: combinedRemarks || primaryDoc.remarks || '',
      activityType: taskTypes.join(' + '),
      activityTypes: taskTypes,
      type: taskTypes.join(' + '),
      completedAt: overallStatus === 'completed' ? (primaryDoc.completedAt || new Date().toISOString()) : null,
    });
  });

  // Sort: Active visits first (overdue -> today -> upcoming), then completed (newest completed first)
  result.sort((a, b) => {
    const isACompleted = a.status === 'completed';
    const isBCompleted = b.status === 'completed';

    if (isACompleted !== isBCompleted) {
      return isACompleted ? 1 : -1;
    }

    if (!isACompleted) {
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    }

    return new Date(b.completedAt || b.updatedAt || 0).getTime() - new Date(a.completedAt || a.updatedAt || 0).getTime();
  });

  return result;
}

export const groupTasksByLocation = groupActivitiesByRestaurantAndDate;

/**
 * Calculates urgency & relative days label for a visit
 */
export function getActivityUrgency(activity: Activity) {
  if (activity.status === 'completed') {
    return { status: 'completed', label: 'Finished', color: 'emerald', daysDiff: 0 };
  }

  const todayStr = getTodayString();
  const today = new Date(todayStr);
  const due = new Date(activity.dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return { 
      status: 'overdue', 
      label: overdueDays === 1 ? 'Overdue 1d' : `Overdue ${overdueDays}d`, 
      color: 'rose', 
      daysDiff: diffDays 
    };
  } else if (diffDays === 0) {
    return { status: 'today', label: 'Due Today', color: 'amber', daysDiff: 0 };
  } else if (diffDays === 1) {
    return { status: 'upcoming', label: 'Due Tomorrow', color: 'blue', daysDiff: 1 };
  } else {
    return { status: 'upcoming', label: `In ${diffDays}d`, color: 'indigo', daysDiff: diffDays };
  }
}
