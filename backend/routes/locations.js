const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all locations (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE is_active = true ORDER BY name_uz');
    res.json(result.rows);
  } catch (err) {
    console.error('Locations error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Get single location
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Locations error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Create location (admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name_uz, name_ru, name_kz, name_uz_cyrl } = req.body;
    if (!name_uz) return res.status(400).json({ error: 'name_uz kerak' });

    const result = await pool.query(
      'INSERT INTO locations (name_uz, name_ru, name_kz, name_uz_cyrl) VALUES ($1, $2, $3, $4) RETURNING *',
      [name_uz, name_ru, name_kz, name_uz_cyrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Locations error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Update location (admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name_uz, name_ru, name_kz, name_uz_cyrl, is_active } = req.body;
    const result = await pool.query(
      'UPDATE locations SET name_uz = COALESCE($1, name_uz), name_ru = COALESCE($2, name_ru), name_kz = COALESCE($3, name_kz), name_uz_cyrl = COALESCE($4, name_uz_cyrl), is_active = COALESCE($5, is_active) WHERE id = $6 RETURNING *',
      [name_uz, name_ru, name_kz, name_uz_cyrl, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Locations error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

// Delete location (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ message: 'O\'chirildi' });
  } catch (err) {
    console.error('Locations error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
