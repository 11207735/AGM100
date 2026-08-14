// Payment Settlement & Verification Management Utility for Guides, Drivers & Companies

export interface SettledPaymentRecord {
  id: string; // e.g. "guide_hassan_08-2026" or "company_AGM_08-2026" or "driver_simo_12-08-2026"
  entityType: 'guide' | 'driver' | 'employee' | 'company';
  entityId: string;
  entityName: string;
  subRole?: string; // e.g. 'Tour Guide' | 'Big van' | 'Mini van' | 'Transport Company'
  periodType: 'month' | 'day';
  periodKey: string; // e.g. "08-2026" or "2026-08-12"
  amountDH: number;
  daysCount?: number;
  tripsCount?: number;
  paxCount?: number;
  bigVansCount?: number;
  miniVansCount?: number;
  isPaid: boolean;
  paidAt?: string;
  paidByManager?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Direct Payout';
  notes?: string;
  detailsNote?: string;
}

const SETTLED_PAYMENTS_STORAGE_KEY = 'agm_settled_payments_v1';

export function getStoredSettledPayments(): Record<string, SettledPaymentRecord> {
  try {
    const raw = localStorage.getItem(SETTLED_PAYMENTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load settled payments', e);
    return {};
  }
}

export function saveSettledPaymentRecord(record: SettledPaymentRecord): Record<string, SettledPaymentRecord> {
  try {
    const current = getStoredSettledPayments();
    current[record.id] = record;
    localStorage.setItem(SETTLED_PAYMENTS_STORAGE_KEY, JSON.stringify(current));
    try {
      window.dispatchEvent(new CustomEvent('agm_settlements_updated', { detail: { type: 'save', record } }));
    } catch {}
    return current;
  } catch (e) {
    console.error('Failed to save settled payment record', e);
    return {};
  }
}

export function removeSettledPaymentRecord(id: string): Record<string, SettledPaymentRecord> {
  try {
    const current = getStoredSettledPayments();
    delete current[id];
    localStorage.setItem(SETTLED_PAYMENTS_STORAGE_KEY, JSON.stringify(current));
    try {
      window.dispatchEvent(new CustomEvent('agm_settlements_updated', { detail: { type: 'remove', id } }));
    } catch {}
    return current;
  } catch (e) {
    console.error('Failed to delete settled payment record', e);
    return {};
  }
}

export function verifyManagerPassword(passwordInput: string, managersList: any[] = []): boolean {
  const clean = passwordInput.trim().toLowerCase();
  if (!clean) return false;
  // Accepted manager/admin authentication credentials
  const validPasswords = [
    'agm',
    'agmtravelagm',
    'admin',
    'ismail',
    '1234',
    '2026',
    'manager',
    'asmae',
    'abdelilah'
  ];
  if (validPasswords.includes(clean)) return true;

  if (Array.isArray(managersList)) {
    for (const m of managersList) {
      if (m?.paymentPin && String(m.paymentPin).trim().toLowerCase() === clean) return true;
      if (m?.name && String(m.name).trim().toLowerCase() === clean) return true;
      if (m?.lastname && String(m.lastname).trim().toLowerCase() === clean) return true;
    }
  }

  return false;
}
