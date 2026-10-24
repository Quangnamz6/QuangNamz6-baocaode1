/**
 * ========================================================
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - MODULE MƯỢN / TRẢ (loans.js)
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentTab = 'all'; // 'all', 'borrowing', 'overdue', 'returned'
  let searchQuery = '';

  // DOM Elements
  const loansTableBody = document.getElementById('loansTableBody');
  const searchInput = document.getElementById('searchLoanInput');
  const tabButtons = document.querySelectorAll('.loan-tab-btn');

  // Thống kê nhanh
  const statAll = document.getElementById('statAllLoans');
  const statBorrowing = document.getElementById('statBorrowingLoans');
  const statOverdue = document.getElementById('statOverdueLoans');
  const statReturned = document.getElementById('statReturnedLoans');

  // Modal Tạo Phiếu Mượn
  const loanModal = document.getElementById('loanModal');
  const loanForm = document.getElementById('loanForm');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const btnOpenAddLoan = document.getElementById('btnOpenAddLoan');

  // Form Fields
  const selectMember = document.getElementById('loanMemberSelect');
  const selectBook = document.getElementById('loanBookSelect');
  const inputBorrowDate = document.getElementById('loanBorrowDate');
  const inputDueDate = document.getElementById('loanDueDate');
  const inputNote = document.getElementById('loanNote');

  // Modal Chi Tiết Phiếu
  const loanDetailModal = document.getElementById('loanDetailModal');
  const loanDetailContent = document.getElementById('loanDetailContent');
  const loanDetailCloseBtn = document.getElementById('loanDetailCloseBtn');

  // ==========================================
  // KHỞI TẠO OPTIONS CHỌN ĐỘC GIẢ VÀ SÁCH
  // ==========================================
  function populateSelectOptions() {
    const members = db.getMembers();
    const books = db.getBooks();

    // 1. Độc giả
    if (selectMember) {
      selectMember.innerHTML = '<option value="">-- Chọn độc giả mượn sách --</option>';
      members.forEach(m => {
        const isLocked = m.status === 'locked';
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.phone}) - ${isLocked ? '[TÀI KHOẢN BỊ KHÓA]' : 'Hợp lệ'}`;
        if (isLocked) opt.disabled = true;
        selectMember.appendChild(opt);
      });
    }

    // 2. Sách còn trong kho
    if (selectBook) {
      selectBook.innerHTML = '<option value="">-- Chọn sách cần mượn --</option>';
      books.forEach(b => {
        const isOutOfStock = b.availableQuantity <= 0;
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.title} (Còn ${b.availableQuantity}/${b.totalQuantity})`;
        if (isOutOfStock) opt.disabled = true;
        selectBook.appendChild(opt);
      });
    }
  }

  // ==========================================
  // CẬP NHẬT BADGE & STATS
  // ==========================================
  function updateCounters() {
    db.refreshLoanStatuses();
    const loans = db.getLoans();

    const borrowing = loans.filter(l => l.status === 'borrowing').length;
    const overdue = loans.filter(l => l.status === 'overdue').length;
    const returned = loans.filter(l => l.status === 'returned').length;

    if (statAll) statAll.textContent = loans.length;
    if (statBorrowing) statBorrowing.textContent = borrowing;
    if (statOverdue) statOverdue.textContent = overdue;
    if (statReturned) statReturned.textContent = returned;
  }

  // ==========================================
  // RENDER DANH SÁCH PHIẾU MƯỢN TRẢ
  // ==========================================
  function renderLoans() {
    db.refreshLoanStatuses();
    let loans = db.getLoans();

    // 1. Lọc theo Tab
    if (currentTab !== 'all') {
      loans = loans.filter(l => l.status === currentTab);
    }

    // 2. Tìm kiếm
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      loans = loans.filter(l => {
        const member = db.getMemberById(l.memberId);
        const book = db.getBookById(l.bookId);

        return (
          l.id.toLowerCase().includes(q) ||
          (member && member.name.toLowerCase().includes(q)) ||
          (member && member.phone.includes(q)) ||
          (book && book.title.toLowerCase().includes(q))
        );
      });
    }

    if (!loansTableBody) return;

    if (loans.length === 0) {
      loansTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12 text-slate-400">
            <i class="fa-solid fa-folder-open text-4xl mb-3 block text-slate-300"></i>
            Không có phiếu mượn nào trong danh mục này.
          </td>
        </tr>
      `;
      return;
    }

    loansTableBody.innerHTML = loans.map(loan => {
      const member = db.getMemberById(loan.memberId) || { name: 'Độc giả không tồn tại', phone: '--' };
      const book = db.getBookById(loan.bookId) || { title: 'Sách không tồn tại', coverUrl: '' };

      let statusBadge = '';
      if (loan.status === 'returned') {
        statusBadge = '<span class="badge badge-info"><i class="fa-solid fa-check-double mr-1 text-[10px]"></i>Đã trả</span>';
      } else if (loan.status === 'overdue') {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>Quá hạn</span>';
      } else {
        statusBadge = '<span class="badge badge-warning"><i class="fa-solid fa-clock mr-1 text-[10px]"></i>Đang mượn</span>';
      }

      const isReturned = loan.status === 'returned';

      return `
        <tr class="transition-colors hover:bg-slate-50/80">
          <td class="font-mono text-xs font-semibold text-indigo-600">
            ${loan.id}
          </td>
          <td>
            <div class="font-bold text-slate-800 text-sm">${member.name}</div>
            <div class="text-xs text-slate-500 font-mono">${member.phone}</div>
          </td>
          <td>
            <div class="font-medium text-slate-800 text-sm line-clamp-1 max-w-[220px]" title="${book.title}">
              ${book.title}
            </div>
            <div class="text-xs text-slate-400">Mã sách: ${loan.bookId}</div>
          </td>
          <td class="text-xs text-slate-600 font-medium">
            ${db.formatDate(loan.borrowDate)}
          </td>
          <td class="text-xs font-semibold ${loan.status === 'overdue' ? 'text-rose-600' : 'text-slate-700'}">
            ${db.formatDate(loan.dueDate)}
          </td>
          <td class="text-xs text-slate-600">
            ${loan.returnDate ? db.formatDate(loan.returnDate) : '<span class="text-slate-300">--</span>'}
          </td>
          <td>
            ${statusBadge}
            ${loan.fineAmount > 0 
              ? `<div class="text-[11px] font-bold text-rose-600 mt-1">Phạt: ${db.formatCurrency(loan.fineAmount)}</div>` 
              : ''}
          </td>
          <td class="text-right">
            <div class="flex items-center justify-end gap-1.5">
              ${!isReturned ? `
                <button onclick="window.confirmReturnBook('${loan.id}')" 
                        class="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 shadow-sm"
                        title="Xác nhận trả sách">
                  <i class="fa-solid fa-arrow-rotate-left"></i> Trả sách
                </button>
              ` : `
                <button onclick="window.viewLoanDetail('${loan.id}')" 
                        class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Xem chi tiết phiếu">
                  <i class="fa-solid fa-receipt text-sm"></i>
                </button>
              `}
              <button onclick="window.viewLoanDetail('${loan.id}')" 
                      class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Xem chi tiết">
                <i class="fa-solid fa-eye text-sm"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // XỬ LÝ TABS & TÌM KIẾM
  // ==========================================
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        b.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-50');
      });
      btn.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-50');
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');

      currentTab = btn.getAttribute('data-tab');
      renderLoans();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderLoans();
    });
  }

  // ==========================================
  // MODAL TẠO PHIẾU MƯỢN MỚI
  // ==========================================
  function openLoanModal() {
    loanForm.reset();
    populateSelectOptions();

    // Mặc định ngày mượn là hôm nay, hạn trả là 14 ngày sau
    const today = new Date().toISOString().split('T')[0];
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    const dueDateStr = defaultDue.toISOString().split('T')[0];

    inputBorrowDate.value = today;
    inputDueDate.value = dueDateStr;
    inputDueDate.min = today; // Hạn trả phải từ hôm nay trở đi

    loanModal.classList.remove('hidden');
    loanModal.classList.add('flex');
  }

  function closeLoanModal() {
    loanModal.classList.add('hidden');
    loanModal.classList.remove('flex');
    loanForm.reset();
  }

  if (btnOpenAddLoan) btnOpenAddLoan.addEventListener('click', openLoanModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeLoanModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeLoanModal);

  // Submit tạo phiếu
  if (loanForm) {
    loanForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const memberId = selectMember.value;
      const bookId = selectBook.value;
      const borrowDate = inputBorrowDate.value;
      const dueDate = inputDueDate.value;
      const note = inputNote.value.trim();

      if (!memberId) {
        Notify.error('Lỗi nhập liệu', 'Vui lòng chọn độc giả!');
        return;
      }
      if (!bookId) {
        Notify.error('Lỗi nhập liệu', 'Vui lòng chọn sách cần mượn!');
        return;
      }
      if (!dueDate) {
        Notify.error('Lỗi nhập liệu', 'Vui lòng chọn hạn trả sách!');
        return;
      }

      if (new Date(dueDate) <= new Date(borrowDate)) {
        Notify.error('Lỗi ngày tháng', 'Hạn trả sách phải sau ngày mượn sách!');
        return;
      }

      try {
        db.createLoan({
          memberId,
          bookId,
          borrowDate,
          dueDate,
          note
        });

        Notify.toast('Tạo phiếu mượn sách thành công!');
        closeLoanModal();
        updateCounters();
        renderLoans();
      } catch (err) {
        Notify.error('Tạo phiếu mượn thất bại', err.message);
      }
    });
  }

  // ==========================================
  // XÁC NHẬN TRẢ SÁCH (TÍNH PHẠT TỰ ĐỘNG)
  // ==========================================
  window.confirmReturnBook = async (loanId) => {
    const loan = db.getLoans().find(l => l.id === loanId);
    if (!loan) return;

    const book = db.getBookById(loan.bookId);
    const member = db.getMemberById(loan.memberId);

    // Tính toán trễ hạn dự kiến
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(loan.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    let lateDays = 0;
    let lateFee = 0;
    if (today > dueDate) {
      lateDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      lateFee = lateDays * FINE_RATE_PER_DAY;
    }

    let confirmMsg = `Xác nhận nhận lại sách "${book ? book.title : ''}" từ độc giả "${member ? member.name : ''}"?`;
    if (lateDays > 0) {
      confirmMsg += `\n\n⚠️ Chú ý: Phiếu mượn đã quá hạn ${lateDays} ngày!\nTiền phạt dự kiến: ${db.formatCurrency(lateFee)} (5.000 VNĐ/ngày).`;
    }

    const confirmed = await Notify.confirm(
      'Xác nhận trả sách',
      confirmMsg,
      'Xác nhận hoàn tất'
    );

    if (confirmed) {
      try {
        const updatedLoan = db.returnLoan(loanId);
        if (updatedLoan.fineAmount > 0) {
          Notify.success(
            'Đã nhận sách thành công!',
            `Độc giả trả trễ hạn ${lateDays} ngày. Tổng tiền phạt thu: ${db.formatCurrency(updatedLoan.fineAmount)}`
          );
        } else {
          Notify.toast('Xác nhận trả sách đúng hạn thành công!');
        }
        updateCounters();
        renderLoans();
      } catch (err) {
        Notify.error('Lỗi khi trả sách', err.message);
      }
    }
  };

  // ==========================================
  // XEM CHI TIẾT PHIẾU MƯỢN TRẢ
  // ==========================================
  window.viewLoanDetail = (loanId) => {
    const loan = db.getLoans().find(l => l.id === loanId);
    if (!loan || !loanDetailModal || !loanDetailContent) return;

    const book = db.getBookById(loan.bookId) || { title: 'N/A', author: 'N/A' };
    const member = db.getMemberById(loan.memberId) || { name: 'N/A', phone: 'N/A', email: 'N/A' };

    let statusHtml = '';
    if (loan.status === 'returned') {
      statusHtml = '<span class="badge badge-info">Đã hoàn trả</span>';
    } else if (loan.status === 'overdue') {
      statusHtml = '<span class="badge badge-danger">Đang quá hạn</span>';
    } else {
      statusHtml = '<span class="badge badge-warning">Đang mượn</span>';
    }

    loanDetailContent.innerHTML = `
      <div class="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
        <div class="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <h4 class="text-xs uppercase tracking-wider text-slate-400 font-bold">Mã Phiếu Mượn</h4>
            <div class="font-mono text-lg font-bold text-indigo-600">${loan.id}</div>
          </div>
          <div>
            ${statusHtml}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-slate-400 text-xs block">Độc giả:</span>
            <div class="font-bold text-slate-800">${member.name}</div>
            <div class="text-xs text-slate-500"><i class="fa-solid fa-phone mr-1"></i>${member.phone}</div>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">Sách mượn:</span>
            <div class="font-bold text-slate-800 line-clamp-2">${book.title}</div>
            <div class="text-xs text-slate-500">Tác giả: ${book.author}</div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
          <div>
            <span class="text-slate-400 block">Ngày mượn:</span>
            <span class="font-semibold text-slate-700">${db.formatDate(loan.borrowDate)}</span>
          </div>
          <div>
            <span class="text-slate-400 block">Hạn trả:</span>
            <span class="font-semibold text-slate-700">${db.formatDate(loan.dueDate)}</span>
          </div>
          <div>
            <span class="text-slate-400 block">Ngày trả thực tế:</span>
            <span class="font-semibold ${loan.returnDate ? 'text-indigo-600' : 'text-slate-400'}">
              ${loan.returnDate ? db.formatDate(loan.returnDate) : 'Chưa trả'}
            </span>
          </div>
        </div>

        ${loan.fineAmount > 0 ? `
          <div class="p-3 bg-rose-50 border border-rose-200 rounded-lg flex justify-between items-center text-sm">
            <span class="font-medium text-rose-800"><i class="fa-solid fa-receipt mr-1.5"></i>Phí phạt trễ hạn:</span>
            <span class="font-bold text-rose-600 text-base">${db.formatCurrency(loan.fineAmount)}</span>
          </div>
        ` : ''}

        ${loan.note ? `
          <div class="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <strong class="text-slate-600">Ghi chú:</strong> ${loan.note}
          </div>
        ` : ''}
      </div>
    `;

    loanDetailModal.classList.remove('hidden');
    loanDetailModal.classList.add('flex');
  };

  if (loanDetailCloseBtn) {
    loanDetailCloseBtn.addEventListener('click', () => {
      loanDetailModal.classList.add('hidden');
      loanDetailModal.classList.remove('flex');
    });
  }

  // Khởi tạo
  updateCounters();
  renderLoans();
});
