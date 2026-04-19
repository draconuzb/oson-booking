const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// H2 fix: Batch-load services for multiple bookings in one query instead of N+1
async function attachServices(bookings) {
  if (bookings.length === 0) return bookings;
  const ids = bookings.map(b => b.id);
  const svcResult = await pool.query(
    `SELECT bs.booking_id, bs.price, sv.name_uz, sv.name_ru, sv.duration_minutes
     FROM booking_services bs JOIN services sv ON bs.service_id = sv.id
     WHERE bs.booking_id = ANY($1)`,
    [ids]
  );
  const svcMap = {};
  for (const row of svcResult.rows) {
    if (!svcMap[row.booking_id]) svcMap[row.booking_id] = [];
    svcMap[row.booking_id].push(row);
  }
  for (const booking of bookings) {
    booking.services = svcMap[booking.id] || [];
    booking.total_price = booking.services.reduce((sum, s) => sum + s.price, 0);
    booking.total_duration = booking.services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  }
  return bookings;
}

// Get all bookings (admin, with filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, date, barber_id } = req.query;
    let query = `SELECT bk.*, u.full_name as client_name, u.phone as client_phone,
      b.name_uz as barber_name_uz, s.name_uz as shop_name_uz
      FROM bookings bk
      JOIN users u ON bk.client_id = u.id
      JOIN barbers b ON bk.barber_id = b.id
      JOIN shops s ON b.shop_id = s.id`;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`bk.status = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`bk.booking_date = $${params.length}`);
    }
    if (barber_id) {
      params.push(barber_id);
      conditions.push(`bk.barber_id = $${params.length}`);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    // H6 fix: Add LIMIT for pagination safety
    query += ' ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT 200';

    const result = await pool.query(query, params);
    await attachServices(result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error('Bookings GET error:', err);
    res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// C5 fix: Get bookings for a specific client (admin only)
router.get('/client/:telegramId', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [req.params.telegramId]);
    if (user.rows.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT bk.*, b.name_uz as barber_name_uz, s.name_uz as shop_name_uz
       FROM bookings bk
       JOIN barbers b ON bk.barber_id = b.id
       JOIN shops s ON b.shop_id = s.id
       WHERE bk.client_id = $1
       ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT 20`,
      [user.rows[0].id]
    );

    await attachServices(result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error('Bookings error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// C5 fix: Get bookings for a specific barber (admin only)
router.get('/barber/:telegramId', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [req.params.telegramId]);
    if (user.rows.length === 0) return res.json([]);

    const barber = await pool.query('SELECT id FROM barbers WHERE user_id = $1', [user.rows[0].id]);
    if (barber.rows.length === 0) return res.json([]);

    const { status } = req.query;
    let query = `SELECT bk.*, u.full_name as client_name, u.phone as client_phone
       FROM bookings bk JOIN users u ON bk.client_id = u.id
       WHERE bk.barber_id = $1`;
    const params = [barber.rows[0].id];

    if (status) {
      params.push(status);
      query += ` AND bk.status = $${params.length}`;
    }

    query += ' ORDER BY bk.booking_date DESC, bk.booking_time DESC LIMIT 50';
    const result = await pool.query(query, params);

    await attachServices(result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error('Bookings error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// C4 fix: Create booking (admin only — bot uses pool.query directly)
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { client_id, barber_id, booking_date, booking_time, service_ids } = req.body;
    if (!client_id || !barber_id || !booking_date || !booking_time || !service_ids?.length) {
      return res.status(400).json({ error: 'Barcha maydonlar kerak' });
    }

    await client.query('BEGIN');

    const booking = await client.query(
      'INSERT INTO bookings (client_id, barber_id, booking_date, booking_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [client_id, barber_id, booking_date, booking_time]
    );

    for (const serviceId of service_ids) {
      const service = await client.query('SELECT price FROM services WHERE id = $1', [serviceId]);
      if (service.rows.length === 0) throw new Error(`Xizmat topilmadi: ${serviceId}`);

      await client.query(
        'INSERT INTO booking_services (booking_id, service_id, price) VALUES ($1, $2, $3)',
        [booking.rows[0].id, serviceId, service.rows[0].price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(booking.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bookings error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  } finally {
    client.release();
  }
});

// C4 fix: Update booking status (admin only)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Status noto\'g\'ri' });
    }

    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Bookings error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
