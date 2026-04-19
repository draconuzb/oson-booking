const { InlineKeyboard } = require('grammy');
const pool = require('../db/pool');
const { t, getName } = require('../i18n');

async function handleClientMenu(ctx) {
  const lang = ctx.session.lang;
  ctx.session.step = null;
  ctx.session.booking = {};

  const kb = new InlineKeyboard()
    .text(t(lang, 'book_now'), 'client:book')
    .row()
    .text(t(lang, 'my_bookings'), 'client:mybookings')
    .row()
    .text(t(lang, 'change_language'), 'client:changelang');

  const method = ctx.callbackQuery ? 'editMessageText' : 'reply';
  await ctx[method](t(lang, 'client_menu'), { reply_markup: kb });
}

async function handleClientBooking(ctx, data) {
  const lang = ctx.session.lang;

  // Start booking — show locations
  if (data === 'client:book') {
    // Check if user has name/phone, if not ask first
    const user = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [ctx.from.id]);
    if (user.rows.length > 0 && (!user.rows[0].full_name || !user.rows[0].phone)) {
      ctx.session.step = 'enter_name';
      return ctx.editMessageText(t(lang, 'enter_name'));
    }

    const locations = await pool.query('SELECT * FROM locations WHERE is_active = true ORDER BY name_uz');
    if (locations.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_locations'), {
        reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    const kb = new InlineKeyboard();
    for (const loc of locations.rows) {
      kb.text(getName(loc, lang), `loc:${loc.id}`).row();
    }
    kb.text(t(lang, 'back'), 'main_menu');

    await ctx.editMessageText(t(lang, 'select_location'), { reply_markup: kb });
  }

  // Location selected — show shops
  else if (data.startsWith('loc:')) {
    const locationId = data.split(':')[1];
    ctx.session.booking.location_id = locationId;

    const shops = await pool.query(
      'SELECT * FROM shops WHERE location_id = $1 AND is_active = true ORDER BY name_uz',
      [locationId]
    );

    if (shops.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_shops'), {
        reply_markup: new InlineKeyboard()
          .text(t(lang, 'back'), 'client:book')
          .text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    const kb = new InlineKeyboard();
    for (const shop of shops.rows) {
      kb.text(getName(shop, lang), `shop:${shop.id}`).row();
    }
    kb.text(t(lang, 'back'), 'client:book');

    await ctx.editMessageText(t(lang, 'select_shop'), { reply_markup: kb });
  }

  // Shop selected — show barbers
  else if (data.startsWith('shop:')) {
    const shopId = data.split(':')[1];
    ctx.session.booking.shop_id = shopId;

    const barbers = await pool.query(
      `SELECT b.* FROM barbers b JOIN users u ON b.user_id = u.id
       WHERE b.shop_id = $1 AND b.is_active = true AND u.status = 'active' ORDER BY b.name_uz`,
      [shopId]
    );

    if (barbers.rows.length === 0) {
      return ctx.editMessageText(t(lang, 'no_barbers'), {
        reply_markup: new InlineKeyboard()
          .text(t(lang, 'back'), `loc:${ctx.session.booking.location_id}`)
          .text(t(lang, 'main_menu'), 'main_menu'),
      });
    }

    const kb = new InlineKeyboard();
    for (const barber of barbers.rows) {
      kb.text(getName(barber, lang), `barber:${barber.id}`).row();
    }
    kb.text(t(lang, 'back'), `loc:${ctx.session.booking.location_id}`);

    await ctx.editMessageText(t(lang, 'select_barber'), { reply_markup: kb });
  }

  // Barber selected — show services
  else if (data.startsWith('barber:') && !data.includes('select')) {
    const barberId = data.split(':')[1];
    ctx.session.booking.barber_id = barberId;
    ctx.session.booking.selected_services = [];

    await showServiceSelection(ctx);
  }

  // Toggle service selection
  else if (data.startsWith('svc:toggle:')) {
    const serviceId = data.split(':')[2];
    const selected = ctx.session.booking.selected_services || [];

    const idx = selected.indexOf(serviceId);
    if (idx === -1) {
      selected.push(serviceId);
    } else {
      selected.splice(idx, 1);
    }
    ctx.session.booking.selected_services = selected;

    await showServiceSelection(ctx);
  }

  // Continue to date/time
  else if (data === 'svc:continue') {
    if (!ctx.session.booking.selected_services?.length) return;

    ctx.session.step = 'enter_datetime';
    await ctx.editMessageText(t(lang, 'enter_datetime'));
  }

  // Confirm booking
  else if (data === 'book:confirm') {
    await createBooking(ctx);
  }

  // Cancel booking
  else if (data === 'book:cancel') {
    ctx.session.booking = {};
    ctx.session.step = null;
    await handleClientMenu(ctx);
  }

  // My bookings
  else if (data === 'client:mybookings') {
    await showMyBookings(ctx);
  }

  // Cancel existing booking — notify barber too
  else if (data.startsWith('book:cancel:')) {
    const bookingId = data.split(':')[2];
    await pool.query("UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [bookingId]);

    // Notify barber about cancellation
    try {
      const bkInfo = await pool.query(
        `SELECT bk.booking_date, bk.booking_time,
         u.full_name as client_name,
         bu.telegram_id as barber_telegram_id, bu.language as barber_lang
         FROM bookings bk
         JOIN users u ON bk.client_id = u.id
         JOIN barbers b ON bk.barber_id = b.id
         JOIN users bu ON b.user_id = bu.id
         WHERE bk.id = $1`,
        [bookingId]
      );
      if (bkInfo.rows.length > 0 && bkInfo.rows[0].barber_telegram_id) {
        const bk = bkInfo.rows[0];
        const bLang = bk.barber_lang || 'uz';
        const cancelMsg = t(bLang, 'booking_cancelled_barber', {
          client: bk.client_name || 'Noma\'lum',
          date: bk.booking_date,
          time: bk.booking_time,
        });
        await ctx.api.sendMessage(bk.barber_telegram_id, cancelMsg);
      }
    } catch (notifyErr) {
      console.error('Failed to notify barber about cancellation:', notifyErr.message);
    }

    await ctx.editMessageText(t(lang, 'booking_cancelled'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  // Change language
  else if (data === 'client:changelang') {
    const kb = new InlineKeyboard()
      .text("🇺🇿 O'zbek", 'client:setlang:uz')
      .text('🇷🇺 Русский', 'client:setlang:ru')
      .row()
      .text('🇰🇿 Қазақ', 'client:setlang:kz')
      .text("🇺🇿 Ўзбек (Кирилл)", 'client:setlang:uz_cyrl');

    await ctx.editMessageText(t(lang, 'select_language'), { reply_markup: kb });
  }

  else if (data.startsWith('client:setlang:')) {
    const newLang = data.split(':')[2];
    ctx.session.lang = newLang;
    await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [newLang, ctx.from.id]);
    await handleClientMenu(ctx);
  }
}

async function showServiceSelection(ctx) {
  const lang = ctx.session.lang;
  const barberId = ctx.session.booking.barber_id;
  const selected = ctx.session.booking.selected_services || [];

  const services = await pool.query(
    'SELECT * FROM services WHERE barber_id = $1 AND is_active = true ORDER BY name_uz',
    [barberId]
  );

  if (services.rows.length === 0) {
    return ctx.editMessageText(t(lang, 'no_services'), {
      reply_markup: new InlineKeyboard()
        .text(t(lang, 'back'), `shop:${ctx.session.booking.shop_id}`)
        .text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  const kb = new InlineKeyboard();
  let summaryLines = [];
  let totalPrice = 0;
  let totalDuration = 0;

  for (const svc of services.rows) {
    const isSelected = selected.includes(svc.id);
    const prefix = isSelected ? '✅ ' : '';
    const label = `${prefix}${getName(svc, lang)} — ${svc.price.toLocaleString()} so'm (${svc.duration_minutes} daq)`;
    kb.text(label, `svc:toggle:${svc.id}`).row();

    if (isSelected) {
      summaryLines.push(`✅ ${getName(svc, lang)} — ${svc.price.toLocaleString()} so'm`);
      totalPrice += svc.price;
      totalDuration += svc.duration_minutes;
    }
  }

  if (selected.length > 0) {
    kb.text(t(lang, 'continue'), 'svc:continue').row();
  }
  kb.text(t(lang, 'cancel'), 'book:cancel');

  let text = t(lang, 'select_services');
  if (selected.length > 0) {
    text += '\n\n' + t(lang, 'selected_summary', {
      services: summaryLines.join('\n'),
      total_price: totalPrice.toLocaleString(),
      total_duration: totalDuration.toString(),
    });
  }

  await ctx.editMessageText(text, { reply_markup: kb });
}

async function handleDateTimeInput(ctx) {
  const lang = ctx.session.lang;
  const input = ctx.message.text.trim();

  // Simple date/time parsing — store as-is, parse basic format
  // M7 fix: Match UZ, RU, KZ month names + numeric months
  const dateMatch = input.match(/(\d{1,2})[-/.\s]*(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr|январ[яь]?|феврал[яь]?|март[а]?|апрел[яь]?|мая?|май|июн[яь]?|июл[яь]?|август[а]?|сентябр[яь]?|октябр[яь]?|ноябр[яь]?|декабр[яь]?|қаңтар|ақпан|наурыз|сәуір|мамыр|маусым|шілде|тамыз|қыркүйек|қазан|қараша|желтоқсан|\d{1,2})[-/.\s]*(\d{0,4})?\s*(\d{1,2}):(\d{2})/i);

  let bookingDate, bookingTime;

  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2];
    const year = dateMatch[3] || new Date().getFullYear();
    const hour = dateMatch[4].padStart(2, '0');
    const minute = dateMatch[5];

    // M7 fix: Support month names in UZ, RU, and KZ
    const months = {
      // Uzbek
      'yanvar': '01', 'fevral': '02', 'mart': '03', 'aprel': '04',
      'may': '05', 'iyun': '06', 'iyul': '07', 'avgust': '08',
      'sentabr': '09', 'oktabr': '10', 'noyabr': '11', 'dekabr': '12',
      // Russian
      'январ': '01', 'феврал': '02', 'март': '03', 'апрел': '04',
      'мая': '05', 'май': '05', 'июн': '06', 'июл': '07', 'август': '08',
      'сентябр': '09', 'октябр': '10', 'ноябр': '11', 'декабр': '12',
      // Kazakh
      'қаңтар': '01', 'ақпан': '02', 'наурыз': '03', 'сәуір': '04',
      'мамыр': '05', 'маусым': '06', 'шілде': '07', 'тамыз': '08',
      'қыркүйек': '09', 'қазан': '10', 'қараша': '11', 'желтоқсан': '12',
    };

    const monthLower = month.toLowerCase().replace(/[яьа]$/, '');  // strip Russian suffixes
    if (months[monthLower] || months[month.toLowerCase()]) {
      month = months[month.toLowerCase()] || months[monthLower];
    } else {
      month = month.padStart(2, '0');
    }

    bookingDate = `${year}-${month}-${day}`;
    bookingTime = `${hour}:${minute}`;
  } else {
    // Try simpler format: just time like "14:00" — assume today
    const timeOnly = input.match(/(\d{1,2}):(\d{2})/);
    if (timeOnly) {
      const today = new Date();
      bookingDate = today.toISOString().split('T')[0];
      bookingTime = `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}`;
    } else {
      return ctx.reply(t(lang, 'enter_datetime'));
    }
  }

  ctx.session.booking.date = bookingDate;
  ctx.session.booking.time = bookingTime;
  ctx.session.step = null;

  // Show booking summary
  const barber = await pool.query('SELECT b.*, s.name_uz as shop_name_uz, s.name_ru as shop_name_ru, s.name_kz as shop_name_kz, s.name_uz_cyrl as shop_name_uz_cyrl FROM barbers b JOIN shops s ON b.shop_id = s.id WHERE b.id = $1', [ctx.session.booking.barber_id]);
  const selectedIds = ctx.session.booking.selected_services;
  const services = await pool.query('SELECT * FROM services WHERE id = ANY($1)', [selectedIds]);

  const serviceNames = services.rows.map(s => getName(s, lang)).join(', ');
  const totalPrice = services.rows.reduce((sum, s) => sum + s.price, 0);

  const shopObj = { name_uz: barber.rows[0].shop_name_uz, name_ru: barber.rows[0].shop_name_ru, name_kz: barber.rows[0].shop_name_kz, name_uz_cyrl: barber.rows[0].shop_name_uz_cyrl };

  const summary = t(lang, 'booking_summary', {
    barber: getName(barber.rows[0], lang),
    shop: getName(shopObj, lang),
    services: serviceNames,
    total_price: totalPrice.toLocaleString(),
    date: bookingDate,
    time: bookingTime,
  });

  const kb = new InlineKeyboard()
    .text(t(lang, 'confirm_booking'), 'book:confirm')
    .text(t(lang, 'cancel'), 'book:cancel');

  await ctx.reply(summary, { reply_markup: kb });
}

async function createBooking(ctx) {
  const lang = ctx.session.lang;
  const booking = ctx.session.booking;

  // Get client user
  const user = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [ctx.from.id]);
  if (user.rows.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO bookings (client_id, barber_id, booking_date, booking_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [user.rows[0].id, booking.barber_id, booking.date, booking.time]
    );

    for (const serviceId of booking.selected_services) {
      const svc = await client.query('SELECT price FROM services WHERE id = $1', [serviceId]);
      await client.query(
        'INSERT INTO booking_services (booking_id, service_id, price) VALUES ($1, $2, $3)',
        [result.rows[0].id, serviceId, svc.rows[0].price]
      );
    }

    await client.query('COMMIT');

    // Notify barber
    const barber = await pool.query(
      `SELECT b.*, u.telegram_id as barber_telegram_id FROM barbers b JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
      [booking.barber_id]
    );

    const services = await pool.query('SELECT * FROM services WHERE id = ANY($1)', [booking.selected_services]);
    const serviceNames = services.rows.map(s => getName(s, lang)).join(', ');
    const totalPrice = services.rows.reduce((sum, s) => sum + s.price, 0);

    const clientUser = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [ctx.from.id]);

    if (barber.rows[0]?.barber_telegram_id) {
      const barberLang = (await pool.query('SELECT language FROM users WHERE id = $1', [barber.rows[0].user_id])).rows[0]?.language || 'uz';

      const notification = t(barberLang, 'new_booking_notification', {
        client: clientUser.rows[0].full_name || 'Noma\'lum',
        phone: clientUser.rows[0].phone || '-',
        services: serviceNames,
        total_price: totalPrice.toLocaleString(),
        date: booking.date,
        time: booking.time,
      });

      const kb = new InlineKeyboard()
        .text(t(barberLang, 'accept'), `bbook:accept:${result.rows[0].id}`)
        .text(t(barberLang, 'reject'), `bbook:reject:${result.rows[0].id}`);

      try {
        await ctx.api.sendMessage(barber.rows[0].barber_telegram_id, notification, { reply_markup: kb });
      } catch (err) {
        console.error('Failed to notify barber:', err.message);
      }
    }

    // H4 fix: use reply instead of editMessageText — after text input step there's no inline message to edit
    await ctx.reply(t(lang, 'booking_sent'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });

    ctx.session.booking = {};
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Booking error:', err);
    await ctx.reply(t(lang, 'error'));
  } finally {
    client.release();
  }
}

async function showMyBookings(ctx) {
  const lang = ctx.session.lang;
  const user = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [ctx.from.id]);
  if (user.rows.length === 0) return;

  const bookings = await pool.query(
    `SELECT bk.*, b.name_uz as barber_name_uz, b.name_ru as barber_name_ru, b.name_kz as barber_name_kz, b.name_uz_cyrl as barber_name_uz_cyrl,
     s.name_uz as shop_name_uz, s.name_ru as shop_name_ru
     FROM bookings bk
     JOIN barbers b ON bk.barber_id = b.id
     JOIN shops s ON b.shop_id = s.id
     WHERE bk.client_id = $1
     ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT 10`,
    [user.rows[0].id]
  );

  if (bookings.rows.length === 0) {
    return ctx.editMessageText(t(lang, 'no_bookings'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'main_menu'), 'main_menu'),
    });
  }

  const statusEmoji = { pending: '⏳', confirmed: '✅', rejected: '❌', cancelled: '🚫', completed: '✔️' };

  let text = t(lang, 'my_bookings') + '\n\n';
  const kb = new InlineKeyboard();

  for (const bk of bookings.rows) {
    const barberObj = { name_uz: bk.barber_name_uz, name_ru: bk.barber_name_ru, name_kz: bk.barber_name_kz, name_uz_cyrl: bk.barber_name_uz_cyrl };
    text += `${statusEmoji[bk.status] || ''} ${bk.booking_date} ${bk.booking_time} — ${getName(barberObj, lang)}\n`;

    if (bk.status === 'pending') {
      kb.text(`❌ ${bk.booking_date} ${bk.booking_time}`, `book:cancel:${bk.id}`).row();
    }
  }

  kb.text(t(lang, 'main_menu'), 'main_menu');

  await ctx.editMessageText(text, { reply_markup: kb });
}

module.exports = { handleClientMenu, handleClientBooking, handleDateTimeInput };
