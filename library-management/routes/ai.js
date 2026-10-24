/**
 * ========================================================
 * ROUTE THỦ THƯ ẢO AI (routes/ai.js)
 * Xử lý trò chuyện, giải đáp thắc mắc và gợi ý sách thông minh
 * ========================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { analyzeAndRecommend } = require('../services/aiService');

/**
 * [POST] /api/ai/chat - Trò chuyện với Thủ Thư Ảo AI
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung câu hỏi hoặc yêu cầu cho Thủ thư ảo.'
      });
    }

    // Kiểm tra thông tin người dùng nếu có gửi Token (để xác thực độ tuổi)
    let userAge = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userAge = decoded.age !== undefined ? decoded.age : null;
        if (userAge === null && decoded.dateOfBirth) {
          const dob = new Date(decoded.dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          userAge = age;
        }
      } catch (err) {
        // Token không hợp lệ hoặc hết hạn thì xem như khách vãng lai
      }
    }

    // Lấy toàn bộ sách kèm điểm đánh giá sao từ Database
    const books = await dbAsync.all(`
      SELECT 
        b.id,
        b.title,
        b.author,
        b.category,
        b.quantity,
        b.availableQuantity,
        b.coverImage,
        b.description,
        b.ageRestriction,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avgRating,
        COUNT(r.id) AS reviewCount
      FROM books b
      LEFT JOIN reviews r ON b.id = r.bookId
      GROUP BY b.id
    `);

    // Phân tích ý định & tìm sách phù hợp qua AI Service
    const aiResult = analyzeAndRecommend(message.trim(), userAge, books);

    res.json({
      success: true,
      reply: aiResult.reply,
      books: aiResult.suggestions,
      suggestions: aiResult.suggestions
    });
  } catch (error) {
    console.error('Lỗi API AI Chat:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý phản hồi từ Thủ thư ảo AI.'
    });
  }
});

module.exports = router;
