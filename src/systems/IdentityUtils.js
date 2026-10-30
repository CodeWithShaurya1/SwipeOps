/**
 * IdentityUtils
 * Normalization, validation, and privacy masking for student credentials.
 */

export function normalizeEnrollment(enrollment) {
  return String(enrollment || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function maskEnrollment(enrollment) {
  const clean = normalizeEnrollment(enrollment);
  if (!clean) return '—';
  if (clean.length <= 4) {
    if (clean.length <= 2) return clean;
    return clean[0] + '*'.repeat(clean.length - 2) + clean[clean.length - 1];
  }
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}****${suffix}`;
}

export function isTestEnrollment(enrollment) {
  const clean = normalizeEnrollment(enrollment);
  return clean.startsWith('TEST-') || clean.startsWith('DEMO-') || clean.startsWith('DEV-');
}
