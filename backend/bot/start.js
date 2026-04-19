const { InlineKeyboard } = require('grammy');
const pool = require('../db/pool');
const { t } = require('../i18n');

async function handleStart(ctx) {
  // Check if user exists
  const existing = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [ctx.from.id]);

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    ctx.session.lang = user.language;
    ctx.session.role = user.role;

    if (user.role === 'barber' && user.status === 'pending') {
      return ctx.reply(t(user.language, 'barber_registration_pending'));
    }

    // Go directly to menu
    if (user.role === 'barber') {
      const { handleBarberMenu } = require('./barber');
      return handleBarberMenu(ctx);
    } else {
      const { handleClientMenu } = require('./client');
      return handleClientMenu(ctx);
    }
  }

  // New user — select language
  const kb = new InlineKeyboard()
    .text("🇺🇿 O'zbek", 'lang:uz')
    .text('🇷🇺 Русский', 'lang:ru')
    .row()
    .text('🇰🇿 Қазақ', 'lang:kz')
    .text("🇺🇿 Ўзбек (Кирилл)", 'lang:uz_cyrl');

  await ctx.reply(t('uz', 'select_language'), { reply_markup: kb });
}

async function handleLanguageSelect(ctx, lang) {
  ctx.session.lang = lang;

  const kb = new InlineKeyboard()
    .text(t(lang, 'i_am_client'), 'role:client')
    .text(t(lang, 'i_am_barber'), 'role:barber');

  await ctx.editMessageText(t(lang, 'who_are_you'), { reply_markup: kb });
}

async function handleRoleSelect(ctx, role) {
  const lang = ctx.session.lang;
  ctx.session.role = role;

  if (role === 'client') {
    // Create client user immediately
    await pool.query(
      `INSERT INTO users (telegram_id, role, language, status) VALUES ($1, $2, $3, 'active')
       ON CONFLICT (telegram_id) DO UPDATE SET role = $2, language = $3`,
      [ctx.from.id, 'client', lang]
    );

    const { handleClientMenu } = require('./client');
    await handleClientMenu(ctx);
  } else {
    // Barber registration — ask for name
    ctx.session.step = 'barber_name';
    await ctx.editMessageText(t(lang, 'barber_register_name'));
  }
}

async function handleNameInput(ctx) {
  const lang = ctx.session.lang;
  const name = ctx.message.text.trim();

  // Update user name
  await pool.query('UPDATE users SET full_name = $1, updated_at = NOW() WHERE telegram_id = $2', [name, ctx.from.id]);

  ctx.session.step = 'enter_phone';
  await ctx.reply(t(lang, 'enter_phone'));
}

async function handlePhoneInput(ctx) {
  const lang = ctx.session.lang;
  const phone = ctx.message.text.trim();

  // Update user phone
  await pool.query('UPDATE users SET phone = $1, updated_at = NOW() WHERE telegram_id = $2', [phone, ctx.from.id]);

  ctx.session.step = null;
  await ctx.reply(t(lang, 'registration_complete'));

  // Show client menu
  const { handleClientMenu } = require('./client');
  await handleClientMenu(ctx);
}

module.exports = { handleStart, handleLanguageSelect, handleRoleSelect, handleNameInput, handlePhoneInput };
