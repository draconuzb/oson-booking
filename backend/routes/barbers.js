const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get barbers (optionally filter by shop)
router.get('/', async (req, res) => {
  try {
    const { shop_id } = req.query;
    let query = `SELECT b.*, s.name_uz as shop_name_uz, s.name_ru as shop_name_ru, u.telegram_id, u.phone as user_phone, u.status as user_status
      FROM barbers b
      JOIN users u ON b.user_id = u.id
      JOIN shops s ON b.shop_id = s.id
      WHERE b.is_active = true AND u.status = 'active'`;
    const params = [];

    if (shop_id) {
      params.push(shop_id);
      query += ` AND b.shop_id = $${params.length}`;
    }

    query += ' ORDER BY b.name_uz';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Get all barbers including pending (admin)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, s.name_uz as shop_name_uz, u.telegram_id, u.phone as user_phone, u.status as user_status
       FROM barbers b
       JOIN users u ON b.user_id = u.id
       JOIN shops s ON b.shop_id = s.id
       ORDER BY u.status, b.name_uz`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Create barber manually (admin)
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { shop_id, name_uz, phone, telegram_id } = req.body;
    if (!shop_id || !name_uz || !phone) {
      return res.status(400).json({ error: 'shop_id, name_uz va phone kerak' });
    }

    await client.query('BEGIN');

    // Create user first
    const tgId = telegram_id ? parseInt(telegram_id) : Date.now();
    const user = await client.query(
      `INSERT INTO users (telegram_id, role, full_name, phone, status) VALUES ($1, 'barber', $2, $3, 'active')
       ON CONFLICT (telegram_id) DO UPDATE SET role = 'barber', full_name = $2, phone = $3, status = 'active' RETURNING id`,
      [tgId, name_uz, phone]
    );

    // Create barber record
    const barber = await client.query(
      'INSERT INTO barbers (user_id, shop_id, name_uz) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET shop_id = $2, name_uz = $3 RETURNING *',
      [user.rows[0].id, shop_id, name_uz]
    );

    await client.query('COMMIT');
    res.status(201).json(barber.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  } finally {
    client.release();
  }
});

// Get single barber with services
router.get('/:id', async (req, res) => {
  try {
    const barber = await pool.query(
      `SELECT b.*, s.name_uz as shop_name_uz, s.name_ru as shop_name_ru
       FROM barbers b JOIN shops s ON b.shop_id = s.id WHERE b.id = $1`,
      [req.params.id]
    );
    if (barber.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });

    const services = await pool.query(
      'SELECT * FROM services WHERE barber_id = $1 AND is_active = true ORDER BY name_uz',
      [req.params.id]
    );

    res.json({ ...barber.rows[0], services: services.rows });
  } catch (err) {
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Approve/reject barber (admin) — H5 fix: notify barber via Telegram
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'rejected', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Status noto\'g\'ri' });
    }

    const barber = await pool.query(
      'SELECT b.user_id, u.telegram_id, u.language FROM barbers b JOIN users u ON b.user_id = u.id WHERE b.id = $1',
      [req.params.id]
    );
    if (barber.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });

    await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, barber.rows[0].user_id]);

    // H5: Notify barber via Telegram bot
    try {
      const { bot } = require('../bot/index');
      const { t } = require('../i18n');
      const lang = barber.rows[0].language || 'uz';
      const tgId = barber.rows[0].telegram_id;

      if (tgId && bot) {
        if (status === 'active') {
          await bot.api.sendMessage(tgId, t(lang, 'barber_approved'));
        } else if (status === 'rejected') {
          await bot.api.sendMessage(tgId, t(lang, 'barber_rejected'));
        }
      }
    } catch (notifyErr) {
      console.error('Failed to notify barber:', notifyErr.message);
    }

    res.json({ message: 'Holat yangilandi' });
  } catch (err) {
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Update barber (admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name_uz, name_ru, name_kz, name_uz_cyrl, bio_uz, bio_ru, bio_kz, bio_uz_cyrl, shop_id, is_active } = req.body;
    const result = await pool.query(
      `UPDATE barbers SET name_uz = COALESCE($1, name_uz), name_ru = COALESCE($2, name_ru), name_kz = COALESCE($3, name_kz), name_uz_cyrl = COALESCE($4, name_uz_cyrl), bio_uz = COALESCE($5, bio_uz), bio_ru = COALESCE($6, bio_ru), bio_kz = COALESCE($7, bio_kz), bio_uz_cyrl = COALESCE($8, bio_uz_cyrl), shop_id = COALESCE($9, shop_id), is_active = COALESCE($10, is_active), updated_at = NOW() WHERE id = $11 RETURNING *`,
      [name_uz, name_ru, name_kz, name_uz_cyrl, bio_uz, bio_ru, bio_kz, bio_uz_cyrl, shop_id, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Delete barber (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM barbers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ message: 'O\'chirildi' });
  } catch (err) {
    console.error('Barbers error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
