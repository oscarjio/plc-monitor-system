/**
 * Authentication Middleware
 * JWT token validation
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Verify JWT token from Authorization header
 */
const authMiddleware = (req, res, next) => {
  try {
    // Skip auth for health check and auth routes
    if (req.path === '/health' || req.path.startsWith('/api/auth')) {
      return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing Token',
        message: 'Authorization header missing or invalid'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    
    logger.debug({ userId: decoded.id }, 'Token verified');
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'Auth error');

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    res.status(401).json({
      error: 'Invalid Token',
      message: 'Your authentication token is invalid. Please login again.'
    });
  }
};

/**
 * Optional auth - doesn't fail if no token provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.user = jwt.verify(token, config.JWT_SECRET);
    }
  } catch (err) {
    logger.debug({ err: err.message }, 'Optional auth failed, continuing unauthenticated');
  }
  next();
};

/**
 * Role-based access control
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn({ 
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles
      }, 'Insufficient permissions');

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole
};
