/**
 * ========================================================
 * ROUTE QUẢN LÝ MƯỢN / TRẢ SÁCH (routes/loans.js)
 * Cập nhật:
 * - Lưu thông tin nhận sách: receiverName, receiverPhone, deliveryAddress
 * - Ràng buộc tuổi 18+ và giới hạn tối đa 3 quyển sách
 * ========================================================
 */

const express = require('express');
const router = express.Router();
const { dbAsync } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendWaitlistNotificationEmail } = require('../services/emailService');

const FINE_RATE_PER_DAY = 5000;

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

async function refreshOverdueLoans() {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeLoans = await dbAsync.all(`
    SELECT id, dueDate, status FROM loans 
    WHERE status IN ('borrowed', 'overdue')
  `);

  for (const loan of activeLoans) {
    if (loan.dueDate < todayStr) {
      const dueTime = new Date(loan.dueDate).getTime();
      const nowTime = new Date(todayStr).getTime();
      const lateDays = Math.ceil((nowTime - dueTime) / (1000 * 3600 * 24));
      const fine = lateDays * FINE_RATE_PER_DAY;

      await dbAsync.run(`
        UPDATE loans 
        SET status = 'overdue', fineAmount = ? 
        WHERE id = ?
      `, [fine, loan.id]);
    }
  }
}

/**
 * [POST] /api/loans/borrow - Mượn sách có thông tin người nhận (receiverName, receiverPhone, deliveryAddress)
 */
router.post('/borrow', authenticateToken, async (req, res) => {
  try {
    const { bookId, receiverName, receiverPhone, deliveryAddress } = req.body;
    let targetUserId = req.user.id;

    if (req.user.role === 'admin' && req.body.userId) {
      targetUserId = req.body.userId;
    }

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn cuốn sách cần mượn.'
      });
    }

    await refreshOverdueLoans();

    const user = await dbAsync.get('SELECT id, fullName, contact, email, dateOfBirth, address, points, max_borrow_limit, maxBorrowLimit FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin độc giả.' });
    }

    const book = await dbAsync.get('SELECT * FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cuốn sách này.' });
    }

    // 1. KIỂM TRA ĐỘ TUỔI (18+)
    const userAge = calculateAge(user.dateOfBirth);
    if (book.ageRestriction === '18+' && userAge < 18) {
      return res.status(400).json({
        success: false,
        isAgeRestricted: true,
        message: 'Sách này dành cho người trên 18 tuổi. Bạn chưa đủ tuổi để mượn cuốn sách này!'
      });
    }

    // 2. KIỂM TRA GIỚI HẠN MƯỢN SÁCH (Mặc định 3, có thể nâng lên 5 nhờ đổi 200 điểm)
    const maxLimit = user.maxBorrowLimit || user.max_borrow_limit || 3;
    const currentActiveLoans = await dbAsync.get(`
      SELECT COUNT(*) AS activeCount FROM loans 
      WHERE userId = ? AND status IN ('borrowed', 'overdue')
    `, [targetUserId]);

    if (currentActiveLoans && currentActiveLoans.activeCount >= maxLimit) {
      return res.status(400).json({
        success: false,
        isLimitExceeded: true,
        message: `Bạn đã đạt giới hạn mượn tối đa ${maxLimit} quyển sách. Vui lòng trả sách cũ hoặc đổi điểm nâng hạng đặc quyền để mượn tiếp.`
      });
    }

    // 3. KIỂM TRA MƯỢN TRÙNG LẶP
    const duplicateLoan = await dbAsync.get(`
      SELECT id FROM loans 
      WHERE userId = ? AND bookId = ? AND status IN ('borrowed', 'overdue')
    `, [targetUserId, bookId]);

    if (duplicateLoan) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đang mượn một bản sao của cuốn sách này và chưa hoàn trả. Vui lòng không mượn trùng lặp.'
      });
    }

    // 4. KIỂM TRA TỒN KHO
    if (book.availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sách này hiện đã hết trong kho. Vui lòng quay lại sau khi có độc giả hoàn trả.'
      });
    }

    // Thiết lập thông tin người nhận
    const finalReceiverName = receiverName?.trim() || user.fullName;
    const finalReceiverPhone = receiverPhone?.trim() || user.contact;
    const finalDeliveryAddress = deliveryAddress?.trim() || user.address || 'Nhận trực tiếp tại thư viện';

    const today = new Date();
    const borrowDateStr = today.toISOString().split('T')[0];

    const durationDays = parseInt(req.body.borrowDays, 10) || 14;
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + durationDays);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Trừ 1 số lượng sách khả dụng trong kho
    await dbAsync.run(`
      UPDATE books 
      SET availableQuantity = availableQuantity - 1 
      WHERE id = ?
    `, [bookId]);

    // Tạo phiếu mượn
    const result = await dbAsync.run(`
      INSERT INTO loans (userId, bookId, receiverName, receiverPhone, deliveryAddress, borrowDate, dueDate, returnDate, status, fineAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'borrowed', 0)
    `, [targetUserId, bookId, finalReceiverName, finalReceiverPhone, finalDeliveryAddress, borrowDateStr, dueDateStr]);

    res.status(201).json({
      success: true,
      message: `Mượn sách "${book.title}" thành công! Người nhận: ${finalReceiverName}. Hạn trả: ${dueDateStr}.`,
      loanId: result.lastID,
      dueDate: dueDateStr
    });
  } catch (error) {
    console.error('Lỗi khi mượn sách:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra trên máy chủ khi xử lý mượn sách.'
    });
  }
});

