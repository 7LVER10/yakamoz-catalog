// Lead Schema Definition
// Canonical lead structure for the system

const LEAD_STATES = ['new', 'validated', 'pending_delivery', 'delivered', 'rejected', 'failed'];
const LEAD_TRANSITIONS = {
  new: ['validated', 'rejected'],
  validated: ['pending_delivery', 'rejected'],
  pending_delivery: ['delivered', 'failed', 'rejected'],
  delivered: [],
  rejected: [],
  failed: ['pending_delivery']
};

const IMMUTABLE_FIELDS = ['id', 'createdAt', 'source', 'offerId'];

const REQUIRED_FIELDS = ['offerId', 'contact'];

function createLead(data) {
  return {
    id: data.id || null,
    offerId: data.offerId || null,
    campaignId: data.campaignId || null,
    source: data.source || 'unknown',
    contact: data.contact || {},
    status: data.status || 'new',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    metadata: data.metadata || {},
    tags: data.tags || []
  };
}

module.exports = {
  LEAD_STATES,
  LEAD_TRANSITIONS,
  IMMUTABLE_FIELDS,
  REQUIRED_FIELDS,
  createLead
};
