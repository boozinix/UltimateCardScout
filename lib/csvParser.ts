import type { Issuer, RewardsCurrency, ApplicationStatus } from './applicationTypes';
import { detectIssuer } from '@/hooks/useApplications';

// ============================================================
// CSV Parser for churning spreadsheet import
// Handles multiple date formats, fuzzy person matching,
// issuer detection, and duplicate detection.
// ============================================================

// ============================================================
// Types
// ============================================================

export interface ColumnMap {
  card_name: string;
  applied_month: string;
  person?: string;
  issuer?: string;
  card_type?: string;
  status?: string;
  bonus_amount?: string;
  bonus_currency?: string;
  bonus_min_spend?: string;
  bonus_spend_months?: string;
  annual_fee?: string;
  last_four?: string;
  credit_bureau?: string;
  notes?: string;
}

export interface ParsedApplication {
  card_name: string;
  applied_month: string; // normalized to 'YYYY-MM'
  issuer: Issuer;
  card_type: 'personal' | 'business';
  status: ApplicationStatus;
  household_member_name: string | null;
  bonus_amount: number | null;
  bonus_currency: RewardsCurrency | null;
  bonus_min_spend: number | null;
  bonus_spend_months: number | null;
  annual_fee: number;
  last_four: string | null;
  credit_bureau: string | null;
  notes: string | null;
  counts_toward_5_24: boolean;
}

export interface ParseError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ParseResult {
  parsed: ParsedApplication[];
  errors: ParseError[];
  warnings: string[];
}

// ============================================================
// Date parsing — handles all common churner formats
// ============================================================

const MONTH_NAMES: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
};

/**
 * Parse a date string to 'YYYY-MM' format.
 * Supported formats:
 *  - 'Oct-23' / 'Oct-2023'
 *  - '10/23' / '10/2023'
 *  - '2023-10'
 *  - 'October 2023'
 *  - '2023-10-15' (ISO, day ignored)
 */
