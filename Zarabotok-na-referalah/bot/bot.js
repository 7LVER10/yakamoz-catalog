// LeadGid Offer 7397 — Telegram Bot
// Standalone bot for Plati Po Miru virtual card offer
// Zero external dependencies — uses Node.js built-in https

const https = require('https');
const fs = require('fs');
const path = require('path');
const { TEXTS, REFERRAL_LINK } = require('./texts');

// ─── Config ───
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8960488494:AAF_3FptrR3hFChAAUmvQw8ZMdZjJoHIy-E';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const LOG_FILE = path.join(__dirname, 'bot-log.jsonl');
const POLL_TIMEOUT = 30;

// ─── State per user ───
const userStates = new Map();

// ─── Telegram API helpers ───
function apiCall(method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(`${API_BASE}/${method}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Invalid API response')); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function sendMessage(chatId, text, replyMarkup) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return apiCall('sendMessage', body);
}

async function answerCallbackQuery(callbackQueryId, text) {
  return apiCall('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

// ─── Logging ───
function logEvent(event) {
  const entry = { ...event, timestamp: new Date().toISOString() };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

// ─── Dialogue flow ───
function handleStart(chatId, userId, username) {
  userStates.set(userId, { step: 'greeting' });
  sendMessage(chatId, TEXTS.welcome, {
    inline_keyboard: [
      [
        { text: TEXTS.categories.neiroseti, callback_data: 'cat_neiroseti' },
        { text: TEXTS.categories.soft, callback_data: 'cat_soft' },
      ],
      [
        { text: TEXTS.categories.podpiski, callback_data: 'cat_podpiski' },
        { text: TEXTS.categories.igry, callback_data: 'cat_igry' },
      ],
      [
        { text: TEXTS.categories.zagran, callback_data: 'cat_zagran' },
      ],
    ],
  });
  logEvent({ event: 'start', userId, username });
}

function handleCategory(chatId, userId, username, category) {
  userStates.set(userId, { step: 'followup', category });
  sendMessage(chatId, TEXTS.followUp, {
    inline_keyboard: [
      [{ text: 'Перейти к оформлению', url: REFERRAL_LINK }],
      [{ text: 'Для чего подходит карта', callback_data: 'info_forwhat' }],
    ],
  });
  logEvent({ event: 'category_selected', userId, username, category });
}

function handleForWhat(chatId, userId) {
  sendMessage(chatId, TEXTS.forWhat, {
    inline_keyboard: [
      [{ text: 'Перейти к оформлению', url: REFERRAL_LINK }],
    ],
  });
  logEvent({ event: 'info_viewed', userId, section: 'forwhat' });
}

function handleHelp(chatId) {
  sendMessage(chatId, TEXTS.help);
}

// ─── Update processor ───
async function processUpdate(update) {
  // Message
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || '';
    const text = msg.text || '';

    if (text === '/start') {
      handleStart(chatId, userId, username);
      return;
    }
    if (text === '/help') {
      handleHelp(chatId);
      return;
    }
    // Any other text — restart
    handleStart(chatId, userId, username);
  }

  // Callback query (inline buttons)
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const userId = cq.from.id;
    const username = cq.from.username || '';
    const data = cq.data;

    answerCallbackQuery(cq.id);

    if (data.startsWith('cat_')) {
      const category = data.replace('cat_', '');
      handleCategory(chatId, userId, username, category);
      return;
    }
    if (data === 'info_forwhat') {
      handleForWhat(chatId, userId);
      return;
    }
  }
}

// ─── Polling loop ───
let offset = 0;

async function poll() {
  try {
    const result = await apiCall('getUpdates', {
      offset,
      timeout: POLL_TIMEOUT,
      allowed_updates: ['message', 'callback_query'],
    });

    if (result.ok && result.result.length > 0) {
      for (const update of result.result) {
        await processUpdate(update);
        offset = update.update_id + 1;
      }
    }
  } catch (err) {
    console.error('[poll error]', err.message);
  }
  poll();
}

// ─── Start ───
console.log(`[bot] Starting @ivavit_bot (LeadGid 7397)...`);
console.log(`[bot] Referral link: ${REFERRAL_LINK}`);
console.log(`[bot] Log: ${LOG_FILE}`);
poll();
