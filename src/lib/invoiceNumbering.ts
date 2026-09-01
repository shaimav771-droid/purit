/**
 * Invoice Numbering and Sequencing Engine
 * 
 * Provides intelligent, deterministic sequential incrementing for invoice strings
 * supporting arbitrary prefixes, zero-padding, slashes, hyphens, etc.
 * 
 * Examples:
 * - "PURIT/00/12" -> "PURIT/00/13"
 * - "PURIT/00/99" -> "PURIT/00/100"
 * - "NON-GST/001" -> "NON-GST/002"
 * - "NON-GST/009" -> "NON-GST/010"
 * - "NON-GST/000" -> "NON-GST/001"
 * - "PURIT-101"   -> "PURIT-102"
 */

export function getNextInvoiceNumber(
  currentNumber: string | undefined | null,
  fallbackPrefix = 'PURIT/00/',
  fallbackStart = '1'
): string {
  if (!currentNumber || !currentNumber.trim()) {
    return `${fallbackPrefix}${fallbackStart.padStart(2, '0')}`;
  }

  const trimmed = currentNumber.trim();

  // Find the last contiguous group of digits in the string
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (!match) {
    // If string has no trailing digits (e.g. "PURIT/"), append padded fallback
    const cleanPrefix = trimmed.endsWith('/') || trimmed.endsWith('-') ? trimmed : `${trimmed}/`;
    return `${cleanPrefix}${fallbackStart.padStart(2, '0')}`;
  }

  const prefix = match[1];
  const digitsStr = match[2];
  const length = digitsStr.length;
  const num = parseInt(digitsStr, 10);
  const nextNum = isNaN(num) ? 1 : num + 1;
  
  // Preserve original leading zero padding (e.g. "001" -> "002", "099" -> "100")
  const nextDigitsStr = String(nextNum).padStart(length, '0');

  return `${prefix}${nextDigitsStr}`;
}

/**
 * Validates whether an invoice number string contains a valid numeric counter.
 */
export function isValidInvoiceNumberFormat(invNumber: string): boolean {
  if (!invNumber || !invNumber.trim()) return false;
  return /\d+$/.test(invNumber.trim());
}
