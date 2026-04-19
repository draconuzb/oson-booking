const express = require('express');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// H6 fix: Get all clients with pagination (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const [countResult, result] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'"),
      pool.query(
        "SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      ),
    ]);

    res.json({
      clients: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('Clients error:', err.message); res.status(500).json({ error: 'Ichki xatolik' });
  }
});

module.exports = router;
