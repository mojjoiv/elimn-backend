const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../utils/jwt');

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertUser = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id, email, created_at',
      [email, hash]
    );
    const user = insertUser.rows[0];

    await db.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name='user'`,
      [user.id]
    );

    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already exists' });
    }
    console.error('register error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const userResult = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    const rolesRes = await db.query(
      `SELECT r.name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id=$1`,
      [user.id]
    );
    const roles = rolesRes.rows.map(r => r.name);

    const accessToken = jwtUtils.signAccessToken({ sub: user.id, email: user.email });

    res.json({ accessToken, role: roles[0] || 'user' });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
