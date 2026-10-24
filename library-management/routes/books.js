/**
 * ========================================================
 * ROUTE QUẢN LÝ SÁCH (routes/books.js)
 * Cập nhật: Hỗ trợ lọc theo độ tuổi (all, kids, 18+) và CRUD
 * ========================================================
 */

const express = require('express');
const router = express.Router();
const { dbAsync } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * [GET] /api/books/categories - Danh sách thể loại
 */
router.get('/categories', async (req, res) => {
  try {
    const rows = await dbAsync.all(`SELECT DISTINCT category FROM books WHERE category IS NOT NULL AND category != ''`);
    res.json({ success: true, categories: rows.map(r => r.category) });
  } catch (error) {
    console.error('Lỗi lấy thể loại:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [GET] /api/books/quote-of-the-day - Trích dẫn hay trong ngày
 */
router.get('/quote-of-the-day', async (req, res) => {
  try {
    const countRow = await dbAsync.get('SELECT COUNT(*) AS cnt FROM quotes');
    const total = countRow ? countRow.cnt : 0;
    if (total === 0) {
      return res.json({
        success: true,
        quote: {
          quote: "Sách là ngọn đèn sáng bất diệt của trí tuệ con người.",
          author: "V.I. Lênin",
          bookTitle: "Danh ngôn thư viện",
          bookId: 1
        }
      });
    }

    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const offset = dayOfYear % total;

    const quote = await dbAsync.get(`
      SELECT q.*, b.coverImage as bookCover 
      FROM quotes q 
      LEFT JOIN books b ON q.bookId = b.id 
      LIMIT 1 OFFSET ?
    `, [offset]);

    const finalQuote = quote ? {
      ...quote,
      quote: quote.content || quote.quote || "Đọc sách là nuôi dưỡng tâm hồn.",
      content: quote.content || quote.quote || "Đọc sách là nuôi dưỡng tâm hồn."
    } : {
      quote: "Đọc sách là nuôi dưỡng tâm hồn và mở ra những chân trời mới.",
      content: "Đọc sách là nuôi dưỡng tâm hồn và mở ra những chân trời mới.",
      author: "Khuyết danh",
      bookTitle: "Tủ sách LibMaster",
      bookId: 1
    };

    res.json({
      success: true,
      quote: finalQuote
    });
  } catch (error) {
    console.error('Lỗi lấy trích dẫn:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy trích dẫn.' });
  }
});

/**
 * [GET] /api/books - Danh sách sách công khai (Kèm đánh giá sao, ETA ngày có sách & hàng chờ)
 */
router.get('/', async (req, res) => {
  try {
    const { search, category, ageRestriction, availableOnly } = req.query;

    let sql = `
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
        COUNT(r.id) AS reviewCount,
        (SELECT MIN(dueDate) FROM loans WHERE bookId = b.id AND status IN ('borrowed', 'overdue')) AS earliestDueDate,
        (SELECT COUNT(id) FROM waitlist WHERE bookId = b.id AND status = 'waiting') AS waitlistCount
      FROM books b
      LEFT JOIN reviews r ON b.id = r.bookId
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.category LIKE ?)';
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    if (category && category !== 'all' && category.trim() !== '') {
      sql += ' AND b.category = ?';
      params.push(category.trim());
    }

    // Lọc theo độ tuổi: 'all', 'kids', '18+'
    if (ageRestriction && ageRestriction !== 'all_ages' && ageRestriction !== 'all') {
      sql += ' AND b.ageRestriction = ?';
      params.push(ageRestriction.trim());
    }

    if (availableOnly === 'true') {
      sql += ' AND b.availableQuantity > 0';
    }

    sql += ' GROUP BY b.id ORDER BY b.id DESC';

    const books = await dbAsync.all(sql, params);
    res.json({ success: true, books });
  } catch (error) {
    console.error('Lỗi lấy danh sách sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [GET] /api/books/:id - Xem chi tiết sách kèm điểm đánh giá, ETA & hàng chờ
 */
router.get('/:id', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId)) {
      return res.status(400).json({ success: false, message: 'ID sách không hợp lệ.' });
    }

    const book = await dbAsync.get(`
      SELECT 
        b.*,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avgRating,
        COUNT(r.id) AS reviewCount,
        (SELECT MIN(dueDate) FROM loans WHERE bookId = b.id AND status IN ('borrowed', 'overdue')) AS earliestDueDate,
        (SELECT COUNT(id) FROM waitlist WHERE bookId = b.id AND status = 'waiting') AS waitlistCount
      FROM books b
      LEFT JOIN reviews r ON b.id = r.bookId
      WHERE b.id = ?
      GROUP BY b.id
    `, [bookId]);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cuốn sách này.' });
    }
    res.json({ success: true, book });
  } catch (error) {
    console.error('Lỗi lấy chi tiết sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [POST] /api/books/:id/waitlist - Đăng ký vào hàng chờ nhận sách khi hết kho
 */
router.post('/:id/waitlist', authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const book = await dbAsync.get('SELECT id, title, availableQuantity FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cuốn sách này.' });
    }

    if (book.availableQuantity > 0) {
      return res.status(400).json({
        success: false,
        message: 'Sách hiện đang còn sẵn trong kho! Bạn có thể mượn trực tiếp mà không cần xếp hàng.'
      });
    }

    // Kiểm tra đã đăng ký chưa
    const existing = await dbAsync.get(
      'SELECT id FROM waitlist WHERE bookId = ? AND userId = ? AND status = "waiting"',
      [bookId, userId]
    );

    if (existing) {
      // Đếm thứ tự hiện tại
      const positionRow = await dbAsync.get(
        'SELECT COUNT(id) AS pos FROM waitlist WHERE bookId = ? AND status = "waiting" AND id <= ?',
        [bookId, existing.id]
      );
      return res.json({
        success: true,
        alreadyJoined: true,
        position: positionRow.pos,
        message: `Bạn đã có tên trong hàng chờ của cuốn "${book.title}". Vị trí hiện tại của bạn là #[${positionRow.pos}]. Khi có sách hoàn trả, hệ thống sẽ tự động gửi Email giữ chỗ cho bạn!`
      });
    }

    // Thêm vào hàng chờ
    const insertResult = await dbAsync.run(
      'INSERT INTO waitlist (bookId, userId, createdAt, status) VALUES (?, ?, datetime("now", "localtime"), "waiting")',
      [bookId, userId]
    );

    // Tính vị trí trong hàng chờ
    const countRow = await dbAsync.get(
      'SELECT COUNT(id) AS pos FROM waitlist WHERE bookId = ? AND status = "waiting"',
      [bookId]
    );

    res.status(201).json({
      success: true,
      position: countRow.pos,
      message: `Đăng ký xếp hàng nhận sách "${book.title}" thành công! Vị trí của bạn: #[${countRow.pos}]. Hệ thống sẽ gửi email cho bạn ngay khi có độc giả hoàn trả sách!`
    });
  } catch (error) {
    console.error('Lỗi đăng ký hàng chờ:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký hàng chờ.' });
  }
});

