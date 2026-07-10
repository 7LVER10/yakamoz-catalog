// Config Loader
// Reads configuration from environment variables and bot-config.json
// No external dependencies — uses fs and process.env only

const fs = require('fs');
const path = require('path');

function loadConfig(overrides) {
  overrides = overrides || {};

  // Load bot-config.json if exists
  let fileConfig = {};
  const configPath = overrides.configPath || path.join(process.cwd(), 'config', 'bot-config.json');
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      // malformed config file — continue with defaults
    }
  }

  // Load .env if exists (simple key=value parser, no dotenv dependency)
  const envPath = overrides.envPath || path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    } catch (e) {
      // .env read failure — continue with process.env
    }
  }

  // Build config: overrides > env > file > defaults
  const config = {
    botToken: overrides.botToken || process.env.TELEGRAM_BOT_TOKEN || fileConfig.botToken || '',
    webhookUrl: overrides.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL || fileConfig.webhookUrl || '',
    allowedChatTypes: fileConfig.allowedChatTypes || ['private', 'group'],
    maxMessageLength: fileConfig.maxMessageLength || 4096,
    pollInterval: overrides.pollInterval || parseInt(process.env.TELEGRAM_POLL_INTERVAL, 10) || 3000,
    pollTimeout: overrides.pollTimeout || parseInt(process.env.TELEGRAM_POLL_TIMEOUT, 10) || 30,
    mode: overrides.mode || process.env.TELEGRAM_MODE || 'local'
  };

  return config;
}

function validateConfig(config) {
  const errors = [];

  if (!config.botToken) {
    errors.push('Missing bot token (set TELEGRAM_BOT_TOKEN in .env or botToken in config/bot-config.json)');
  } else {
    const parts = config.botToken.split(':');
    if (parts.length !== 2) {
      errors.push('Invalid bot token format (expected numeric_id:alphanumeric_string)');
    } else if (!/^\d+$/.test(parts[0])) {
      errors.push('Invalid bot token: bot ID must be numeric');
    } else if (parts[1].length < 20) {
      errors.push('Invalid bot token: token string too short');
    }
  }

  if (config.mode === 'polling' && !config.botToken) {
    errors.push('Polling mode requires a valid bot token');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = { loadConfig, validateConfig };
