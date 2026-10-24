/**
 * ========================================================
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN (LIBRARY MANAGEMENT SYSTEM)
 * Core Logic & Quản lý Mock Data (localStorage)
 * ========================================================
 */

// Định danh key lưu trữ trong localStorage
const STORAGE_KEYS = {
  BOOKS: 'LMS_BOOKS_DATA',
  MEMBERS: 'LMS_MEMBERS_DATA',
  LOANS: 'LMS_LOANS_DATA',
  SETTINGS: 'LMS_SETTINGS_DATA'
};

// Đơn giá phạt trễ hạn: 5.000 VNĐ / ngày
const FINE_RATE_PER_DAY = 5000;

// ==========================================
// 1. DỮ LIỆU MẪU BAN ĐẦU (INITIAL MOCK DATA)
// ==========================================
const INITIAL_BOOKS = [
  {
    id: 'B001',
    isbn: '978-604-2-08560-1',
    title: 'Nhà Giả Kim (The Alchemist)',
    author: 'Paulo Coelho',
    category: 'Văn học',
    publishYear: 2020,
    totalQuantity: 8,
    availableQuantity: 6,
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
    description: 'Cuốn tiểu thuyết nổi tiếng về hành trình theo đuổi ước mơ và lắng nghe tiếng nói của trái tim.'
  },
  {
    id: 'B002',
    isbn: '978-604-58-9034-9',
    title: 'Đắc Nhân Tâm (How to Win Friends)',
    author: 'Dale Carnegie',
    category: 'Kỹ năng sống',
    publishYear: 2021,
    totalQuantity: 10,
    availableQuantity: 8,
    coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600',
    description: 'Nghệ thuật thu phục lòng người, tạo dựng mối quan hệ chân thành và thành công trong cuộc sống.'
  },
  {
    id: 'B003',
    isbn: '978-0132350884',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    category: 'Công nghệ thông tin',
    publishYear: 2019,
    totalQuantity: 5,
    availableQuantity: 3,
    coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=600',
    description: 'Cẩm nang hướng dẫn viết mã sạch, dễ bảo trì và mở rộng cho lập trình viên chuyên nghiệp.'
  },
  {
    id: 'B004',
    isbn: '978-604-77-5120-4',
    title: 'Sapiens: Lược Sử Loài Người',
    author: 'Yuval Noah Harari',
    category: 'Lịch sử - Xã hội',
    publishYear: 2018,
    totalQuantity: 6,
    availableQuantity: 4,
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
    description: 'Khám phá toàn bộ tiến trình lịch sử nhân loại từ thời kỳ đồ đá cho đến kỷ nguyên hiện đại.'
  },
  {
    id: 'B005',
    isbn: '978-604-1-17180-0',
    title: 'Tư Duy Nhanh Và Chậm',
    author: 'Daniel Kahneman',
    category: 'Tâm lý học',
    publishYear: 2017,
    totalQuantity: 4,
    availableQuantity: 2,
    coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=600',
    description: 'Phân tích hai hệ thống tư duy chi phối nhận thức và những sai lầm trong việc ra quyết định của con người.'
  },
  {
    id: 'B006',
    isbn: '978-0131103627',
    title: 'The C Programming Language',
    author: 'Brian W. Kernighan & Dennis M. Ritchie',
    category: 'Công nghệ thông tin',
    publishYear: 2015,
    totalQuantity: 3,
    availableQuantity: 0,
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
    description: 'Cuốn sách kinh điển đặt nền móng kiến thức ngôn ngữ C và khoa học máy tính cơ bản.'
  },
  {
    id: 'B007',
    isbn: '978-604-2-01925-5',
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry',
    category: 'Văn học',
    publishYear: 2022,
    totalQuantity: 7,
    availableQuantity: 6,
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600',
    description: 'Câu chuyện thần tiên đầy tính triết lý về tình bạn, tình yêu và ý nghĩa đích thực của cuộc sống.'
  }
];

