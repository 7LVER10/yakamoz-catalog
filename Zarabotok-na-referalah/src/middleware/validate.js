// Validate Middleware Stage
// Required field presence and format validation

const { REQUIRED_FIELDS } = require('../store/lead-schema');

function validate(lead) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!lead[field] || (typeof lead[field] === 'object' && Object.keys(lead[field]).length === 0)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (lead.contact && lead.contact.email && !isValidEmail(lead.contact.email)) {
    errors.push('Invalid email format');
  }

  return { valid: errors.length === 0, errors };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { validate };