/**
 * [GET] /api/books/:id/reviews - Lấy danh sách đánh giá & nhận xét của cuốn sách
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    const reviews = await dbAsync.all(`
      SELECT 
        r.id,
        r.bookId,
        r.userId,
        r.rating,
        r.comment,
        r.createdAt,
        u.fullName AS userName,
        u.role AS userRole
      FROM reviews r
      JOIN users u ON r.userId = u.id
      WHERE r.bookId = ?
      ORDER BY r.id DESC
    `, [bookId]);

    const stat = await dbAsync.get(`
      SELECT 
        COALESCE(ROUND(AVG(rating), 1), 0) AS avgRating,
        COUNT(id) AS reviewCount
      FROM reviews 
      WHERE bookId = ?
    `, [bookId]);

    res.json({
      success: true,
      avgRating: stat?.avgRating || 0,
      reviewCount: stat?.reviewCount || 0,
      reviews
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đánh giá:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy đánh giá.' });
  }
});

/**
 * [POST] /api/books/:id/reviews - Thêm đánh giá & nhận xét mới (yêu cầu đăng nhập)
 */
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    const { rating, comment } = req.body;

    const book = await dbAsync.get('SELECT id, title FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Cuốn sách này không tồn tại.' });
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5 sao!' });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung nhận xét cảm nhận của bạn!' });
    }

    await dbAsync.run(`
      INSERT INTO reviews (bookId, userId, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `, [bookId, req.user.id, ratingVal, comment.trim()]);

    const stat = await dbAsync.get(`
      SELECT 
        COALESCE(ROUND(AVG(rating), 1), 0) AS avgRating,
        COUNT(id) AS reviewCount
      FROM reviews 
      WHERE bookId = ?
    `, [bookId]);

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá & cảm nhận cho cuốn sách này!',
      avgRating: stat?.avgRating || ratingVal,
      reviewCount: stat?.reviewCount || 1
    });
  } catch (error) {
    console.error('Lỗi gửi đánh giá sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi đánh giá.' });
  }
});

