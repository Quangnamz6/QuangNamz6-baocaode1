/**
 * ========================================================
 * MIDDLEWARE XÁC THỰC VÀ PHÂN QUYỀN (middleware/auth.js)
 * ========================================================
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'libmaster_super_secure_jwt_token_2026';

/**
 * Middleware kiểm tra JWT token hợp lệ
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Định dạng: Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để thực hiện chức năng này.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Middleware kiểm tra quyền Quản trị viên (Admin)
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Từ chối truy cập! Chức năng này chỉ dành cho Quản trị viên.'
    });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin
};
