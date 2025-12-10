const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { requireOwnerOrManager } = require('../middlewares/roles');
const { logAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, tenantMiddleware, async (_req, res) => {
  const roles = await prisma.role.findMany({});
  return res.json({ roles });
});

router.post('/assign', requireAuth, tenantMiddleware, requireOwnerOrManager(), async (req, res) => {
  try {
    const { userId, roleName } = req.body || {};
    if (!userId || !roleName) return res.status(400).json({ error: 'userId and roleName are required' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.hotelId !== req.hotelId) return res.status(404).json({ error: 'User not found' });

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    await prisma.userRole.upsert({
      where: { userId_roleId_hotelId: { userId, roleId: role.id, hotelId: req.hotelId } },
      create: { id: uuidv4(), userId, roleId: role.id, hotelId: req.hotelId },
      update: {},
    });

    await logAudit({ hotelId: req.hotelId, userId: req.user.id, action: 'role.assign', metadata: { target: userId, roleName } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/remove', requireAuth, tenantMiddleware, requireOwnerOrManager(), async (req, res) => {
  try {
    const { userId, roleName } = req.body || {};
    if (!userId || !roleName) return res.status(400).json({ error: 'userId and roleName are required' });

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    await prisma.userRole.deleteMany({ where: { userId, roleId: role.id, hotelId: req.hotelId } });
    await logAudit({ hotelId: req.hotelId, userId: req.user.id, action: 'role.remove', metadata: { target: userId, roleName } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