/**
 * [POST] /api/books - Thêm sách mới (Admin only, có chọn độ tuổi)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, author, category, quantity, coverImage, description, ageRestriction } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Tên sách, Tác giả và Thể loại.'
      });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng sách nhập kho phải lớn hơn hoặc bằng 1.'
      });
    }

    const age = ['all', 'kids', '18+'].includes(ageRestriction) ? ageRestriction : 'all';
    const defaultCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';

    const result = await dbAsync.run(`
      INSERT INTO books (title, author, category, quantity, availableQuantity, coverImage, description, ageRestriction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title.trim(), author.trim(), category.trim(), qty, qty, coverImage?.trim() || defaultCover, description?.trim() || '', age]);

    const newBook = await dbAsync.get('SELECT * FROM books WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Thêm sách mới vào kho thành công!',
      book: newBook
    });
  } catch (error) {
    console.error('Lỗi thêm sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm sách.' });
  }
});

/**
 * [PUT] /api/books/:id - Cập nhật sách (Admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const existingBook = await dbAsync.get('SELECT * FROM books WHERE id = ?', [bookId]);
    if (!existingBook) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sách cần cập nhật.' });
    }

    const { title, author, category, quantity, coverImage, description, ageRestriction } = req.body;

    const newQty = parseInt(quantity, 10);
    if (isNaN(newQty) || newQty < 1) {
      return res.status(400).json({ success: false, message: 'Số lượng sách phải lớn hơn hoặc bằng 1.' });
    }

    const diff = newQty - existingBook.quantity;
    const newAvailable = Math.max(0, existingBook.availableQuantity + diff);
    const age = ['all', 'kids', '18+'].includes(ageRestriction) ? ageRestriction : existingBook.ageRestriction;

    await dbAsync.run(`
      UPDATE books 
      SET title = ?, author = ?, category = ?, quantity = ?, availableQuantity = ?, coverImage = ?, description = ?, ageRestriction = ?
      WHERE id = ?
    `, [
      title ? title.trim() : existingBook.title,
      author ? author.trim() : existingBook.author,
      category ? category.trim() : existingBook.category,
      newQty,
      newAvailable,
      coverImage ? coverImage.trim() : existingBook.coverImage,
      description !== undefined ? description.trim() : existingBook.description,
      age,
      bookId
    ]);

    const updatedBook = await dbAsync.get('SELECT * FROM books WHERE id = ?', [bookId]);

    res.json({
      success: true,
      message: 'Cập nhật thông tin sách thành công!',
      book: updatedBook
    });
  } catch (error) {
    console.error('Lỗi cập nhật sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật sách.' });
  }
});

/**
 * [DELETE] /api/books/:id - Xóa sách khỏi kho (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const activeLoan = await dbAsync.get(`
      SELECT id FROM loans 
      WHERE bookId = ? AND status IN ('borrowed', 'overdue')
    `, [bookId]);

    if (activeLoan) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa cuốn sách này vì hiện đang có độc giả mượn chưa hoàn trả!'
      });
    }

    await dbAsync.run('DELETE FROM books WHERE id = ?', [bookId]);
    res.json({ success: true, message: 'Đã xóa cuốn sách khỏi hệ thống thành công!' });
  } catch (error) {
    console.error('Lỗi xóa sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa sách.' });
  }
});

module.exports = router;
