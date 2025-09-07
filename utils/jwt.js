const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES || '240m';

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };
