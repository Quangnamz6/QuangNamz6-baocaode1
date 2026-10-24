/**
 * ========================================================
 * ROUTE XÁC THỰC NGƯỜI DÙNG & BẢO MẬT OTP (routes/auth.js)
 * Tính năng:
 * - Đăng ký / Đăng nhập linh hoạt bằng Email HOẶC Số điện thoại (Contact)
 * - Chống tài khoản ảo bằng mã OTP 6 số (Lưu bảng otp_codes, thời hạn 5 phút)
 * - Kiểm soát trạng thái isVerified
 * ========================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../config/db');
const { JWT_SECRET, authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendOTPEmail, sendOtpEmail } = require('../services/emailService');

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Kiểm tra định dạng Email hoặc Số điện thoại hợp lệ
function isValidContact(contact) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
  return emailRegex.test(contact) || phoneRegex.test(contact);
}

// Sinh mã OTP ngẫu nhiên 6 chữ số
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Xử lý logic Đăng ký tài khoản & Phát sinh mã OTP gửi qua Gmail
 */
async function handleRegistration(req, res) {
  try {
    const rawContact = req.body.email || req.body.contact;
    const fullName = (req.body.fullName || (rawContact ? rawContact.split('@')[0] : 'Quý độc giả')).trim();
    const password = req.body.password || '123456';
    const dateOfBirth = req.body.dateOfBirth || '2000-01-01';
    const address = req.body.address ? req.body.address.trim() : '';

    if (!rawContact) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ Email hoặc Số điện thoại.'
      });
    }

    const cleanContact = rawContact.trim().toLowerCase();
    if (!isValidContact(cleanContact)) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc Số điện thoại không đúng định dạng hợp lệ!'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.'
      });
    }

    // Kiểm tra tài khoản đã tồn tại và đã xác thực chưa
    const existingVerifiedUser = await dbAsync.get(
      'SELECT id FROM users WHERE (contact = ? OR email = ?) AND isVerified = 1',
      [cleanContact, cleanContact]
    );

    if (existingVerifiedUser) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc Số điện thoại này đã được đăng ký và xác thực trong hệ thống!'
      });
    }

    // Tạo mật khẩu mã hóa
    const passwordHash = await bcrypt.hash(password, 10);

    // Lưu hoặc cập nhật người dùng với trạng thái isVerified = 0 (Chưa xác thực OTP)
    const existingUnverified = await dbAsync.get(
      'SELECT id FROM users WHERE contact = ? OR email = ?',
      [cleanContact, cleanContact]
    );

    if (existingUnverified) {
      await dbAsync.run(`
        UPDATE users 
        SET fullName = ?, passwordHash = ?, dateOfBirth = ?, address = ?, isVerified = 0
        WHERE id = ?
      `, [fullName, passwordHash, dateOfBirth.trim(), address, existingUnverified.id]);
    } else {
      await dbAsync.run(`
        INSERT INTO users (fullName, contact, email, passwordHash, dateOfBirth, address, isVerified, role, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 0, 'member', datetime('now', 'localtime'))
      `, [fullName, cleanContact, cleanContact, passwordHash, dateOfBirth.trim(), address]);
    }

    // 1. Sinh mã OTP ngẫu nhiên 6 chữ số
    const otpCode = generateOtpCode();

    // 2. Thời gian hết hạn: 5 phút kể từ thời điểm tạo
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Hủy các mã OTP cũ chưa dùng của tài khoản này
    await dbAsync.run('UPDATE otp_codes SET isUsed = 1 WHERE contact = ?', [cleanContact]);

    // Lưu mã OTP mới vào bảng otp_codes
    await dbAsync.run(`
      INSERT INTO otp_codes (contact, code, expiresAt, isUsed)
      VALUES (?, ?, ?, 0)
    `, [cleanContact, otpCode, expiresAt]);

    // 3. Gửi Email chứa mã OTP thực tế bằng Nodemailer qua Gmail
    let emailSentResult = null;
    const isEmail = cleanContact.includes('@');
    if (isEmail) {
      emailSentResult = await sendOTPEmail(cleanContact, otpCode, fullName);
    } else {
      console.log(`📩 [SMS / MOCK OTP] Mã xác thực gửi đến ${cleanContact}: ${otpCode}`);
    }

    // 4. Trả về client phản hồi thành công
    return res.json({
      success: true,
      message: 'Mã OTP đã được gửi thành công đến Email của bạn!',
      contact: cleanContact,
      email: cleanContact,
      emailSent: emailSentResult ? emailSentResult.success : false,
      // Khi gửi thực tế thành công thì bảo mật không đính kèm mockOtp
      mockOtp: (emailSentResult && emailSentResult.success) ? undefined : otpCode
    });
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    return res.status(500).json({ success: false, message: 'Có lỗi xảy ra trên máy chủ khi khởi tạo đăng ký.' });
  }
}

/**
 * [POST] /api/auth/register & [POST] /api/auth/register-request
 */
router.post('/register', handleRegistration);
router.post('/register-request', handleRegistration);

/**
 * [POST] /api/auth/verify-otp - BƯỚC 2: Xác thực mã OTP và kích hoạt tài khoản
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const rawContact = req.body.email || req.body.contact;
    const rawOtp = req.body.otp || req.body.otpCode;

    if (!rawContact || !rawOtp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Email và Mã OTP 6 chữ số.'
      });
    }

    const cleanContact = rawContact.trim().toLowerCase();
    const cleanOtp = rawOtp.toString().trim();

    // Kiểm tra mã OTP trong bảng otp_codes
    const otpRecord = await dbAsync.get(`
      SELECT * FROM otp_codes 
      WHERE contact = ? AND code = ? AND isUsed = 0 
      ORDER BY id DESC LIMIT 1
    `, [cleanContact, cleanOtp]);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác hoặc đã được sử dụng!'
      });
    }

    // Kiểm tra hạn sử dụng OTP (5 phút)
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn hiệu lực (quá 5 phút). Vui lòng yêu cầu gửi lại mã mới!'
      });
    }

    // Đánh dấu OTP đã sử dụng
    await dbAsync.run('UPDATE otp_codes SET isUsed = 1 WHERE id = ?', [otpRecord.id]);

    // Cập nhật trạng thái tài khoản isVerified = 1
    await dbAsync.run('UPDATE users SET isVerified = 1 WHERE contact = ? OR email = ?', [cleanContact, cleanContact]);

    const user = await dbAsync.get('SELECT * FROM users WHERE contact = ? OR email = ?', [cleanContact, cleanContact]);
    const age = calculateAge(user.dateOfBirth);

    const userPayload = {
      id: user.id,
      fullName: user.fullName,
      contact: user.contact,
      email: user.email || user.contact,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      age,
      role: user.role
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Xác thực OTP thành công! Tài khoản của bạn đã được kích hoạt.',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Lỗi verify-otp:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra trên máy chủ khi xác thực OTP.' });
  }
});

/**
 * [POST] /api/auth/resend-otp - Gửi lại mã OTP
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { contact } = req.body;
    if (!contact) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Email hoặc SĐT.' });
    }

    const cleanContact = contact.trim().toLowerCase();
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await dbAsync.run('UPDATE otp_codes SET isUsed = 1 WHERE contact = ?', [cleanContact]);
    await dbAsync.run(`
      INSERT INTO otp_codes (contact, code, expiresAt, isUsed)
      VALUES (?, ?, ?, 0)
    `, [cleanContact, otpCode, expiresAt]);

    // Gửi email OTP thực tế nếu contact là email
    let emailSentResult = null;
    const isEmail = cleanContact.includes('@');
    if (isEmail) {
      const user = await dbAsync.get('SELECT fullName FROM users WHERE contact = ?', [cleanContact]);
      const recipientName = user ? user.fullName : 'Quý độc giả';
      emailSentResult = await sendOtpEmail(cleanContact, otpCode, recipientName);
    } else {
      console.log(`📩 [RESEND OTP] Mã mới gửi đến ${cleanContact}: ${otpCode}`);
    }

    const message = isEmail
      ? (emailSentResult && emailSentResult.success)
        ? `Đã gửi lại mã OTP mới về Gmail (${cleanContact}). Vui lòng kiểm tra hộp thư.`
        : `Đã cấp mã OTP mới cho ${cleanContact}.`
      : `Đã gửi lại mã OTP mới đến ${cleanContact}.`;

    res.json({
      success: true,
      message,
      emailSent: emailSentResult ? emailSentResult.success : false,
      mockOtp: (emailSentResult && emailSentResult.success) ? undefined : otpCode
    });
  } catch (error) {
    console.error('Lỗi resend-otp:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi lại OTP.' });
  }
});

/**
 * [POST] /api/auth/login - Đăng nhập linh hoạt bằng Email HOẶC Số điện thoại
 */
