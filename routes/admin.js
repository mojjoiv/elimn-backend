const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

router.get('/payments', auth, rbac(['admin']), async (req, res) => {
  try {
    const { status, order_id, phone } = req.query;
    let query = `
      SELECT p.id, p.order_id, o.status as order_status, p.mpesa_receipt,
             p.phone, p.amount, p.transaction_date, p.created_at
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) {
      query += ` AND o.status = $${idx++}`;
      params.push(status);
    }

    if (order_id) {
      query += ` AND p.order_id = $${idx++}`;
      params.push(order_id);
    }

    if (phone) {
      query += ` AND p.phone = $${idx++}`;
      params.push(phone);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await db.query(query, params);
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('admin payments error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
