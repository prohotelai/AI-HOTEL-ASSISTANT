const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { requireOwnerOrManager } = require('../middlewares/roles');
const { logAudit } = require('../utils/audit');
const { validateRoleNames } = require('../utils/roles');

const router = express.Router();

router.get('/', requireAuth, tenantMiddleware, requireOwnerOrManager(), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { hotelId: req.hotelId },
      include: { roles: { include: { role: true } } },
    });

    const payload = users.map((u) => ({
      id: u.id,
      email: u.email,
      hotelId: u.hotelId,
      roles: u.roles.map((r) => r.role.name),
    }));
    return res.json({ users: payload });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, tenantMiddleware, requireOwnerOrManager(), async (req, res) => {
  try {
    const { email, password, roles = ['Staff'] } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    if (!password) return res.status(400).json({ error: 'password is required for new users' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    await prisma.user.create({ data: { id: userId, email, passwordHash, hotelId: req.hotelId } });

    const roleRecords = await validateRoleNames(roles);

    await Promise.all(
      roleRecords.map((role) =>
        prisma.userRole.create({ data: { id: uuidv4(), userId, roleId: role.id, hotelId: req.hotelId } })
      )
    );

    await logAudit({ hotelId: req.hotelId, userId: req.user.id, action: 'user.invite', metadata: { email, roles } });
    return res.status(201).json({ user: { id: userId, email, hotelId: req.hotelId, roles } });
  } catch (err) {
    if (err.code === 'INVALID_ROLE') {
      return res.status(400).json({ error: 'Role not permitted for this tenant' });
    }
    if (err.code === 'ROLE_NOT_PROVISIONED') {
      return res.status(400).json({ error: 'Role definitions missing; ensure roles are seeded' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, tenantMiddleware, requireOwnerOrManager(), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.hotelId !== req.hotelId) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });
    await logAudit({ hotelId: req.hotelId, userId: req.user.id, action: 'user.delete', metadata: { target: id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
