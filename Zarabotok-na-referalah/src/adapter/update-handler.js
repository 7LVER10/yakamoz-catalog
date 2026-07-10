// Update Handler
// Processes Telegram updates into lead-shaped objects

function handleUpdate(update) {
  if (!update || typeof update !== 'object') {
    return { action: 'skip', reason: 'invalid_update' };
  }

  if (!update.update_id && update.update_id !== 0) {
    return { action: 'skip', reason: 'missing_update_id' };
  }

  // Determine update type
  const type = detectType(update);

  if (type === 'unsupported') {
    return { action: 'skip', reason: 'unsupported_type', updateId: update.update_id };
  }

  if (type !== 'message') {
    return { action: 'skip', reason: 'unsupported_type', updateId: update.update_id };
  }

  const message = update.message;
  if (!message) {
    return { action: 'skip', reason: 'no_message', updateId: update.update_id };
  }

  // Must have text content
  if (!message.text || typeof message.text !== 'string' || message.text.trim() === '') {
    return { action: 'skip', reason: 'no_text_content', updateId: update.update_id };
  }

  // Extract user info
  const from = message.from || {};
  const chat = message.chat || {};

  // Build lead-shaped object
  const lead = {
    offerId: extractOfferId(message.text),
    source: 'telegram',
    contact: {
      telegramId: from.id || null,
      username: from.username || null,
      firstName: from.first_name || null,
      lastName: from.last_name || null,
      languageCode: normalizeLanguage(from.language_code)
    },
    metadata: {
      updateId: update.update_id,
      chatId: chat.id || null,
      messageText: message.text,
      fromId: from.id || null
    }
  };

  return { action: 'process', updateId: update.update_id, lead };
}

function detectType(update) {
  if (update.message) return 'message';
  if (update.edited_message) return 'unsupported';
  if (update.channel_post) return 'unsupported';
  if (update.edited_channel_post) return 'unsupported';
  if (update.inline_query) return 'unsupported';
  if (update.chosen_inline_result) return 'unsupported';
  if (update.callback_query) return 'unsupported';
  if (update.shipping_query) return 'unsupported';
  if (update.pre_checkout_query) return 'unsupported';
  if (update.poll) return 'unsupported';
  if (update.poll_answer) return 'unsupported';
  return 'unsupported';
}

function extractOfferId(text) {
  // Simple pattern: /start off_XXXX or first word as command
  if (text.startsWith('/start ')) {
    const parts = text.split(' ');
    return parts[1] || null;
  }
  return null;
}

function normalizeLanguage(code) {
  if (!code || typeof code !== 'string') return null;
  return code.trim().toLowerCase().slice(0, 2);
}

module.exports = { handleUpdate, detectType, extractOfferId, normalizeLanguage };
