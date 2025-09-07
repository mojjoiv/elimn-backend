const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

router.post('/', auth, rbac(['admin']), async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    if (!name || !price || !stock) {
      return res.status(400).json({ error: 'name, price, stock required' });
    }

    const result = await db.query(
      'INSERT INTO products (name, price, stock) VALUES ($1,$2,$3) RETURNING *',
      [name, price, stock]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('create product error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('list products error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
