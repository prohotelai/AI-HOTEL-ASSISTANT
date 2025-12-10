const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { logAudit } = require('../utils/audit');
const { generateAccessToken, generateRefreshToken, normalizeDurationMs, REFRESH_EXPIRES_IN } = require('../utils/tokens');
const { ensureDefaultRoles } = require('../utils/roles');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { hotelName, email, password } = req.body || {};
    if (!hotelName || !email || !password) {
      return res.status(400).json({ error: 'hotelName, email, and password are required' });
    }

    await ensureDefaultRoles();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hotelId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });

    const hotel = await prisma.hotel.create({ data: { id: hotelId, name: hotelName } });
    await prisma.user.create({ data: { id: userId, email, passwordHash, hotelId } });
    await prisma.userRole.create({ data: { id: uuidv4(), userId, roleId: ownerRole.id, hotelId } });

    const roles = ['Owner'];
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + normalizeDurationMs(REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000));
    await prisma.session.create({ data: { id: uuidv4(), userId, hotelId, type: 'REFRESH', refreshToken, expiresAt } });
    const accessToken = generateAccessToken({ id: userId, hotelId }, roles);

    await logAudit({ hotelId, userId, action: 'hotel.create', metadata: { hotelName } });
    return res.status(201).json({ hotel, user: { id: userId, email, hotelId }, roles, accessToken, refreshToken });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, tenantMiddleware, async (req, res) => {
  return res.json({ hotel: req.hotel });
});

module.exports = router;
