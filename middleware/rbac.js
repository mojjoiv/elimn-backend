const db = require('../db');

function rbac(requiredRoles) {
  return async function (req, res, next) {
    try {
      const userId = req.user.sub;
      const result = await db.query(
        `SELECT r.name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [userId]
      );

      const roles = result.rows.map(r => r.name);
      const hasRole = requiredRoles.some(role => roles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ error: 'forbidden' });
      }
      next();
    } catch (err) {
      console.error('RBAC error', err);
      res.status(500).json({ error: 'server error' });
    }
  };
}

module.exports = rbac;
