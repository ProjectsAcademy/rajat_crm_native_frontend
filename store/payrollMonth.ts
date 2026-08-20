import { create } from 'zustand';

// Selected payroll month, shared between the Salary Components (Payroll) page
// and the Salary Payments page so switching screens preserves the selection.
// Future months make no sense for payroll: every write is clamped to the
// current month, and each app launch starts at the current month.

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function clampMonth(month: string): string {
  const now = currentMonth();
  return month > now ? now : month;
}

interface PayrollMonthState {
  month: string; // YYYY-MM, never in the future
  setMonth: (month: string) => void;
}

export const usePayrollMonth = create<PayrollMonthState>((set) => ({
  month: currentMonth(),
  setMonth: (month) => set({ month: clampMonth(month) }),
}));
