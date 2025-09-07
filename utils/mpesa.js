const axios = require('axios');
const moment = require('moment');
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

async function getToken() {
  const cachedToken = await redis.get("mpesa_access_token");
  if (cachedToken) {
    return cachedToken;
  }

  const url = process.env.MPESA_ENV === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  try {
    const res = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
    const token = res.data.access_token;
    const expiresIn = res.data.expires_in || 3600;

    await redis.set("mpesa_access_token", token, "EX", expiresIn - 60);

    console.log(`🔑 New M-Pesa token cached in Redis, valid for ${expiresIn}s`);
    return token;
  } catch (err) {
    console.error('M-Pesa token fetch error:', err.response?.data || err.message);
    throw new Error('Failed to fetch M-Pesa token');
  }
}

async function initiateSTKPush({ phone, amount, orderId }) {
  const token = await getToken();

  const timestamp = moment().format('YYYYMMDDHHmmss');
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const url = process.env.MPESA_ENV === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(Number(amount)),
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `ORDER_${orderId}`,
    TransactionDesc: `Payment for order ${orderId}`
  };

  try {
    const res = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error('STK Push error:', err.response?.data || err.message);
    throw new Error('M-Pesa STK Push failed');
  }
}

module.exports = { initiateSTKPush, getToken };
