// Dashboard Data Layer
// Aggregates read-only data from store, logger, adapters, dispatch
// No mutations. No live integrations. Pure data aggregation.

const { LEAD_STATES } = require('../store/lead-schema');
const { EVENTS } = require('../logger/event-types');

class Dashboard {
  constructor({ store, logger, adapterRegistry, offerRegistry, dispatchFn }) {
    this.store = store;
    this.logger = logger;
    this.adapterRegistry = adapterRegistry;
    this.offerRegistry = offerRegistry;
    this.dispatchFn = dispatchFn;
  }

  // --- Lead Monitoring ---

  getLeads() {
    if (!this.store) return [];
    return this.store.list().map(lead => ({
      id: lead.id,
      offerId: lead.offerId,
      source: lead.source,
      status: lead.status,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      contact: {
        telegramId: lead.contact.telegramId || null,
        username: lead.contact.username || null,
        languageCode: lead.contact.languageCode || null
      },
      metadata: {
        correlationId: (lead.metadata && lead.metadata.correlationId) || null,
        dispatchStatus: (lead.metadata && lead.metadata.dispatchResult && lead.metadata.dispatchResult.dispatchStatus) || null,
        networkId: (lead.metadata && lead.metadata.dispatchResult && lead.metadata.dispatchResult.networkId) || null,
        adapterId: (lead.metadata && lead.metadata.dispatchResult && lead.metadata.dispatchResult.adapterId) || null,
        error: (lead.metadata && lead.metadata.dispatchResult && lead.metadata.dispatchResult.deliveryResult && lead.metadata.dispatchResult.deliveryResult.error) || null
      }
    }));
  }

  getLeadCounts() {
    const counts = {};
    for (const state of LEAD_STATES) {
      counts[state] = 0;
    }
    if (!this.store) return counts;
    for (const lead of this.store.list()) {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    }
    counts.total = this.store.list().length;
    return counts;
  }

  getLeadDetail(leadId) {
    if (!this.store) return null;
    const lead = this.store.get(leadId);
    if (!lead) return null;
    return {
      id: lead.id,
      offerId: lead.offerId,
      campaignId: lead.campaignId,
      source: lead.source,
      status: lead.status,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      contact: { ...lead.contact },
      metadata: { ...lead.metadata },
      tags: [...(lead.tags || [])]
    };
  }

  // --- Dispatch Monitoring ---

  getDispatchLog() {
    if (!this.dispatchFn || !this.dispatchFn.getEntries) return [];
    return this.dispatchFn.getEntries().map(entry => ({
      leadId: entry.leadId || (entry.key && entry.key.split(':')[0]) || null,
      offerId: entry.offerId || null,
      networkId: entry.networkId || null,
      adapterId: entry.adapterId || null,
      dispatchStatus: entry.dispatchStatus || null,
      reason: entry.reason || null,
      idempotentHit: entry.idempotentHit || false
    }));
  }

  getDispatchCounts() {
    const log = this.getDispatchLog();
    const counts = {
      delivered: 0,
      retry_pending: 0,
      rejected: 0,
      skipped: 0,
      offer_not_found: 0,
      no_adapter: 0,
      adapter_config_invalid: 0,
      idempotent_hit: 0,
      error: 0,
      total: log.length
    };
    for (const entry of log) {
      const s = entry.dispatchStatus;
      if (s && counts[s] !== undefined) {
        counts[s]++;
      }
    }
    return counts;
  }

  // --- Module Status ---

  getModuleStatus() {
    const modules = [];

    // Lead Store
    if (this.store) {
      modules.push({
        name: 'Lead Store',
        status: 'up',
        stats: {
          leads: this.store.list().length,
          dedupKeys: this.store.dedup ? this.store.dedup.size() : null
        }
      });
    }

    // Logger
    if (this.logger) {
      const allEntries = this.logger.all();
      const lastEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;
      modules.push({
        name: 'Logger',
        status: 'up',
        stats: {
          events: this.logger.count(),
          lastEvent: lastEntry ? lastEntry.timestamp : null
        }
      });
    }

    // CPA Adapter Registry
    if (this.adapterRegistry) {
      const adapters = this.adapterRegistry.list();
      modules.push({
        name: 'CPA Adapter Registry',
        status: 'up',
        stats: {
          adapters: adapters.length,
          registered: adapters
        }
      });
    }

    // Offer Registry
    if (this.offerRegistry) {
      const offerCount = this.offerRegistry.offers ? this.offerRegistry.offers.size : null;
      modules.push({
        name: 'Offer Registry',
        status: offerCount !== null ? 'up' : 'unknown',
        stats: {
          offers: offerCount
        }
      });
    }

    // Dispatch
    if (this.dispatchFn) {
      const log = this.getDispatchLog();
      modules.push({
        name: 'Dispatch',
        status: 'up',
        stats: {
          dispatchLogEntries: log.length
        }
      });
    }

    // Middleware (always up if dashboard can be constructed)
    modules.push({
      name: 'Middleware',
      status: 'up',
      stats: {}
    });

    return modules;
  }

