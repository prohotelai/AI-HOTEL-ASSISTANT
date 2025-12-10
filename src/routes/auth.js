const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../prisma');
const {
  generateAccessToken,
  generateRefreshToken,
  REFRESH_EXPIRES_IN,
  normalizeDurationMs,
} = require('../utils/tokens');
const { logAudit } = require('../utils/audit');
const { ensureDefaultRoles } = require('../utils/roles');

const router = express.Router();
const MINUTE_MS = 60 * 1000;
const MAGIC_LINK_EXPIRY_MS = 15 * MINUTE_MS;
const RESET_EXPIRY_MS = 30 * MINUTE_MS;

async function buildSession(user, roles) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + normalizeDurationMs(REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000));
  await prisma.session.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      hotelId: user.hotelId,
      type: 'REFRESH',
      refreshToken,
      expiresAt,
    },
  });
  const accessToken = generateAccessToken(user, roles);
  return { accessToken, refreshToken };
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, hotelName } = req.body || {};
    if (!email || !password || !hotelName) {
      return res.status(400).json({ error: 'email, password, and hotelName are required' });
    }

    await ensureDefaultRoles();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hotelId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });

    const { hotel, user } = await prisma.$transaction(async (tx) => {
      const createdHotel = await tx.hotel.create({ data: { id: hotelId, name: hotelName } });
      const createdUser = await tx.user.create({
        data: {
          id: userId,
          email,
          passwordHash,
          hotelId,
        },
      });
      await tx.userRole.create({ data: { id: uuidv4(), userId, roleId: ownerRole.id, hotelId } });
      return { hotel: createdHotel, user: createdUser };
    });

    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    const roleNames = userWithRoles.roles.map((r) => r.role.name);
    const tokens = await buildSession(userWithRoles, roleNames);

    await logAudit({ hotelId, userId, action: 'auth.signup', metadata: { email } });

    return res.status(201).json({
      user: { id: userId, email, hotelId },
      hotel,
      roles: roleNames,
      ...tokens,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = user.roles.map((r) => r.role.name);
    const tokens = await buildSession(user, roles);
    await logAudit({ hotelId: user.hotelId, userId: user.id, action: 'auth.login', metadata: { email } });

    return res.json({ user: { id: user.id, email: user.email, hotelId: user.hotelId }, roles, ...tokens });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/magic-link/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);
    await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        hotelId: user.hotelId,
        type: 'MAGIC',
        token,
        expiresAt,
      },
    });

    await logAudit({ hotelId: user.hotelId, userId: user.id, action: 'auth.magic.request', metadata: { email } });

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[magic-link] token for ${email}: ${token}`);
    }
    return res.json({ expiresAt });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/magic-link/verify', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token is required' });

    const session = await prisma.session.findFirst({ where: { token, type: 'MAGIC' } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const roles = user.roles.map((r) => r.role.name);

    await prisma.session.delete({ where: { id: session.id } });
    const tokens = await buildSession(user, roles);
    await logAudit({ hotelId: user.hotelId, userId: user.id, action: 'auth.magic.verify' });

    return res.json({ user: { id: user.id, email: user.email, hotelId: user.hotelId }, roles, ...tokens });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    const session = await prisma.session.findFirst({ where: { refreshToken, type: 'REFRESH' } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return res.status(401).json({ error: 'Invalid session' });
    const roles = user.roles.map((r) => r.role.name);
    const accessToken = generateAccessToken(user, roles);

    return res.json({ accessToken });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    await prisma.session.deleteMany({ where: { refreshToken, type: 'REFRESH' } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);

    await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        hotelId: user.hotelId,
        type: 'RESET',
        token,
        expiresAt,
      },
    });

    await logAudit({ hotelId: user.hotelId, userId: user.id, action: 'auth.reset.request' });
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[password-reset] token for ${email}: ${token}`);
    }
    return res.json({ expiresAt });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required' });

    const session = await prisma.session.findFirst({ where: { token, type: 'RESET' } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } });
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.session.deleteMany({ where: { userId: session.userId, type: 'REFRESH' } });

    await logAudit({ hotelId: session.hotelId, userId: session.userId, action: 'auth.reset.confirm' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
