function requireRole(role) {
  return (req, res, next) => {
    const roles = req.authRoles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

function requireAnyRole(roleList = []) {
  return (req, res, next) => {
    const roles = req.authRoles || [];
    if (!roleList.some((r) => roles.includes(r))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

function requireOwnerOrManager() {
  return requireAnyRole(['Owner', 'Manager']);
}

module.exports = { requireRole, requireAnyRole, requireOwnerOrManager };
