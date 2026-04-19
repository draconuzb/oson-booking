const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get services for a barber (public)
router.get('/barber/:barberId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM services WHERE barber_id = $1 AND is_active = true ORDER BY name_uz',
      [req.params.barberId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Services error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Get all services (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sv.*, b.name_uz as barber_name_uz
       FROM services sv JOIN barbers b ON sv.barber_id = b.id
       ORDER BY b.name_uz, sv.name_uz`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Services error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// C3 fix: Create service (admin only — bot uses pool.query directly)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { barber_id, name_uz, name_ru, name_kz, name_uz_cyrl, price, duration_minutes } = req.body;
    if (!barber_id || !name_uz || price === undefined) {
      return res.status(400).json({ error: 'barber_id, name_uz va price kerak' });
    }
    // M6 fix: Validate numeric fields
    const parsedPrice = parseInt(price);
    const parsedDuration = parseInt(duration_minutes) || 30;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Narx noto\'g\'ri' });
    }
    if (parsedDuration <= 0) {
      return res.status(400).json({ error: 'Davomiylik noto\'g\'ri' });
    }

    const result = await pool.query(
      'INSERT INTO services (barber_id, name_uz, name_ru, name_kz, name_uz_cyrl, price, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [barber_id, name_uz, name_ru, name_kz, name_uz_cyrl, parsedPrice, parsedDuration]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Services error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// C3 fix: Update service (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name_uz, name_ru, name_kz, name_uz_cyrl, price, duration_minutes, is_active } = req.body;
    const result = await pool.query(
      `UPDATE services SET name_uz = COALESCE($1, name_uz), name_ru = COALESCE($2, name_ru), name_kz = COALESCE($3, name_kz), name_uz_cyrl = COALESCE($4, name_uz_cyrl), price = COALESCE($5, price), duration_minutes = COALESCE($6, duration_minutes), is_active = COALESCE($7, is_active), updated_at = NOW() WHERE id = $8 RETURNING *`,
      [name_uz, name_ru, name_kz, name_uz_cyrl, price, duration_minutes, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Services error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// C3 fix: Delete service (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ message: 'O\'chirildi' });
  } catch (err) {
    console.error('Services error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
