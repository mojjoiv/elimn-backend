INSERT INTO products (name, price, stock) VALUES
  ('Laptop', 999.99, 10),
  ('Phone', 499.50, 20),
  ('Headphones', 79.99, 50);

INSERT INTO users (email, password_hash)
VALUES ('demo@demo.com', '$2b$10$demoHashedPasswordHere')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'demo@demo.com' AND r.name = 'user'
ON CONFLICT DO NOTHING;

INSERT INTO orders (user_id, total_amount, status, metadata)
SELECT id, 1999.98, 'PAID', '{"note":"test order 1"}'
FROM users WHERE email='demo@demo.com';

INSERT INTO orders (user_id, total_amount, status, metadata)
SELECT id, 499.50, 'FAILED', '{"note":"test order 2"}'
FROM users WHERE email='demo@demo.com';

INSERT INTO order_items (order_id, product_id, unit_price, quantity)
SELECT 1, 1, 999.99, 2;

INSERT INTO order_items (order_id, product_id, unit_price, quantity)
SELECT 2, 2, 499.50, 1;

INSERT INTO payments (order_id, mpesa_receipt, phone, amount, transaction_date, raw_payload)
VALUES 
  (1, 'MPESA12345', '254700111222', 1999.98, now(), '{"mock":"payload"}'),
  (2, 'MPESA99999', '254700333444', 499.50, now(), '{"mock":"payload"}');

INSERT INTO payment_events (provider_event_id, provider_request_id, provider_event_type, payload, status)
VALUES
  ('CHK123', '1', 'CALLBACK', '{"mock":"callback"}', 'PAID'),
  ('CHK124', '2', 'CALLBACK', '{"mock":"callback"}', 'FAILED');
