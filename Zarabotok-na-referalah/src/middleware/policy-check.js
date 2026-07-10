// Policy Check Middleware Stage
// Policy evaluation — for MVP, manual enforcement (guardian recommends)

const SEVERITY = ['info', 'caution', 'warning', 'critical'];
const ENFORCEMENT = ['allow', 'warn', 'require_review', 'soft_pause', 'hard_pause', 'emergency_stop'];

function policyCheck(lead, policyPacks) {
  const findings = [];
  let status = 'approved';
  let enforcement = 'allow';

  if (!policyPacks || policyPacks.length === 0) {
    findings.push({ severity: 'info', message: 'No policy packs loaded — manual review recommended' });
    status = 'approved';
    enforcement = 'allow';
    return { status, enforcement, findings };
  }

  for (const pack of policyPacks) {
    if (pack.rules) {
      for (const rule of pack.rules) {
        const result = evaluateRule(lead, rule);
        if (result) {
          findings.push(result);
          if (SEVERITY.indexOf(result.severity) > SEVERITY.indexOf(status === 'approved' ? 'info' : status)) {
            // escalate
          }
          if (ENFORCEMENT.indexOf(result.enforcement) > ENFORCEMENT.indexOf(enforcement)) {
            enforcement = result.enforcement;
            if (['require_review', 'soft_pause', 'hard_pause', 'emergency_stop'].includes(enforcement)) {
              status = 'blocked';
            }
          }
        }
      }
    }
  }

  return { status, enforcement, findings };
}

function evaluateRule(lead, rule) {
  if (rule.evaluate && typeof rule.evaluate === 'function') {
    return rule.evaluate(lead);
  }
  return null;
}

module.exports = { policyCheck, SEVERITY, ENFORCEMENT };
