const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all shops (optionally filter by location)
router.get('/', async (req, res) => {
  try {
    const { location_id } = req.query;
    let query = 'SELECT s.*, l.name_uz as location_name_uz, l.name_ru as location_name_ru FROM shops s JOIN locations l ON s.location_id = l.id WHERE s.is_active = true';
    const params = [];

    if (location_id) {
      params.push(location_id);
      query += ` AND s.location_id = $${params.length}`;
    }

    query += ' ORDER BY s.name_uz';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Shops error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Get single shop
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, l.name_uz as location_name_uz FROM shops s JOIN locations l ON s.location_id = l.id WHERE s.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Shops error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Create shop (admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { location_id, name_uz, name_ru, name_kz, name_uz_cyrl, address, phone } = req.body;
    if (!location_id || !name_uz) return res.status(400).json({ error: 'location_id va name_uz kerak' });

    const result = await pool.query(
      'INSERT INTO shops (location_id, name_uz, name_ru, name_kz, name_uz_cyrl, address, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [location_id, name_uz, name_ru, name_kz, name_uz_cyrl, address, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Shops error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Update shop (admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { location_id, name_uz, name_ru, name_kz, name_uz_cyrl, address, phone, is_active } = req.body;
    const result = await pool.query(
      `UPDATE shops SET location_id = COALESCE($1, location_id), name_uz = COALESCE($2, name_uz), name_ru = COALESCE($3, name_ru), name_kz = COALESCE($4, name_kz), name_uz_cyrl = COALESCE($5, name_uz_cyrl), address = COALESCE($6, address), phone = COALESCE($7, phone), is_active = COALESCE($8, is_active), updated_at = NOW() WHERE id = $9 RETURNING *`,
      [location_id, name_uz, name_ru, name_kz, name_uz_cyrl, address, phone, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Shops error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Delete shop (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM shops WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ message: 'O\'chirildi' });
  } catch (err) {
    console.error('Shops error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
