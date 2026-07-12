// LeadGid Offer 7397 — Bot Texts (Russian)
// All user-facing texts for Plati Po Miru virtual card bot

const REFERRAL_LINK = 'https://go.leadgid.ru/aff_c?aff_id=149896&offer_id=7397&sub1=tg_bot&sub2=plati_po_miru_v1&sub3=mimo';

const TEXTS = {
  welcome: `Привет! 👋

Помогаю подобрать удобный способ оплаты зарубежных сервисов и подписок.

Что ты хочешь оплатить?`,

  categories: {
    neiroseti: '🧠 Нейросети',
    soft: '💻 Софт',
    podpiski: '📱 Подписки',
    igry: '🎮 Игры',
    zagran: '🌍 Покупки за границей',
  },

  followUp: `Отлично, это подходит!

Виртуальная карта позволит тебе оплачивать зарубежные сервисы, подписки, софт и игры.

Оформление онлайн за несколько минут. Пополнение рублями через СБП.

Хочешь оформить?`,

  cta: `Вот ссылка на оформление:

${REFERRAL_LINK}

После регистрации ты сможешь:
• оплачивать нейросети, софт, игры
• подписки на иностранные сервисы
• покупки на зарубежных сайтах

Пополнение рублями через СБП 🇷🇺`,

  forWhat: `Виртуальная карта подходит для:

🧠 Оплата нейросетей (ChatGPT, Midjourney, Claude)
💻 Покупка софта и лицензий
📱 Подписки (Netflix, Spotify, Apple, Google)
🎮 Игровые покупки (Steam, Epic, PlayStation)
🌍 Оплата на иностранных сайтах

Оформление онлайн за пару минут.`,

  help: `Я помогаю оплачивать зарубежные сервисы.

Нажми /start чтобы начать.`,

  error: `Что-то пошло не так. Попробуй ещё раз: /start`,
};

module.exports = { TEXTS, REFERRAL_LINK };