/**
 * [GET] /api/loans/my-loans - Độc giả xem danh sách sách cá nhân
 */
router.get('/my-loans', authenticateToken, async (req, res) => {
  try {
    await refreshOverdueLoans();

    const loans = await dbAsync.all(`
      SELECT 
        l.id,
        l.userId,
        l.bookId,
        l.receiverName,
        l.receiverPhone,
        l.deliveryAddress,
        l.borrowDate,
        l.dueDate,
        l.returnDate,
        l.status,
        l.fineAmount,
        COALESCE(l.is_extended, l.isExtended, 0) AS isExtended,
        COALESCE(l.is_extended, l.isExtended, 0) AS is_extended,
        b.title AS bookTitle,
        b.author AS bookAuthor,
        b.coverImage AS bookCover,
        b.category AS bookCategory,
        b.ageRestriction AS bookAgeRestriction
      FROM loans l
      JOIN books b ON l.bookId = b.id
      WHERE l.userId = ?
      ORDER BY l.id DESC
    `, [req.user.id]);

    const todayStr = new Date().toISOString().split('T')[0];

    const enrichedLoans = loans.map(l => {
      const isReturned = l.status === 'returned';
      const dueTime = new Date(l.dueDate).getTime();
      const nowTime = new Date(todayStr).getTime();
      const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 3600 * 24));
      
      const isOverdue = !isReturned && (l.status === 'overdue' || diffDays < 0);
      const overdueDays = isOverdue ? Math.max(1, Math.abs(diffDays)) : 0;
      const calculatedFine = isOverdue ? (l.fineAmount > 0 ? l.fineAmount : overdueDays * FINE_RATE_PER_DAY) : 0;
      const isDueSoon = !isReturned && !isOverdue && diffDays >= 0 && diffDays <= 2;
      const canRenew = !isReturned && !isOverdue && l.isExtended !== 1;

      return {
        ...l,
        daysRemaining: diffDays,
        isOverdue,
        overdueDays,
        fineAmount: calculatedFine,
        isDueSoon,
        canRenew
      };
    });

    const activeLoans = enrichedLoans.filter(l => l.status === 'borrowed' || l.status === 'overdue');
    const returnedLoans = enrichedLoans.filter(l => l.status === 'returned');

    res.json({
      success: true,
      activeLoans,
      returnedLoans,
      totalActiveCount: activeLoans.length,
      hasAlerts: activeLoans.some(l => l.isOverdue || l.isDueSoon),
      alertsCount: activeLoans.filter(l => l.isOverdue || l.isDueSoon).length
    });
  } catch (error) {
    console.error('Lỗi my-loans:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [GET] /api/loans - Danh sách toàn bộ phiếu mượn (Admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await refreshOverdueLoans();
    const { status, search } = req.query;

    let sql = `
      SELECT 
        l.id,
        l.userId,
        l.bookId,
        l.receiverName,
        l.receiverPhone,
        l.deliveryAddress,
        l.borrowDate,
        l.dueDate,
        l.returnDate,
        l.status,
        l.fineAmount,
        u.fullName AS userName,
        u.contact AS userContact,
        u.dateOfBirth AS userBirth,
        b.title AS bookTitle,
        b.author AS bookAuthor,
        b.coverImage AS bookCover,
        b.ageRestriction AS bookAgeRestriction
      FROM loans l
      JOIN users u ON l.userId = u.id
      JOIN books b ON l.bookId = b.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (u.fullName LIKE ? OR u.contact LIKE ? OR b.title LIKE ? OR l.receiverName LIKE ?)';
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    sql += ' ORDER BY l.id DESC';

    const loans = await dbAsync.all(sql, params);
    const enrichedLoans = loans.map(l => ({
      ...l,
      userAge: calculateAge(l.userBirth)
    }));

    res.json({ success: true, loans: enrichedLoans });
  } catch (error) {
    console.error('Lỗi loans:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

/**
 * [POST] /api/loans/:id/return hoặc /api/loans/return/:id - Hoàn trả sách
 */
const handleReturnLoan = async (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = await dbAsync.get('SELECT * FROM loans WHERE id = ?', [loanId]);

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu mượn.' });
    }

    if (req.user.role !== 'admin' && loan.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên phiếu mượn này.' });
    }

    if (loan.status === 'returned') {
      return res.status(400).json({ success: false, message: 'Phiếu mượn này đã được hoàn trả trước đó.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let fineAmount = 0;

    if (todayStr > loan.dueDate) {
      const dueTime = new Date(loan.dueDate).getTime();
      const nowTime = new Date(todayStr).getTime();
      const lateDays = Math.ceil((nowTime - dueTime) / (1000 * 3600 * 24));
      fineAmount = lateDays * FINE_RATE_PER_DAY;
    }

    await dbAsync.run(`
      UPDATE loans 
      SET status = 'returned', returnDate = ?, fineAmount = ?
      WHERE id = ?
    `, [todayStr, fineAmount, loanId]);

    await dbAsync.run(`
      UPDATE books 
      SET availableQuantity = availableQuantity + 1 
      WHERE id = ?
    `, [loan.bookId]);

    const book = await dbAsync.get('SELECT title FROM books WHERE id = ?', [loan.bookId]);

    let message = `Đã trả sách "${book?.title}" thành công!`;
    let earnedPoints = 0;

    // TÍCH ĐIỂM ĐỔI QUÀ: Trả đúng hạn (+50 điểm)
    if (fineAmount === 0) {
      earnedPoints = 50;
      await dbAsync.run('UPDATE users SET points = COALESCE(points, 0) + 50 WHERE id = ?', [loan.userId]);
      message += ' Chúc mừng bạn đã được cộng +50 Điểm Thưởng Độc Giả vì hoàn trả sách đúng hạn!';
    } else {
      message += ` Độc giả trả quá hạn, phí phạt: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(fineAmount)}.`;
    }

    // HÀNG CHỜ THÔNG MINH: Thông báo cho độc giả đứng đầu hàng chờ
    try {
      const nextInQueue = await dbAsync.get(`
        SELECT w.*, u.fullName, u.contact, u.email 
        FROM waitlist w
        JOIN users u ON w.userId = u.id
        WHERE w.bookId = ? AND w.status = 'waiting'
        ORDER BY w.createdAt ASC
        LIMIT 1
      `, [loan.bookId]);

      if (nextInQueue) {
        await dbAsync.run(`
          UPDATE waitlist 
          SET status = 'notified', notifiedAt = datetime('now', 'localtime') 
          WHERE id = ?
        `, [nextInQueue.id]);

        const recipientEmail = nextInQueue.email || (nextInQueue.contact?.includes('@') ? nextInQueue.contact : 'dtc245200473@ictu.edu.vn');
        await sendWaitlistNotificationEmail(recipientEmail, book?.title || 'Sách Thư Viện', nextInQueue.fullName, 24);
        console.log(`[WAITLIST] Đã gửi Email thông báo có sách cho độc giả ${nextInQueue.fullName} (${recipientEmail})`);
      }
    } catch (waitlistErr) {
      console.error('[WAITLIST] Lỗi gửi thông báo hàng chờ:', waitlistErr);
    }

    res.json({
      success: true,
      message,
      fineAmount,
      earnedPoints,
      returnDate: todayStr
    });
  } catch (error) {
    console.error('Lỗi trả sách:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi trả sách.' });
  }
};

router.post('/:id/return', authenticateToken, handleReturnLoan);
router.post('/return/:id', authenticateToken, handleReturnLoan);

/**
 * [POST] /api/loans/:id/renew - Gia hạn mượn sách (+7 ngày, tối đa 1 lần, không quá hạn)
 */
router.post('/:id/renew', authenticateToken, async (req, res) => {
  try {
    await refreshOverdueLoans();
    const loanId = parseInt(req.params.id, 10);
    const loan = await dbAsync.get('SELECT * FROM loans WHERE id = ?', [loanId]);

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu mượn này trong hệ thống.' });
    }

    if (req.user.role !== 'admin' && loan.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên phiếu mượn này.' });
    }

    if (loan.status === 'returned') {
      return res.status(400).json({ success: false, message: 'Sách đã được hoàn trả, không thể gia hạn thêm!' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = loan.status === 'overdue' || todayStr > loan.dueDate;

    if (isOverdue) {
      return res.status(400).json({
        success: false,
        message: 'Phiếu mượn đã quá hạn trả! Vui lòng hoàn trả sách tại thư viện và thanh toán phí phạt thay vì gia hạn.'
      });
    }

    const isAlreadyExtended = loan.is_extended === 1 || loan.isExtended === 1;
    if (isAlreadyExtended) {
      return res.status(400).json({
        success: false,
        message: 'Phiếu mượn này đã được gia hạn trước đó! Mỗi phiếu mượn chỉ được gia hạn tối đa 1 lần duy nhất (+7 ngày).'
      });
    }

    // Tính hạn trả mới = DueDate hiện tại + 7 ngày
    const currentDue = new Date(loan.dueDate);
    currentDue.setDate(currentDue.getDate() + 7);
    const newDueDateStr = currentDue.toISOString().split('T')[0];

    await dbAsync.run(`
      UPDATE loans 
      SET dueDate = ?, is_extended = 1, isExtended = 1 
      WHERE id = ?
    `, [newDueDateStr, loanId]);

    const book = await dbAsync.get('SELECT title FROM books WHERE id = ?', [loan.bookId]);

    res.json({
      success: true,
      message: 'Đã gia hạn mượn sách thành công thêm 7 ngày!',
      bookTitle: book?.title || '',
      oldDueDate: loan.dueDate,
      newDueDate: newDueDateStr,
      isExtended: true
    });
  } catch (error) {
    console.error('Lỗi khi gia hạn sách:', error);
    res.status(500).json({ success: false, message: 'Có lỗi xảy ra trên máy chủ khi gia hạn sách.' });
  }
});

/**
 * [GET] /api/loans/stats - Thống kê Dashboard
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await refreshOverdueLoans();

    const booksStat = await dbAsync.get(`
      SELECT 
        COUNT(id) AS totalTitles, 
        COALESCE(SUM(quantity), 0) AS totalBooks,
        COALESCE(SUM(availableQuantity), 0) AS availableBooks
      FROM books
    `);

    const loansStat = await dbAsync.get(`
      SELECT 
        COUNT(id) AS totalLoans,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) AS activeBorrowed,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) AS overdueCount,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) AS returnedCount,
        COALESCE(SUM(fineAmount), 0) AS totalFines
      FROM loans
    `);

    const usersStat = await dbAsync.get(`
      SELECT COUNT(id) AS memberCount FROM users WHERE role = 'member'
    `);

    const topBooks = await dbAsync.all(`
      SELECT b.id, b.title, b.author, b.coverImage, b.category, b.ageRestriction, COUNT(l.id) AS borrowCount
      FROM loans l
      JOIN books b ON l.bookId = b.id
      GROUP BY b.id
      ORDER BY borrowCount DESC
      LIMIT 5
    `);

    const topMembers = await dbAsync.all(`
      SELECT u.id, u.fullName, u.contact, u.dateOfBirth, COUNT(l.id) AS borrowCount
      FROM loans l
      JOIN users u ON l.userId = u.id
      WHERE u.role = 'member'
      GROUP BY u.id
      ORDER BY borrowCount DESC
      LIMIT 5
    `);

    const recentLoans = await dbAsync.all(`
      SELECT 
        l.id,
        l.userId,
        l.bookId,
        l.borrowDate,
        l.dueDate,
        l.returnDate,
        l.status,
        l.fineAmount,
        u.fullName AS userName,
        u.contact AS userContact,
        b.title AS bookTitle,
        b.coverImage AS bookCover,
        b.ageRestriction AS bookAgeRestriction
      FROM loans l
      JOIN users u ON l.userId = u.id
      JOIN books b ON l.bookId = b.id
      ORDER BY l.id DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      stats: {
        totalTitles: booksStat.totalTitles,
        totalBooks: booksStat.totalBooks,
        borrowingBooks: booksStat.totalBooks - booksStat.availableBooks,
        availableBooks: booksStat.availableBooks,
        totalLoans: loansStat.totalLoans,
        activeLoans: loansStat.activeBorrowed + loansStat.overdueCount,
        overdueCount: loansStat.overdueCount,
        returnedCount: loansStat.returnedCount,
        totalFines: loansStat.totalFines,
        memberCount: usersStat.memberCount,
        topBooks,
        topMembers: topMembers.map(m => ({ ...m, age: calculateAge(m.dateOfBirth) })),
        recentLoans
      }
    });
  } catch (error) {
    console.error('Lỗi thống kê:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
