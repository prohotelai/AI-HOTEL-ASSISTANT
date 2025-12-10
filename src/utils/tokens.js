const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '30d';
const TIME_MULTIPLIERS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

function normalizeDurationMs(value, fallbackMs) {
  if (!value) return fallbackMs;
  if (typeof value === 'number') return value;
  const match = /^([0-9]+)([smhd])$/.exec(value);
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  return amount * (TIME_MULTIPLIERS[unit] || 1);
}

function generateAccessToken(user, roles) {
  return jwt.sign(
    {
      sub: user.id,
      hotelId: user.hotelId,
      roles,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  return uuidv4();
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired JWT token');
    error.code = 'INVALID_TOKEN';
    throw error;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  normalizeDurationMs,
};
