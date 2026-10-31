const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ succeeded: false, message: 'Bearer token required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (_error) {
    return res.status(401).json({ succeeded: false, message: 'Token is invalid or expired' });
  }
};

module.exports = requireAuth;