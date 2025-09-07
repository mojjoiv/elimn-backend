const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { v4: uuidv4 } = require('uuid');
const { cacheMiddleware, invalidateCacheForOrder } = require('../middleware/cache');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  const client = await db.getClient();
  try {
    const { items, idempotencyKey } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items required' });
    }
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'idempotencyKey required' });
    }

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT * FROM idempotency_keys WHERE idempotency_key=$1',
      [idempotencyKey]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.json(existing.rows[0].response);
    }

    const productIds = items.map(i => i.product_id);
    const productsResult = await client.query(
      'SELECT * FROM products WHERE id = ANY($1) FOR UPDATE',
      [productIds]
    );

    let total = 0;
    for (const item of items) {
      const product = productsResult.rows.find(p => p.id === item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
      total += Number(product.price) * item.quantity;

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id=$2',
        [item.quantity, product.id]
      );
    }

    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES ($1,$2,$3) RETURNING *',
      [req.user.sub, total, 'CREATED']
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      const product = productsResult.rows.find(p => p.id === item.product_id);
      await client.query(
        'INSERT INTO order_items (order_id, product_id, unit_price, quantity) VALUES ($1,$2,$3,$4)',
        [order.id, product.id, product.price, item.quantity]
      );
    }

    const response = { order };
    await client.query(
      'INSERT INTO idempotency_keys (idempotency_key, user_id, status, response) VALUES ($1,$2,$3,$4)',
      [idempotencyKey, req.user.sub, 'SUCCESS', response]
    );

    await client.query('COMMIT');

    invalidateCacheForOrder(order.id);

    res.status(201).json(response);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('order error', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/:id', auth, cacheMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.sub]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('get order error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, q = "" } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT id, status, total_amount, created_at
       FROM orders
       WHERE CAST(id AS TEXT) ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("get orders error", err);
    res.status(500).json({ error: "failed to load orders" });
  }
});

router.patch('/:id', auth, rbac(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const result = await db.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "order not found" });
    }

    invalidateCacheForOrder(req.params.id);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("update order error", err);
    res.status(500).json({ error: "failed to update order" });
  }
});

module.exports = router;
