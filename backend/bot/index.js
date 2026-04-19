const { Bot, session } = require('grammy');
const pool = require('../db/pool');
const { t } = require('../i18n');
const { handleStart, handleLanguageSelect, handleRoleSelect } = require('./start');
const { handleClientMenu, handleClientBooking } = require('./client');
const { handleBarberMenu, handleBarberActions } = require('./barber');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Session middleware
bot.use(session({
  initial: () => ({
    lang: 'uz',
    step: null,
    role: null,
    booking: {},
    serviceEdit: {},
  }),
}));

// /start command
bot.command('start', handleStart);

// Callback queries
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  try {
    // Language selection
    if (data.startsWith('lang:')) {
      await handleLanguageSelect(ctx, data.split(':')[1]);
    }
    // Role selection
    else if (data.startsWith('role:')) {
      await handleRoleSelect(ctx, data.split(':')[1]);
    }
    // Client actions
    else if (data.startsWith('client:') || data.startsWith('loc:') || data.startsWith('shop:') || data.startsWith('barber:') || data.startsWith('svc:') || data.startsWith('book:')) {
      await handleClientBooking(ctx, data);
    }
    // Barber actions
    else if (data.startsWith('bmenu:') || data.startsWith('bsvc:') || data.startsWith('bbook:')) {
      await handleBarberActions(ctx, data);
    }
    // Main menu
    else if (data === 'main_menu') {
      const user = await getUser(ctx.from.id);
      if (user?.role === 'barber') {
        await handleBarberMenu(ctx);
      } else {
        await handleClientMenu(ctx);
      }
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error('Callback error:', err);
    await ctx.answerCallbackQuery({ text: t(ctx.session.lang, 'error') });
  }
});

// Text messages (for free-text inputs like name, phone, date/time, service details)
bot.on('message:text', async (ctx) => {
  const step = ctx.session.step;

  try {
    // Client registration
    if (step === 'enter_name') {
      const { handleNameInput } = require('./start');
      await handleNameInput(ctx);
    }
    else if (step === 'enter_phone') {
      const { handlePhoneInput } = require('./start');
      await handlePhoneInput(ctx);
    }
    // Booking date/time
    else if (step === 'enter_datetime') {
      const { handleDateTimeInput } = require('./client');
      await handleDateTimeInput(ctx);
    }
    // Barber registration
    else if (step === 'barber_name') {
      const { handleBarberNameInput } = require('./barber');
      await handleBarberNameInput(ctx);
    }
    else if (step === 'barber_phone') {
      const { handleBarberPhoneInput } = require('./barber');
      await handleBarberPhoneInput(ctx);
    }
    // Service management
    else if (step === 'service_name') {
      const { handleServiceNameInput } = require('./barber');
      await handleServiceNameInput(ctx);
    }
    else if (step === 'service_price') {
      const { handleServicePriceInput } = require('./barber');
      await handleServicePriceInput(ctx);
    }
    else if (step === 'service_duration') {
      const { handleServiceDurationInput } = require('./barber');
      await handleServiceDurationInput(ctx);
    }
    else if (step === 'edit_service_name') {
      const { handleEditServiceNameInput } = require('./barber');
      await handleEditServiceNameInput(ctx);
    }
    else if (step === 'edit_service_price') {
      const { handleEditServicePriceInput } = require('./barber');
      await handleEditServicePriceInput(ctx);
    }
    else if (step === 'edit_service_duration') {
      const { handleEditServiceDurationInput } = require('./barber');
      await handleEditServiceDurationInput(ctx);
    }
  } catch (err) {
    console.error('Message error:', err);
    await ctx.reply(t(ctx.session.lang, 'error'));
  }
});

async function getUser(telegramId) {
  const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return result.rows[0] || null;
}

// Start bot
bot.start();
console.log('OsonBooking bot started!');

module.exports = { bot, getUser };
