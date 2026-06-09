export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function scaleQuantity(qty: string, from: number, to: number): string {
  const num = parseFloat(qty);
  if (isNaN(num)) return qty;
  const scaled = (num * to) / from;
  return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1).replace(/\.0$/, '');
}

export function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function weekDays(fromDate: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(fromDate);
    d.setDate(fromDate.getDate() + i);
    days.push(d);
  }
  return days;
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export function dayLabel(d: Date): string {
  return DAY_LABELS[d.getDay()];
}