const INITIAL_MEMBERS = [
  {
    id: 'M001',
    name: 'Nguyễn Văn An',
    email: 'nguyenvanan@gmail.com',
    phone: '0912345678',
    address: 'Hai Bà Trưng, Hà Nội',
    joinDate: '2025-01-15',
    status: 'active' // 'active' hoặc 'locked'
  },
  {
    id: 'M002',
    name: 'Trần Thị Mai',
    email: 'tranmai99@gmail.com',
    phone: '0987654321',
    address: 'Quận 1, TP. Hồ Chí Minh',
    joinDate: '2025-02-10',
    status: 'active'
  },
  {
    id: 'M003',
    name: 'Lê Hoàng Nam',
    email: 'lehoangnam@outlook.com',
    phone: '0903112233',
    address: 'Hải Châu, Đà Nẵng',
    joinDate: '2025-03-01',
    status: 'locked'
  },
  {
    id: 'M004',
    name: 'Phạm Minh Anh',
    email: 'minhanh.pham@gmail.com',
    phone: '0945678901',
    address: 'Ninh Kiều, Cần Thơ',
    joinDate: '2025-03-20',
    status: 'active'
  }
];

// Hàm tạo ngày lùi lại hoặc tiến lên
function getRelativeDate(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

const INITIAL_LOANS = [
  {
    id: 'L001',
    memberId: 'M001',
    bookId: 'B001',
    borrowDate: getRelativeDate(-14),
    dueDate: getRelativeDate(-4), // Đã quá hạn 4 ngày
    returnDate: null,
    status: 'overdue', // 'borrowing', 'returned', 'overdue'
    fineAmount: 20000,
    note: 'Đang trễ hạn 4 ngày'
  },
  {
    id: 'L002',
    memberId: 'M002',
    bookId: 'B003',
    borrowDate: getRelativeDate(-5),
    dueDate: getRelativeDate(9),
    returnDate: null,
    status: 'borrowing',
    fineAmount: 0,
    note: 'Mượn phục vụ nghiên cứu đồ án'
  },
  {
    id: 'L003',
    memberId: 'M004',
    bookId: 'B002',
    borrowDate: getRelativeDate(-20),
    dueDate: getRelativeDate(-6),
    returnDate: getRelativeDate(-6),
    status: 'returned',
    fineAmount: 0,
    note: 'Đã hoàn trả đúng hạn, sách nguyên vẹn'
  },
  {
    id: 'L004',
    memberId: 'M001',
    bookId: 'B006',
    borrowDate: getRelativeDate(-10),
    dueDate: getRelativeDate(4),
    returnDate: null,
    status: 'borrowing',
    fineAmount: 0,
    note: 'Độc giả xin gia hạn thêm'
  }
];

// ==========================================
// 2. CÁC HÀM XỬ LÝ DATABASE (LOCAL STORAGE)
// ==========================================

class LibraryService {
  constructor() {
    this.initDatabase();
    this.refreshLoanStatuses();
  }

  // Khởi tạo dữ liệu mẫu nếu chưa có trong LocalStorage
  initDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(INITIAL_BOOKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOANS)) {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(INITIAL_LOANS));
    }
  }

  // --- Quản lý Sách ---
  getBooks() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS) || '[]');
  }

  getBookById(id) {
    return this.getBooks().find(b => b.id === id);
  }

  saveBooks(books) {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  }

  addBook(bookData) {
    const books = this.getBooks();
    const newBook = {
      ...bookData,
      id: 'B' + String(Date.now()).slice(-4),
      availableQuantity: parseInt(bookData.totalQuantity, 10),
      totalQuantity: parseInt(bookData.totalQuantity, 10),
      publishYear: parseInt(bookData.publishYear, 10)
    };
    books.unshift(newBook);
    this.saveBooks(books);
    return newBook;
  }

  updateBook(id, bookData) {
    const books = this.getBooks();
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      const current = books[index];
      const diffQuantity = parseInt(bookData.totalQuantity, 10) - current.totalQuantity;
      const newAvailable = Math.max(0, current.availableQuantity + diffQuantity);

      books[index] = {
        ...current,
        ...bookData,
        totalQuantity: parseInt(bookData.totalQuantity, 10),
        availableQuantity: newAvailable,
        publishYear: parseInt(bookData.publishYear, 10)
      };
      this.saveBooks(books);
      return books[index];
    }
    return null;
  }

  deleteBook(id) {
    // Kiểm tra xem sách có đang trong phiếu mượn chưa trả không
    const activeLoans = this.getLoans().filter(l => l.bookId === id && l.status !== 'returned');
    if (activeLoans.length > 0) {
      throw new Error('Không thể xóa sách đang được độc giả mượn!');
    }
    const books = this.getBooks().filter(b => b.id !== id);
    this.saveBooks(books);
    return true;
  }

  // --- Quản lý Độc giả ---
  getMembers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS) || '[]');
  }

  getMemberById(id) {
    return this.getMembers().find(m => m.id === id);
  }

  saveMembers(members) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }

  addMember(memberData) {
    const members = this.getMembers();
    const newMember = {
      ...memberData,
      id: 'M' + String(Date.now()).slice(-4),
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    members.unshift(newMember);
    this.saveMembers(members);
    return newMember;
  }

  updateMember(id, memberData) {
    const members = this.getMembers();
    const index = members.findIndex(m => m.id === id);
    if (index !== -1) {
      members[index] = { ...members[index], ...memberData };
      this.saveMembers(members);
      return members[index];
    }
    return null;
  }

  toggleMemberStatus(id) {
    const members = this.getMembers();
    const member = members.find(m => m.id === id);
    if (member) {
      member.status = member.status === 'active' ? 'locked' : 'active';
      this.saveMembers(members);
      return member;
    }
    return null;
  }

  deleteMember(id) {
    const activeLoans = this.getLoans().filter(l => l.memberId === id && l.status !== 'returned');
    if (activeLoans.length > 0) {
      throw new Error('Độc giả này đang có sách chưa hoàn trả, không thể xóa!');
    }
    const members = this.getMembers().filter(m => m.id !== id);
    this.saveMembers(members);
    return true;
  }

  // --- Quản lý Mượn / Trả ---
  getLoans() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOANS) || '[]');
  }

  saveLoans(loans) {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
  }

  createLoan(loanData) {
    const member = this.getMemberById(loanData.memberId);
    if (!member) throw new Error('Không tìm thấy thông tin độc giả!');
    if (member.status === 'locked') throw new Error('Tài khoản độc giả này hiện đang bị KHÓA!');

    const book = this.getBookById(loanData.bookId);
    if (!book) throw new Error('Không tìm thấy thông tin sách!');
    if (book.availableQuantity <= 0) throw new Error('Sách này hiện đã hết trong kho!');

    const newLoan = {
      id: 'L' + String(Date.now()).slice(-4),
      memberId: loanData.memberId,
      bookId: loanData.bookId,
      borrowDate: loanData.borrowDate || new Date().toISOString().split('T')[0],
      dueDate: loanData.dueDate,
      returnDate: null,
      status: 'borrowing',
      fineAmount: 0,
      note: loanData.note || 'Mượn tại quầy'
    };

    // Giảm số lượng sách khả dụng
    book.availableQuantity -= 1;
    this.updateBook(book.id, book);

    // Lưu phiếu mượn
    const loans = this.getLoans();
    loans.unshift(newLoan);
    this.saveLoans(loans);
    return newLoan;
  }

  returnLoan(loanId) {
    const loans = this.getLoans();
    const loan = loans.find(l => l.id === loanId);
    if (!loan) throw new Error('Không tìm thấy phiếu mượn!');
    if (loan.status === 'returned') throw new Error('Phiếu mượn này đã được trả trước đó!');

    const todayStr = new Date().toISOString().split('T')[0];
    loan.returnDate = todayStr;
    loan.status = 'returned';

    // Tính phí phạt nếu trả trễ
    const dueTime = new Date(loan.dueDate).getTime();
    const returnTime = new Date(todayStr).getTime();
    if (returnTime > dueTime) {
      const diffDays = Math.ceil((returnTime - dueTime) / (1000 * 3600 * 24));
      loan.fineAmount = diffDays * FINE_RATE_PER_DAY;
      loan.note = (loan.note ? loan.note + ' | ' : '') + `Trả trễ ${diffDays} ngày. Phạt: ${this.formatCurrency(loan.fineAmount)}`;
    } else {
      loan.fineAmount = 0;
    }

    // Tăng lại số lượng sách trong kho
    const book = this.getBookById(loan.bookId);
    if (book) {
      book.availableQuantity = Math.min(book.totalQuantity, book.availableQuantity + 1);
      this.updateBook(book.id, book);
    }

    this.saveLoans(loans);
    return loan;
  }

  // Tự động kiểm tra và cập nhật trạng thái các phiếu mượn quá hạn
  refreshLoanStatuses() {
    const loans = this.getLoans();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasChange = false;
    loans.forEach(loan => {
      if (loan.status !== 'returned') {
        const dueDate = new Date(loan.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
          loan.status = 'overdue';
          loan.fineAmount = diffDays * FINE_RATE_PER_DAY;
          hasChange = true;
        } else {
          loan.status = 'borrowing';
          loan.fineAmount = 0;
        }
      }
    });

    if (hasChange) {
      this.saveLoans(loans);
    }
  }

  // Thống kê cho trang Dashboard Admin
  getDashboardStats() {
    const books = this.getBooks();
    const members = this.getMembers();
    const loans = this.getLoans();

    const totalBooks = books.reduce((acc, b) => acc + (b.totalQuantity || 0), 0);
    const totalTitles = books.length;
    const borrowingLoans = loans.filter(l => l.status === 'borrowing' || l.status === 'overdue');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const totalFines = overdueLoans.reduce((acc, l) => acc + (l.fineAmount || 0), 0);

    // Tính top sách mượn nhiều nhất
    const bookBorrowCount = {};
    loans.forEach(l => {
      bookBorrowCount[l.bookId] = (bookBorrowCount[l.bookId] || 0) + 1;
    });

    const topBooks = Object.keys(bookBorrowCount)
      .map(bookId => ({
        book: this.getBookById(bookId),
        count: bookBorrowCount[bookId]
      }))
      .filter(item => item.book)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTitles,
      totalBooks,
      borrowingCount: borrowingLoans.length,
      membersCount: members.length,
      activeMembersCount: members.filter(m => m.status === 'active').length,
      overdueCount: overdueLoans.length,
      totalFines,
      topBooks,
      recentLoans: loans.slice(0, 5)
    };
  }

  // Format tiền tệ Việt Nam
  formatCurrency(amount) {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  // Format ngày DD/MM/YYYY
  formatDate(dateStr) {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  // Reset toàn bộ dữ liệu về ban đầu (Dùng khi cần test lại)
  resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(INITIAL_BOOKS));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(INITIAL_LOANS));
    this.refreshLoanStatuses();
  }
}

// Tạo đối tượng dùng chung toàn hệ thống
const db = new LibraryService();

// ==========================================
// 3. THÔNG BÁO VÀ HỘP THOẠI (SWEETALERT2)
// ==========================================

const Notify = {
  toast(title, icon = 'success') {
    if (typeof Swal !== 'undefined') {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });
      Toast.fire({ icon, title });
    } else {
      alert(title);
    }
  },

  success(title, text = '') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        confirmButtonColor: '#4f46e5'
      });
    }
    alert(title);
  },

  error(title, text = '') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        confirmButtonColor: '#ef4444'
      });
    }
    alert(title + '\n' + text);
  },

  async confirm(title, text, confirmText = 'Đồng ý') {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: confirmText,
        cancelButtonText: 'Hủy bỏ',
        reverseButtons: true
      });
      return result.isConfirmed;
    }
    return confirm(title + '\n' + text);
  }
};
