export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return formatShortDate(d);
}

export function formatAnnualFee(raw: string | undefined): string {
  if (!raw || !raw.trim()) return 'No annual fee';
  const lower = raw.toLowerCase();
  if (/no\s*annual\s*fee|\$0|^0$/.test(lower)) return 'No annual fee';
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num)) return raw;
  return `$${Math.round(num)}/yr`;
}

export function formatBonus(signup_bonus: string | undefined, signup_bonus_type: string | undefined): string {
  if (!signup_bonus || !signup_bonus.trim()) return '';
  const num = parseInt(signup_bonus.replace(/,/g, ''), 10);
  if (Number.isNaN(num)) return signup_bonus;
  const type = (signup_bonus_type || '').toLowerCase();
  if (type === 'dollars') return `$${num.toLocaleString()}`;
  if (type === 'miles') return `${num.toLocaleString()} miles`;
  return `${num.toLocaleString()} pts`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function frequencyLabel(f: string): string {
  const map: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    'semi-annual': 'Semi-Annual',
    annual: 'Annual',
    'multi-year': 'Multi-Year',
  };
  return map[f] ?? f;
}
