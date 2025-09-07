const db = require('../db');
const { initiateSTKPush } = require('../utils/mpesa');

async function processRetries() {
  try {
    const now = new Date();
    const res = await db.query(
      `SELECT * FROM payment_events
       WHERE status IN ('PENDING','FAILED')
       AND (next_attempt_at IS NULL OR next_attempt_at < $1)
       AND attempt_count < 3
       ORDER BY created_at ASC
       LIMIT 10`,
      [now]
    );

    for (const event of res.rows) {

      try {
        if (event.provider_event_type === 'STK_PUSH') {
          const orderId = event.provider_request_id;
          const orderRes = await db.query('SELECT * FROM orders WHERE id=$1', [orderId]);
          const order = orderRes.rows[0];
          if (!order) continue;

          const phone = order.metadata?.phone || '254708374149';

          const resp = await initiateSTKPush({
            phone,
            amount: order.total_amount,
            orderId
          });

          await db.query(
            `UPDATE payment_events
             SET status='RETRIED', payload=$1, attempt_count=attempt_count+1, updated_at=now()
             WHERE id=$2`,
            [resp, event.id]
          );
        }
      } catch (err) {

        await db.query(
          `UPDATE payment_events
           SET attempt_count=attempt_count+1, next_attempt_at=now() + interval '1 minute', last_error=$1, updated_at=now()
           WHERE id=$2`,
          [err.message, event.id]
        );
      }
    }
  } catch (err) {
    console.error('Retry worker error:', err);
  }
}

module.exports = { processRetries };
