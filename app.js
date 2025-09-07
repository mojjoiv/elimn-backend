require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const rbac = require('./middleware/rbac');

const ordersRouter = require('./routes/orders');
const authRoutes = require('./routes/auth');
const productsRouter = require('./routes/products');

const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);

app.get('/', (req, res) => res.json({ ok: true }));

app.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  
  app.get('/admin-only', authMiddleware, rbac(['admin']), (req, res) => {
    res.json({ message: 'Welcome, Admin!' });
  });

app.use('/orders', ordersRouter);
app.use('/products', productsRouter);
app.use('/payments', paymentsRouter);
app.use('/admin', adminRouter);


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));
