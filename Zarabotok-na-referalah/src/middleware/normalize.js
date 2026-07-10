// Normalize Middleware Stage
// Phone format normalization, field trimming, standardization

function normalize(lead) {
  if (lead.contact && lead.contact.phone) {
    lead.contact.phone = normalizePhone(lead.contact.phone);
  }
  if (lead.contact && lead.contact.email) {
    lead.contact.email = lead.contact.email.trim().toLowerCase();
  }
  if (lead.source) {
    lead.source = lead.source.trim().toLowerCase();
  }
  return lead;
}

function normalizePhone(phone) {
  if (!phone) return phone;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '+7' + digits.slice(1);
  }
  if (!digits.startsWith('+')) {
    digits = '+' + digits;
  }
  return digits;
}

module.exports = { normalize, normalizePhone };