export function parseMonthDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // 'YYYY-MM' or 'YYYY-MM-DD'
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
  }

  // 'Oct-23' / 'Oct-2023' / 'Sep-23'
  const abbrevDashMatch = s.match(/^([A-Za-z]+)-(\d{2,4})$/);
  if (abbrevDashMatch) {
    const monthNum = MONTH_NAMES[abbrevDashMatch[1].toLowerCase()];
    if (monthNum) {
      let year = abbrevDashMatch[2];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${monthNum}`;
    }
  }

  // '10/23' / '10/2023'
  const slashMatch = s.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    let year = slashMatch[2];
    if (year.length === 2) year = `20${year}`;
    const monthInt = parseInt(month, 10);
    if (monthInt >= 1 && monthInt <= 12) {
      return `${year}-${month}`;
    }
  }

  // 'October 2023' / 'Oct 2023'
  const wordMatch = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (wordMatch) {
    const monthNum = MONTH_NAMES[wordMatch[1].toLowerCase()];
    if (monthNum) {
      return `${wordMatch[2]}-${monthNum}`;
    }
  }

  return null;
}

// ============================================================
// Person matching — fuzzy match against household member names
// ============================================================

/**
 * Match a CSV person value against known household member names.
 * Handles: exact match, case-insensitive, initial (e.g. "H" → "Halima"),
 * and partial prefix (e.g. "hal" → "Halima").
 */
export function matchPerson(
  rawPerson: string,
  memberNames: string[],
): string | null {
  const p = rawPerson.trim().toLowerCase();
  if (!p) return null;

  // Exact (case-insensitive)
  for (const name of memberNames) {
    if (name.toLowerCase() === p) return name;
  }

  // Single-character initial
  if (p.length === 1) {
    const matches = memberNames.filter(
      (n) => n.toLowerCase().startsWith(p),
    );
    if (matches.length === 1) return matches[0];
  }

  // Prefix match (3+ chars)
  if (p.length >= 2) {
    const matches = memberNames.filter(
      (n) => n.toLowerCase().startsWith(p),
    );
    if (matches.length === 1) return matches[0];
  }

  return null;
}

// ============================================================
// Status detection from string
// ============================================================

function parseStatus(raw: string): ApplicationStatus {
  const s = raw.trim().toLowerCase();
  if (s === 'active' || s === 'open' || s === 'approved') return 'active';
  if (s === 'pending' || s === 'applied') return 'pending';
  if (s === 'denied' || s === 'rejected') return 'denied';
  if (s === 'closed' || s === 'cancelled') return 'closed';
  if (s.includes('product change') || s === 'pc' || s === 'upgraded' || s === 'downgraded') return 'product_changed';
  if (s.includes('shutdown')) return 'shutdown_by_issuer';
  return 'active';
}

// ============================================================
// Card type detection
// ============================================================

function parseCardType(raw: string): 'personal' | 'business' {
  const s = raw.trim().toLowerCase();
  if (s === 'business' || s === 'biz' || s === 'b') return 'business';
  return 'personal';
}

// ============================================================
// Currency detection from string
// ============================================================

function parseCurrency(raw: string): RewardsCurrency | null {
  const s = raw.trim().toLowerCase();
  if (s.includes('ultimate rewards') || s === 'ur' || s === 'chase_ur') return 'chase_ur';
  if (s.includes('membership rewards') || s === 'mr' || s === 'amex_mr') return 'amex_mr';
  if (s.includes('thankyou') || s === 'typ' || s === 'citi_typ') return 'citi_typ';
  if (s.includes('capital one') || s === 'c1') return 'capital_one_miles';
  if (s.includes('united') || s === 'ua') return 'united_miles';
  if (s.includes('delta') || s === 'dl') return 'delta_miles';
  if (s.includes('southwest') || s === 'sw' || s === 'wn') return 'southwest_points';
  if (s.includes('jetblue') || s === 'b6') return 'jetblue_points';
  if (s.includes('american') || s === 'aa') return 'american_miles';
  if (s.includes('alaska') || s === 'as') return 'alaska_miles';
  if (s.includes('hyatt')) return 'hyatt_points';
  if (s.includes('marriott') || s.includes('bonvoy')) return 'marriott_points';
  if (s.includes('hilton')) return 'hilton_points';
  if (s.includes('ihg')) return 'ihg_points';
  if (s.includes('cash') || s === '$') return 'cash';
  return null;
}

// ============================================================
// Main parser
// ============================================================

export function parseChurningCSV(
  rows: Record<string, string>[],
  columnMap: ColumnMap,
  memberNames: string[] = [],
): ParseResult {
  const parsed: ParsedApplication[] = [];
  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2: 1-indexed + header row

    // Required: card_name
    const cardName = row[columnMap.card_name]?.trim();
    if (!cardName) {
      errors.push({ row: rowNum, column: columnMap.card_name, value: '', message: 'Card name is required' });
      continue;
    }

    // Required: applied_month
    const rawDate = row[columnMap.applied_month]?.trim() ?? '';
    const appliedMonth = parseMonthDate(rawDate);
    if (!appliedMonth) {
      errors.push({ row: rowNum, column: columnMap.applied_month, value: rawDate, message: `Could not parse date "${rawDate}". Expected formats: Oct-23, 10/23, 2023-10, October 2023` });
      continue;
    }

    // Issuer: from column or detected from card name
    let issuer: Issuer = 'other';
    if (columnMap.issuer && row[columnMap.issuer]) {
      const rawIssuer = row[columnMap.issuer].trim().toLowerCase().replace(/\s+/g, '_');
      if (['amex', 'chase', 'citi', 'capital_one', 'bank_of_america', 'us_bank', 'barclays', 'wells_fargo', 'discover'].includes(rawIssuer)) {
        issuer = rawIssuer as Issuer;
      } else {
        issuer = detectIssuer(row[columnMap.issuer]);
      }
    } else {
      issuer = detectIssuer(cardName);
    }

    // Person
    let memberName: string | null = null;
    if (columnMap.person && row[columnMap.person]) {
      memberName = matchPerson(row[columnMap.person], memberNames);
      if (!memberName && row[columnMap.person].trim()) {
        warnings.push(`Row ${rowNum}: could not match person "${row[columnMap.person]}" to a household member`);
        memberName = row[columnMap.person].trim();
      }
    }

    // Card type
    const cardType = columnMap.card_type && row[columnMap.card_type]
      ? parseCardType(row[columnMap.card_type])
      : 'personal';

    // Status
    const status = columnMap.status && row[columnMap.status]
      ? parseStatus(row[columnMap.status])
      : 'active';

    // Bonus
    const bonusAmount = columnMap.bonus_amount && row[columnMap.bonus_amount]
      ? parseInt(row[columnMap.bonus_amount].replace(/[^0-9]/g, ''), 10) || null
      : null;

    const bonusCurrency = columnMap.bonus_currency && row[columnMap.bonus_currency]
      ? parseCurrency(row[columnMap.bonus_currency])
      : null;

    const bonusMinSpend = columnMap.bonus_min_spend && row[columnMap.bonus_min_spend]
      ? parseInt(row[columnMap.bonus_min_spend].replace(/[^0-9]/g, ''), 10) || null
      : null;

    const bonusSpendMonths = columnMap.bonus_spend_months && row[columnMap.bonus_spend_months]
      ? parseInt(row[columnMap.bonus_spend_months], 10) || null
      : null;

    // Annual fee
    const annualFee = columnMap.annual_fee && row[columnMap.annual_fee]
      ? parseInt(row[columnMap.annual_fee].replace(/[^0-9]/g, ''), 10) || 0
      : 0;

    // Last four
    const lastFour = columnMap.last_four && row[columnMap.last_four]
      ? row[columnMap.last_four].replace(/\D/g, '').slice(-4) || null
      : null;

    // Credit bureau
    const creditBureau = columnMap.credit_bureau && row[columnMap.credit_bureau]
      ? row[columnMap.credit_bureau].trim().toLowerCase() || null
      : null;

    // Notes
    const notes = columnMap.notes && row[columnMap.notes]
      ? row[columnMap.notes].trim() || null
      : null;

    // Business cards don't count toward 5/24 (usually)
    const countsFivetwentyfour = cardType === 'personal';

    // Duplicate detection: card_name + applied_month + member_name
    const dupeKey = `${cardName.toLowerCase()}|${appliedMonth}|${(memberName ?? '').toLowerCase()}`;
    if (seen.has(dupeKey)) {
      warnings.push(`Row ${rowNum}: possible duplicate — "${cardName}" applied ${appliedMonth} for ${memberName ?? 'unknown member'}`);
    }
    seen.add(dupeKey);

    parsed.push({
      card_name: cardName,
      applied_month: appliedMonth,
      issuer,
      card_type: cardType,
      status,
      household_member_name: memberName,
      bonus_amount: bonusAmount,
      bonus_currency: bonusCurrency,
      bonus_min_spend: bonusMinSpend,
      bonus_spend_months: bonusSpendMonths,
      annual_fee: annualFee,
      last_four: lastFour,
      credit_bureau: creditBureau,
      notes,
      counts_toward_5_24: countsFivetwentyfour,
    });
  }

  if (parsed.length === 0 && errors.length === 0) {
    warnings.push('No rows found in CSV. Check that the file has data below the header row.');
  }

  return { parsed, errors, warnings };
}