router.post('/login', async (req, res) => {
  try {
    const { contact, password } = req.body;

    if (!contact || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email hoặc Số điện thoại và Mật khẩu.'
      });
    }

    const cleanContact = contact.trim().toLowerCase();
    const user = await dbAsync.get('SELECT * FROM users WHERE contact = ?', [cleanContact]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.'
      });
    }

    // Kiểm tra tài khoản có bị khóa không
    if (user.isLocked === 1) {
      return res.status(403).json({
        success: false,
        isLocked: true,
        message: 'Tài khoản của bạn đã bị Quản trị viên tạm khóa. Vui lòng liên hệ thư viện để được mở khóa!'
      });
    }

    // Kiểm tra tài khoản đã xác thực OTP chưa
    if (user.isVerified !== 1) {
      // Tự động sinh OTP mới cho người dùng kích hoạt
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await dbAsync.run('UPDATE otp_codes SET isUsed = 1 WHERE contact = ?', [cleanContact]);
      await dbAsync.run(`
        INSERT INTO otp_codes (contact, code, expiresAt, isUsed)
        VALUES (?, ?, ?, 0)
      `, [cleanContact, otpCode, expiresAt]);

      // Gửi email OTP thực tế nếu contact là email
      let emailSentResult = null;
      const isEmail = cleanContact.includes('@');
      if (isEmail) {
        emailSentResult = await sendOtpEmail(cleanContact, otpCode, user.fullName);
      } else {
        console.log(`📩 [UNVERIFIED LOGIN OTP] Mã kích hoạt gửi đến ${cleanContact}: ${otpCode}`);
      }

      return res.status(403).json({
        success: false,
        isUnverified: true,
        contact: cleanContact,
        mockOtp: (emailSentResult && emailSentResult.success) ? undefined : otpCode,
        message: isEmail && emailSentResult && emailSentResult.success
          ? 'Tài khoản chưa được xác thực! Mã OTP mới đã được gửi về Gmail của bạn. Vui lòng nhập mã để kích hoạt.'
          : 'Tài khoản chưa được xác thực OTP! Vui lòng nhập mã OTP để kích hoạt tài khoản.'
      });
    }

    const age = calculateAge(user.dateOfBirth);
    const userPayload = {
      id: user.id,
      fullName: user.fullName,
      contact: user.contact,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      age,
      role: user.role
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Đăng nhập thành công! Chào mừng ${user.fullName}.`,
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra trên máy chủ khi đăng nhập.' });
  }
});

/**
 * [GET] /api/auth/me - Thông tin người dùng hiện tại
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbAsync.get(
      'SELECT id, fullName, contact, email, dateOfBirth, address, isVerified, role, createdAt, points, max_borrow_limit, maxBorrowLimit FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const loanCount = await dbAsync.get(`
      SELECT COUNT(*) as activeCount FROM loans 
      WHERE userId = ? AND status IN ('borrowed', 'overdue')
    `, [user.id]);

    const age = calculateAge(user.dateOfBirth);
    const points = (user.points !== undefined && user.points !== null) ? user.points : 100;
    const maxBorrowLimit = user.maxBorrowLimit || user.max_borrow_limit || 3;

    res.json({
      success: true,
      user: {
        ...user,
        age,
        points,
        maxBorrowLimit,
        activeBorrowedCount: loanCount.activeCount || 0
      }
    });
  } catch (error) {
    console.error('Lỗi me:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [POST] /api/auth/redeem-perk - Đổi 200 điểm để tăng giới hạn mượn sách lên 5 quyển
 */
router.post('/redeem-perk', authenticateToken, async (req, res) => {
  try {
    const user = await dbAsync.get('SELECT id, points, max_borrow_limit, maxBorrowLimit FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const currentLimit = user.maxBorrowLimit || user.max_borrow_limit || 3;
    if (currentLimit >= 5) {
      return res.status(400).json({ success: false, message: 'Bạn đã sở hữu đặc quyền mượn tối đa 5 quyển sách!' });
    }

    const currentPoints = (user.points !== undefined && user.points !== null) ? user.points : 100;
    if (currentPoints < 200) {
      return res.status(400).json({
        success: false,
        message: `Bạn chưa đủ điểm! Cần 200 điểm nhưng hiện tại bạn chỉ có ${currentPoints} điểm.`
      });
    }

    const newPoints = currentPoints - 200;
    await dbAsync.run(`
      UPDATE users 
      SET points = ?, max_borrow_limit = 5, maxBorrowLimit = 5
      WHERE id = ?
    `, [newPoints, req.user.id]);

    res.json({
      success: true,
      message: 'Chúc mừng! Bạn đã đổi thành công đặc quyền: Tăng giới hạn mượn sách lên tối đa 5 quyển!',
      points: newPoints,
      maxBorrowLimit: 5
    });
  } catch (error) {
    console.error('Lỗi redeem-perk:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đổi quà đặc quyền.' });
  }
});

/**
 * [GET] /api/auth/users - Danh sách người dùng (Admin)
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbAsync.all(`
      SELECT 
        u.id, 
        u.fullName, 
        u.contact, 
        u.dateOfBirth,
        u.address,
        u.isVerified,
        COALESCE(u.isLocked, 0) AS isLocked,
        u.role, 
        u.createdAt,
        COUNT(CASE WHEN l.status IN ('borrowed', 'overdue') THEN 1 END) AS activeBorrowedCount,
        COUNT(l.id) AS totalLoansCount
      FROM users u
      LEFT JOIN loans l ON u.id = l.userId
      GROUP BY u.id
      ORDER BY u.id DESC
    `);

    const usersWithAge = users.map(u => ({
      ...u,
      age: calculateAge(u.dateOfBirth)
    }));

    res.json({
      success: true,
      users: usersWithAge
    });
  } catch (error) {
    console.error('Lỗi users:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [POST] /api/auth/users/:id/toggle-lock - Khóa hoặc Mở khóa tài khoản độc giả (Admin)
 */
router.post('/users/:id/toggle-lock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (req.user.id === targetId) {
      return res.status(400).json({ success: false, message: 'Quản trị viên không thể tự khóa tài khoản của chính mình!' });
    }

    const user = await dbAsync.get('SELECT id, fullName, role, isLocked FROM users WHERE id = ?', [targetId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng này.' });
    }

    const newLockState = user.isLocked === 1 ? 0 : 1;
    await dbAsync.run('UPDATE users SET isLocked = ? WHERE id = ?', [newLockState, targetId]);

    res.json({
      success: true,
      isLocked: newLockState,
      message: newLockState === 1 
        ? `Đã khóa tài khoản "${user.fullName}" thành công!` 
        : `Đã mở khóa tài khoản "${user.fullName}" thành công!`
    });
  } catch (error) {
    console.error('Lỗi toggle-lock:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thay đổi trạng thái khóa tài khoản.' });
  }
});

/**
 * [POST] /api/auth/users/:id/reset-password - Đặt lại mật khẩu tài khoản về mặc định 123456 (Admin)
 */
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const user = await dbAsync.get('SELECT id, fullName FROM users WHERE id = ?', [targetId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng này.' });
    }

    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    await dbAsync.run('UPDATE users SET passwordHash = ? WHERE id = ?', [defaultPasswordHash, targetId]);

    res.json({
      success: true,
      message: `Đã đặt lại mật khẩu tài khoản "${user.fullName}" về mặc định "123456" thành công!`
    });
  } catch (error) {
    console.error('Lỗi reset-password:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đặt lại mật khẩu.' });
  }
});

module.exports = router;
