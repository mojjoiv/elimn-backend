# Backend - E-commerce API

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env` with PostgreSQL + JWT + M-Pesa credentials
3. Run migrations:
   ```bash
   psql -h localhost -U dev -d appdb -f migrations/001_init_schema.sql
   ```
   ```bash
      psql -h localhost -U dev -d appdb -f migrations/002_add_payments.sql
   ```
4. Start server:
   ```bash
   npm run dev
   ```

## Endpoints
- `POST /auth/register` – register new user
- `POST /auth/login` – login and receive JWT
- `POST /products` – create product (admin)
- `POST /orders` – create order (idempotent)
- `POST /payments/mpesa/initiate` – initiate M-Pesa STK push
- `POST /payments/mpesa/callback` – receive payment callback (from Safaricom)

## Notes
- Orders use idempotency keys
- Payment events recorded in `payment_events`
- Order status updated via callbacks
- LRU cache used for order retrieval
