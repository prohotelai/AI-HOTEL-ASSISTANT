const prisma = require('../prisma');

async function logAudit({ hotelId, userId, action, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        hotelId,
        userId: userId || null,
        action,
        metadata: metadata || {},
      },
    });
  } catch (err) {
    // Non-blocking logging to avoid interrupting request flow
    // eslint-disable-next-line no-console
    console.error('Audit log failed', err);
  }
}

module.exports = { logAudit };