  // --- Policy / Alerts ---

  getPolicySummary() {
    if (!this.logger) return { total: 0, approved: 0, blocked: 0 };
    const checks = this.logger.query({ event: EVENTS.POLICY_CHECK });
    const blocked = this.logger.query({ event: EVENTS.POLICY_BLOCKED });
    return {
      total: checks.length,
      approved: checks.length - blocked.length,
      blocked: blocked.length
    };
  }

  getRecentAlerts(limit) {
    limit = limit || 20;
    if (!this.logger) return [];

    const alerts = [];
    const allEntries = this.logger.all();

    for (let i = allEntries.length - 1; i >= 0 && alerts.length < limit; i--) {
      const entry = allEntries[i];
      const severity = this._classifySeverity(entry);
      if (severity) {
        alerts.push({
          severity,
          event: entry.event,
          message: this._formatAlertMessage(entry),
          timestamp: entry.timestamp,
          leadId: entry.data.leadId || null,
          correlationId: entry.data.correlationId || null
        });
      }
    }

    return alerts;
  }

  // --- Full Snapshot (for preview consumption) ---

  getSnapshot() {
    return {
      leads: this.getLeads(),
      leadCounts: this.getLeadCounts(),
      dispatchLog: this.getDispatchLog(),
      dispatchCounts: this.getDispatchCounts(),
      modules: this.getModuleStatus(),
      policy: this.getPolicySummary(),
      alerts: this.getRecentAlerts(20),
      timestamp: new Date().toISOString()
    };
  }

  // --- Internal helpers ---

  _classifySeverity(entry) {
    if (entry.event === EVENTS.ADAPTER_ERROR || entry.event === EVENTS.POLICY_BLOCKED) return 'critical';
    if (entry.event === EVENTS.LEAD_DUPLICATE_BLOCKED) return 'warning';
    if (entry.event === EVENTS.MIDDLEWARE_INVALID) return 'warning';
    if (entry.event === EVENTS.TELEGRAM_SKIPPED) return 'info';
    if (entry.event === EVENTS.DISPATCH_ATTEMPT && entry.data.dispatchStatus === 'error') return 'critical';
    if (entry.event === EVENTS.DISPATCH_ATTEMPT && entry.data.dispatchStatus === 'retry_pending') return 'warning';
    if (entry.event === EVENTS.DISPATCH_ATTEMPT && entry.data.dispatchStatus === 'rejected') return 'warning';
    return null;
  }

  _formatAlertMessage(entry) {
    const d = entry.data;
    if (entry.event === EVENTS.ADAPTER_ERROR) return 'Adapter error: ' + (d.error || d.message || 'unknown');
    if (entry.event === EVENTS.POLICY_BLOCKED) return 'Policy blocked: ' + (d.enforcement || 'unknown') + ' — ' + (d.findings || '');
    if (entry.event === EVENTS.LEAD_DUPLICATE_BLOCKED) return 'Duplicate blocked: ' + (d.leadId || '') + ' ' + (d.offerId || '');
    if (entry.event === EVENTS.MIDDLEWARE_INVALID) return 'Validation failed: ' + (d.errors ? d.errors.join(', ') : 'unknown');
    if (entry.event === EVENTS.DISPATCH_ATTEMPT) return 'Dispatch ' + d.dispatchStatus + ': ' + (d.reason || d.leadId || '');
    if (entry.event === EVENTS.TELEGRAM_SKIPPED) return 'Update skipped: ' + (d.reason || 'unknown');
    return entry.event;
  }
}

module.exports = { Dashboard };
