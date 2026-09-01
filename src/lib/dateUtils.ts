import { DateFilterType, DateRange } from '../types';

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function formatCurrency(amount: number, currency: string = '₹'): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return `${currency}${rounded.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function diffDays(dateA: string, dateB: string): number {
  // Returns dateA - dateB in days
  const dA = new Date(dateA.split('T')[0]);
  const dB = new Date(dateB.split('T')[0]);
  const diffTime = dA.getTime() - dB.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getDateRange(filterType: DateFilterType, customRange?: DateRange): DateRange {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  if (filterType === 'custom' && customRange) {
    return customRange;
  }

  if (filterType === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (filterType === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0]
    };
  }

  if (filterType === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  }

  if (filterType === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  }

  if (filterType === 'this_year') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  }

  return { startDate: '2020-01-01', endDate: '2030-12-31' };
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  return d >= range.startDate && d <= range.endDate;
}
