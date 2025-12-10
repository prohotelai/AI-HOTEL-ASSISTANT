const prisma = require('../prisma');
const { verifyAccessToken } = require('../utils/tokens');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { hotel: true, roles: { include: { role: true } } } });

    if (!user || (payload.hotelId && user.hotelId !== payload.hotelId)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    req.hotelId = user.hotelId;
    req.authRoles = user.roles.map((r) => r.role.name);

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
