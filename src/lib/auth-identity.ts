export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");

  if (/^1\d{10}$/.test(digits)) {
    return `+86${digits}`;
  }

  if (/^86\d{11}$/.test(digits)) {
    return `+${digits}`;
  }

  if (raw.trim().startsWith("+") && digits.length >= 8) {
    return `+${digits}`;
  }

  return raw.trim();
}

export function isSupportedPhone(phone: string) {
  return /^\+86\d{11}$/.test(phone);
}

export function getAuthEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `phone-${digits}@auth.tutor.local`;
}
