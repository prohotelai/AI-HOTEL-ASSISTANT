const { v4: uuidv4 } = require('uuid');
const prisma = require('../prisma');
const { DEFAULT_ROLES } = require('../constants');

async function ensureDefaultRoles() {
  await Promise.all(
    DEFAULT_ROLES.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { id: uuidv4(), name },
      })
    )
  );
}

async function validateRoleNames(roleNames = []) {
  const uniqueNames = Array.from(new Set(roleNames));
  await ensureDefaultRoles();
  const roles = await prisma.role.findMany({ where: { name: { in: uniqueNames } } });
  const missing = uniqueNames.filter((name) => !roles.find((r) => r.name === name));
  if (missing.length) {
    const err = new Error(`Role definitions missing: ${missing.join(', ')}`);
    err.code = 'ROLE_NOT_PROVISIONED';
    throw err;
  }
  const disallowed = uniqueNames.filter((name) => !DEFAULT_ROLES.includes(name));
  if (disallowed.length) {
    const err = new Error(`Invalid role assignment: ${disallowed.join(', ')}`);
    err.code = 'INVALID_ROLE';
    throw err;
  }
  return roles;
}

module.exports = { ensureDefaultRoles, validateRoleNames };
