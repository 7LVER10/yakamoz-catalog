// PII Mask
// Masks personally identifiable information in log data

function maskPII(data) {
  if (!data || typeof data !== 'object') return data;
  const masked = { ...data };

  if (masked.phone) {
    masked.phone = maskPhone(masked.phone);
  }
  if (masked.email) {
    masked.email = maskEmail(masked.email);
  }
  if (masked.contact) {
    masked.contact = { ...masked.contact };
    if (masked.contact.phone) masked.contact.phone = maskPhone(masked.contact.phone);
    if (masked.contact.email) masked.contact.email = maskEmail(masked.contact.email);
  }

  return masked;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  if (phone.length < 6) return '***';
  return phone.slice(0, 3) + '***' + phone.slice(-2);
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  const masked = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return masked + '@' + parts[1];
}

module.exports = { maskPII, maskPhone, maskEmail };
