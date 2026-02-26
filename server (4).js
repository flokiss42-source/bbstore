const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── КОНФИГ — берётся из Environment Variables на Render ─────
const TG_TOKEN  = process.env.TG_TOKEN;
const TG_CHATID = process.env.TG_CHATID;
const GROK_KEY  = process.env.GROK_KEY;

if (!TG_TOKEN || !TG_CHATID || !GROK_KEY) {
  console.error('❌ Не заданы переменные окружения: TG_TOKEN, TG_CHATID, GROK_KEY');
  process.exit(1);
}
// ────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'BB·BOTS backend running' }));

// ── GROK PROXY /api/chat ──────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const SYSTEM = `Ты AI-ассистент компании BB·BOTS. Помогаешь потенциальным клиентам выбрать нужного AI-бота для их бизнеса. Отвечай кратко, дружелюбно, по делу. На русском языке.

О нас: BB·BOTS делает реальных AI-ботов для Telegram под разные ниши бизнеса. Настраиваем AI под конкретный бизнес и его стиль. Боты понимают свободный текст, ведут диалог.

Каталог ботов:
- Бот для салона красоты — от 15 000 ₽/мес
- Бот для магазина — от 15 000 ₽/мес
- Бот для риелтора — от 19 000 ₽/мес
- HR-бот первичного отбора — от 22 000 ₽/мес
- Юридический бот-консультант — от 24 000 ₽/мес
- Бот для репетитора/онлайн-школы — от 15 000 ₽/мес
- Бот для ресторана/кафе — от 15 000 ₽/мес
- Бот для автосалона — от 22 000 ₽/мес
- Бот под заказ — индивидуально

Тарифы:
- Старт (1 мес) — 15 000 ₽
- Бизнес (2 мес) — 27 000 ₽
- Профи (3 мес) — 39 000 ₽

Экономия: бот экономит ~94 000 ₽/мес по сравнению со штатным менеджером.
Запуск: 24 часа после оплаты. Поддержка включена.

Если клиент хочет заказать — предложи заполнить форму на сайте (кнопка "Получить бота") или написать в Telegram: @beyond_birthdayLB`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROK_KEY}`
      },
      body: JSON.stringify({
        model:       'grok-2',
        max_tokens:  400,
        temperature: 0.7,
        messages:    [{ role: 'system', content: SYSTEM }, ...messages]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Grok error:', data);
      return res.status(502).json({ error: 'Grok API error', detail: data });
    }

    res.json({ reply: data.choices[0].message.content });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── TELEGRAM NOTIFY /notify (для уведомлений с сайта) ────────
app.post('/notify', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'no text' });

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: TG_CHATID, text, parse_mode: 'HTML' })
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── TELEGRAM WEBHOOK /webhook ─────────────────────────────────
app.post('/webhook', async (req, res) => {
  try {
    const { name, contact, bot, period, desc, time } = req.body;

    const text = `📬 <b>Новая заявка BB·BOTS</b>\n\n`
      + `👤 Имя: <b>${name}</b>\n`
      + `📱 Контакт: <b>${contact}</b>\n`
      + `🤖 Бот: <b>${bot || 'не указан'}</b>\n`
      + `📅 Период: <b>${period || 'не указан'}</b>\n`
      + `💬 О бизнесе: ${desc || '—'}\n\n`
      + `🕐 ${time || new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: TG_CHATID, text, parse_mode: 'HTML' })
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`BB·BOTS backend running on port ${PORT}`));
