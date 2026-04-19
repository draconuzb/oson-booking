const { InlineKeyboard } = require('grammy');
const pool = require('../db/pool');
const { t, getName } = require('../i18n');

// === BARBER MENU ===

async function handleBarberMenu(ctx) {
  const lang = ctx.session.lang;
  ctx.session.step = null;

  const kb = new InlineKeyboard()
    .text(t(lang, 'new_bookings'), 'bmenu:new')
    .row()
    .text(t(lang, 'confirmed_bookings'), 'bmenu:confirmed')
    .row()
    .text(t(lang, 'today_schedule'), 'bmenu:today')
    .row()
    .text(t(lang, 'my_services'), 'bmenu:services')
    .row()
    .text(t(lang, 'booking_history'), 'bmenu:history')
    .row()
    .text(t(lang, 'change_language'), 'bmenu:changelang');

  const method = ctx.callbackQuery ? 'editMessageText' : 'reply';
  await ctx[method](t(lang, 'barber_menu'), { reply_markup: kb });
}

// === BARBER ACTIONS ===

async function handleBarberActions(ctx, data) {
  const lang = ctx.session.lang;

  // Get barber info
  const user = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [ctx.from.id]);
  if (user.rows.length === 0) return;
  const barber = await pool.query('SELECT * FROM barbers WHERE user_id = $1', [user.rows[0].id]);

  // New bookings
  if (data === 'bmenu:new') {
    if (barber.rows.length === 0) return;
    const bookings = await pool.query(
      `SELECT bk.*, u.full_name as client_name, u.phone as client_phone
       FROM bookings bk JOIN users u ON bk.client_id = u.id
       WHERE bk.barber_id = $1 AND bk.status = 'pending'
       ORDER BY bk.booking_date, bk.booking_time`,
      [barber.rows[0].id]
    );

    if (bookings.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_bookings'), {
        reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    let text = t(lang, 'new_bookings') + '\n\n';
    const kb = new InlineKeyboard();

    for (const bk of bookings.rows) {
      const services = await pool.query(
        `SELECT bs.price, sv.name_uz, sv.name_ru FROM booking_services bs JOIN services sv ON bs.service_id = sv.id WHERE bs.booking_id = $1`,
        [bk.id]
      );
      const serviceNames = services.rows.map(s => getName(s, lang)).join(', ');
      const totalPrice = services.rows.reduce((sum, s) => sum + s.price, 0);

      text += `👤 ${bk.client_name || 'Noma\'lum'}\n📱 ${bk.client_phone || '-'}\n✂️ ${serviceNames}\n💰 ${totalPrice.toLocaleString()} so'm\n📅 ${bk.booking_date} ${bk.booking_time}\n\n`;

      kb.text(t(lang, 'accept'), `bbook:accept:${bk.id}`)
        .text(t(lang, 'reject'), `bbook:reject:${bk.id}`)
        .row();
    }

    kb.text(t(lang, 'main_menu'), 'main_menu');
    await ctx.editMessageText(text, { reply_markup: kb });
  }

  // Accept booking
  else if (data.startsWith('bbook:accept:')) {
    const bookingId = data.split(':')[2];
    await pool.query("UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1", [bookingId]);

    // Notify client
    const booking = await pool.query(
      `SELECT bk.*, u.telegram_id as client_telegram_id, u.language as client_lang,
       b.name_uz, b.name_ru, b.name_kz, b.name_uz_cyrl,
       s.name_uz as shop_name_uz, s.name_ru as shop_name_ru, s.name_kz as shop_name_kz, s.name_uz_cyrl as shop_name_uz_cyrl
       FROM bookings bk
       JOIN users u ON bk.client_id = u.id
       JOIN barbers b ON bk.barber_id = b.id
       JOIN shops s ON b.shop_id = s.id
       WHERE bk.id = $1`,
      [bookingId]
    );

    if (booking.rows.length > 0) {
      const bk = booking.rows[0];
      const clientLang = bk.client_lang || 'uz';
      const barberObj = { name_uz: bk.name_uz, name_ru: bk.name_ru, name_kz: bk.name_kz, name_uz_cyrl: bk.name_uz_cyrl };
      const shopObj = { name_uz: bk.shop_name_uz, name_ru: bk.shop_name_ru, name_kz: bk.shop_name_kz, name_uz_cyrl: bk.shop_name_uz_cyrl };

      const msg = t(clientLang, 'booking_confirmed', {
        date: bk.booking_date,
        time: bk.booking_time,
        barber: getName(barberObj, clientLang),
        shop: getName(shopObj, clientLang),
      });

      try {
        await ctx.api.sendMessage(bk.client_telegram_id, msg);
      } catch (err) {
        console.error('Failed to notify client:', err.message);
      }
    }

    await ctx.editMessageText('✅ Bron tasdiqlandi!', {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  // Reject booking
  else if (data.startsWith('bbook:reject:')) {
    const bookingId = data.split(':')[2];
    await pool.query("UPDATE bookings SET status = 'rejected', updated_at = NOW() WHERE id = $1", [bookingId]);

    const booking = await pool.query(
      `SELECT u.telegram_id, u.language FROM bookings bk JOIN users u ON bk.client_id = u.id WHERE bk.id = $1`,
      [bookingId]
    );

    if (booking.rows.length > 0) {
      const clientLang = booking.rows[0].language || 'uz';
      try {
        await ctx.api.sendMessage(booking.rows[0].telegram_id, t(clientLang, 'booking_rejected'));
      } catch (err) {
        console.error('Failed to notify client:', err.message);
      }
    }

    await ctx.editMessageText('❌ Bron rad etildi.', {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  // Confirmed bookings
  else if (data === 'bmenu:confirmed') {
    if (barber.rows.length === 0) return;
    const bookings = await pool.query(
      `SELECT bk.*, u.full_name as client_name
       FROM bookings bk JOIN users u ON bk.client_id = u.id
       WHERE bk.barber_id = $1 AND bk.status = 'confirmed'
       ORDER BY bk.booking_date, bk.booking_time`,
      [barber.rows[0].id]
    );

    if (bookings.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_bookings'), {
        reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    let text = t(lang, 'confirmed_bookings') + '\n\n';
    for (const bk of bookings.rows) {
      text += `✅ ${bk.booking_date} ${bk.booking_time} — ${bk.client_name || 'Noma\'lum'}\n`;
    }

    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  // Today's schedule
  else if (data === 'bmenu:today') {
    if (barber.rows.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const bookings = await pool.query(
      `SELECT bk.*, u.full_name as client_name
       FROM bookings bk JOIN users u ON bk.client_id = u.id
       WHERE bk.barber_id = $1 AND bk.booking_date = $2 AND bk.status = 'confirmed'
       ORDER BY bk.booking_time`,
      [barber.rows[0].id, today]
    );

    if (bookings.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_bookings'), {
        reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    let text = t(lang, 'today_schedule') + '\n\n';
    for (const bk of bookings.rows) {
      text += `🕐 ${bk.booking_time} — ${bk.client_name || 'Noma\'lum'}\n`;
    }

    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  // History
  else if (data === 'bmenu:history') {
    if (barber.rows.length === 0) return;
    const bookings = await pool.query(
      `SELECT bk.*, u.full_name as client_name
       FROM bookings bk JOIN users u ON bk.client_id = u.id
       WHERE bk.barber_id = $1 AND bk.status IN ('completed', 'rejected', 'cancelled')
       ORDER BY bk.booking_date DESC LIMIT 20`,
      [barber.rows[0].id]
    );

    if (bookings.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_bookings'), {
        reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    const statusEmoji = { completed: '✔️', rejected: '❌', cancelled: '🚫' };
    let text = t(lang, 'booking_history') + '\n\n';
    for (const bk of bookings.rows) {
      text += `${statusEmoji[bk.status] || ''} ${bk.booking_date} ${bk.booking_time} — ${bk.client_name || 'Noma\'lum'}\n`;
    }

    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  // === SERVICES MANAGEMENT ===

  else if (data === 'bmenu:services') {
    await showBarberServices(ctx, barber.rows[0]?.id);
  }

  // Add service
  else if (data === 'bsvc:add') {
    ctx.session.step = 'service_name';
    ctx.session.serviceEdit = { barber_id: barber.rows[0]?.id };
    await ctx.editMessageText(t(lang, 'enter_service_name'));
  }

  // Edit service
  else if (data.startsWith('bsvc:edit:')) {
    const serviceId = data.split(':')[2];
    ctx.session.step = 'edit_service_name';
    ctx.session.serviceEdit = { service_id: serviceId };
    await ctx.editMessageText(t(lang, 'enter_service_name'));
  }

  // Delete service
  else if (data.startsWith('bsvc:del:')) {
    const serviceId = data.split(':')[2];
    await pool.query('DELETE FROM services WHERE id = $1', [serviceId]);
    await ctx.editMessageText(t(lang, 'service_deleted'));
    await showBarberServices(ctx, barber.rows[0]?.id, true);
  }

  // Select shop during barber registration
  else if (data.startsWith('bmenu:selectshop:')) {
    const shopId = data.split(':')[2];
    const userId = ctx.session.serviceEdit?.user_id;

    // H3 fix: replaced var with let
    let uid = userId;
    if (!uid) {
      const u = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [ctx.from.id]);
      if (u.rows.length === 0) return;
      uid = u.rows[0].id;
    }

    // Create barber record
    const name = (await pool.query('SELECT full_name FROM users WHERE id = $1', [uid])).rows[0]?.full_name || 'Sartarosh';
    await pool.query(
      'INSERT INTO barbers (user_id, shop_id, name_uz) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET shop_id = $2',
      [uid, shopId, name]
    );

    ctx.session.serviceEdit = {};
    await ctx.editMessageText(t(lang, 'barber_registration_pending'));
  }

  // Change language
  else if (data === 'bmenu:changelang') {
    const kb = new InlineKeyboard()
      .text("🇺🇿 O'zbek", 'bmenu:setlang:uz')
      .text('🇷🇺 Русский', 'bmenu:setlang:ru')
      .row()
      .text('🇰🇿 Қазақ', 'bmenu:setlang:kz')
      .text("🇺🇿 Ўзбек (Кирилл)", 'bmenu:setlang:uz_cyrl');

    await ctx.editMessageText(t(lang, 'select_language'), { reply_markup: kb });
  }

  else if (data.startsWith('bmenu:setlang:')) {
    const newLang = data.split(':')[2];
    ctx.session.lang = newLang;
    await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [newLang, ctx.from.id]);
    await handleBarberMenu(ctx);
  }
}

async function showBarberServices(ctx, barberId, useReply = false) {
  const lang = ctx.session.lang;

  if (!barberId) {
    return ctx.editMessageText(t(lang, 'error'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  const services = await pool.query(
    'SELECT * FROM services WHERE barber_id = $1 AND is_active = true ORDER BY name_uz',
    [barberId]
  );

  const kb = new InlineKeyboard();

  if (services.rows.length === 0) {
    const text = t(lang, 'no_services');
    kb.text(t(lang, 'add_service'), 'bsvc:add').row();
    kb.text(t(lang, 'main_menu'), 'main_menu');

    if (useReply) return ctx.reply(text, { reply_markup: kb });
    return ctx.editMessageText(text, { reply_markup: kb });
  }

  let text = t(lang, 'services_list') + '\n\n';

  for (let i = 0; i < services.rows.length; i++) {
    const svc = services.rows[i];
    text += `${i + 1}. ${getName(svc, lang)} — ${svc.price.toLocaleString()} so'm (${svc.duration_minutes} daq)\n`;
    kb.text(`✏️ ${i + 1}`, `bsvc:edit:${svc.id}`)
      .text(`🗑️ ${i + 1}`, `bsvc:del:${svc.id}`)
      .row();
  }

  kb.text(t(lang, 'add_service'), 'bsvc:add').row();
  kb.text(t(lang, 'main_menu'), 'main_menu');

  if (useReply) return ctx.reply(text, { reply_markup: kb });
  return ctx.editMessageText(text, { reply_markup: kb });
}

// === TEXT INPUT HANDLERS ===

// Barber registration
async function handleBarberNameInput(ctx) {
  const lang = ctx.session.lang;
  ctx.session.serviceEdit.name = ctx.message.text.trim();
  ctx.session.step = 'barber_phone';
  await ctx.reply(t(lang, 'barber_register_phone'));
}

async function handleBarberPhoneInput(ctx) {
  const lang = ctx.session.lang;
  const name = ctx.session.serviceEdit.name;
  const phone = ctx.message.text.trim();

  // Create user
  const result = await pool.query(
    `INSERT INTO users (telegram_id, role, full_name, phone, language, status) VALUES ($1, 'barber', $2, $3, $4, 'pending')
     ON CONFLICT (telegram_id) DO UPDATE SET role = 'barber', full_name = $2, phone = $3, language = $4, status = 'pending' RETURNING id`,
    [ctx.from.id, name, phone, lang]
  );

  // Show available shops to select
  const shops = await pool.query('SELECT * FROM shops WHERE is_active = true ORDER BY name_uz');

  if (shops.rows.length === 0) {
    ctx.session.step = null;
    return ctx.reply(t(lang, 'no_shops'));
  }

  const kb = new InlineKeyboard();
  for (const shop of shops.rows) {
    kb.text(getName(shop, lang), `bmenu:selectshop:${shop.id}`).row();
  }

  ctx.session.serviceEdit.user_id = result.rows[0].id;
  ctx.session.step = null;
  await ctx.reply(t(lang, 'barber_select_shop'), { reply_markup: kb });
}

// Service management text inputs
async function handleServiceNameInput(ctx) {
  const lang = ctx.session.lang;
  ctx.session.serviceEdit.name = ctx.message.text.trim();
  ctx.session.step = 'service_price';
  await ctx.reply(t(lang, 'enter_service_price'));
}

async function handleServicePriceInput(ctx) {
  const lang = ctx.session.lang;
  const price = parseInt(ctx.message.text.trim());
  if (isNaN(price) || price < 0) {
    return ctx.reply(t(lang, 'enter_service_price'));
  }

  ctx.session.serviceEdit.price = price;
  ctx.session.step = 'service_duration';
  await ctx.reply(t(lang, 'enter_service_duration'));
}

async function handleServiceDurationInput(ctx) {
  const lang = ctx.session.lang;
  const duration = parseInt(ctx.message.text.trim());
  if (isNaN(duration) || duration <= 0) {
    return ctx.reply(t(lang, 'enter_service_duration'));
  }

  const { barber_id, name, price } = ctx.session.serviceEdit;

  await pool.query(
    'INSERT INTO services (barber_id, name_uz, price, duration_minutes) VALUES ($1, $2, $3, $4)',
    [barber_id, name, price, duration]
  );

  ctx.session.step = null;
  ctx.session.serviceEdit = {};
  await ctx.reply(t(lang, 'service_added'));

  // Show updated services list
  await showBarberServices(ctx, barber_id, true);
}

async function handleEditServiceNameInput(ctx) {
  const lang = ctx.session.lang;
  ctx.session.serviceEdit.name = ctx.message.text.trim();
  ctx.session.step = 'edit_service_price';
  await ctx.reply(t(lang, 'enter_service_price'));
}

async function handleEditServicePriceInput(ctx) {
  const lang = ctx.session.lang;
  const price = parseInt(ctx.message.text.trim());
  if (isNaN(price) || price < 0) {
    return ctx.reply(t(lang, 'enter_service_price'));
  }

  ctx.session.serviceEdit.price = price;
  ctx.session.step = 'edit_service_duration';
  await ctx.reply(t(lang, 'enter_service_duration'));
}

async function handleEditServiceDurationInput(ctx) {
  const lang = ctx.session.lang;
  const duration = parseInt(ctx.message.text.trim());
  if (isNaN(duration) || duration <= 0) {
    return ctx.reply(t(lang, 'enter_service_duration'));
  }

  const { service_id, name, price } = ctx.session.serviceEdit;

  // M9 fix: Use RETURNING to get barber_id in same query, avoid stale lookup
  const svc = await pool.query(
    'UPDATE services SET name_uz = $1, price = $2, duration_minutes = $3, updated_at = NOW() WHERE id = $4 RETURNING barber_id',
    [name, price, duration, service_id]
  );

  ctx.session.step = null;
  ctx.session.serviceEdit = {};
  await ctx.reply(t(lang, 'service_updated'));

  if (svc.rows.length > 0) {
    await showBarberServices(ctx, svc.rows[0].barber_id, true);
  }
}

module.exports = {
  handleBarberMenu,
  handleBarberActions,
  handleBarberNameInput,
  handleBarberPhoneInput,
  handleServiceNameInput,
  handleServicePriceInput,
  handleServiceDurationInput,
  handleEditServiceNameInput,
  handleEditServicePriceInput,
  handleEditServiceDurationInput,
};
