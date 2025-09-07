const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { initiateSTKPush } = require('../utils/mpesa');
const { invalidateCacheForOrder } = require('../middleware/cache');

const router = express.Router();

router.post('/mpesa/initiate', auth, async (req, res) => {
  try {
    const { order_id, phone } = req.body;

    const orderRes = await db.query(
      'SELECT * FROM orders WHERE id=$1 AND user_id=$2',
      [order_id, req.user.sub]
    );
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'order not found' });

    const stkResponse = await initiateSTKPush({
      phone,
      amount: order.total_amount,
      orderId: order.id
    });

    await db.query(
      'INSERT INTO payment_events (provider_event_id, provider_request_id, provider_event_type, payload, status) VALUES ($1,$2,$3,$4,$5)',
      [stkResponse.CheckoutRequestID, order.id.toString(), 'STK_PUSH', stkResponse, 'PENDING']
    );

    res.json(stkResponse);
  } catch (err) {
    console.error('mpesa initiate error', err.response?.data || err.message);
    res.status(500).json({ error: 'mpesa error' });
  }
});

router.post('/mpesa/callback', async (req, res) => {
  try {
    const callback = req.body.Body.stkCallback;
    const { ResultCode, CheckoutRequestID, MerchantRequestID } = callback;
    const status = ResultCode === 0 ? 'PAID' : 'FAILED';

    const eventRes = await db.query(
      'SELECT provider_request_id FROM payment_events WHERE provider_event_id=$1',
      [CheckoutRequestID]
    );

    const event = eventRes.rows[0];
    if (event) {
      const orderId = event.provider_request_id;

      await db.query('UPDATE orders SET status=$1 WHERE id=$2', [status, orderId]);

      invalidateCacheForOrder(orderId);

      if (ResultCode === 0 && callback.CallbackMetadata) {
        const items = callback.CallbackMetadata.Item;
        const amount = items.find(i => i.Name === "Amount")?.Value || null;
        const receipt = items.find(i => i.Name === "MpesaReceiptNumber")?.Value || null;
        const phone = items.find(i => i.Name === "PhoneNumber")?.Value || null;
        const trxDate = items.find(i => i.Name === "TransactionDate")?.Value || null;

        let trxDateParsed = null;
        if (trxDate) {
          const s = trxDate.toString();
          trxDateParsed = new Date(
            `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}`
          );
        }

        await db.query(
          `INSERT INTO payments (order_id, mpesa_receipt, phone, amount, transaction_date, raw_payload)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, receipt, phone, amount, trxDateParsed, req.body]
        );
      }
    }

    await db.query(
      `INSERT INTO payment_events (provider_event_id, provider_request_id, provider_event_type, payload, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (provider_event_id) DO UPDATE
         SET status=$5, payload=$4, updated_at=now()`,
      [CheckoutRequestID, MerchantRequestID, 'CALLBACK', req.body, status]
    );

    res.json({ message: 'callback processed' });
  } catch (err) {
    console.error('mpesa callback error', err);
    res.status(500).json({ error: 'server error' });
  }
});  

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('fetch payments error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
