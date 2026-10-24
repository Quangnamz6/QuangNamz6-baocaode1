/**
 * ========================================================
 * TRANG QUẢN TRỊ VIÊN ADMIN (public/js/admin.js)
 * Chức năng hoàn chỉnh:
 * 1. Tổng quan Dashboard: Stat Cards, Top Sách, Top Độc giả, Bảng lượt mượn gần đây
 * 2. Quản lý Sách: CRUD đầy đủ 7 trường, tìm kiếm, lọc thể loại, phân trang (Pagination)
 * 3. Quản lý Mượn / Trả: Bộ lọc trạng thái, tìm kiếm, Xác nhận trả sách (+1 kho, phạt quá hạn)
 * 4. Quản lý Độc giả: Danh sách, tìm kiếm, Khóa / Mở khóa tài khoản & Reset mật khẩu
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra xác thực & quyền Admin
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    Notify.error('Từ chối truy cập', 'Trang này chỉ dành riêng cho Quản trị viên thư viện.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
    return;
  }

  // State
  let currentSection = 'dashboard';
  let booksListCache = [];
  let booksFiltered = [];
  let booksPage = 1;
  const booksPageSize = 8;
  let editingBookId = null;

  let usersListCache = [];

  const navTabs = document.querySelectorAll('.admin-nav-btn');
  const sections = {
    dashboard: document.getElementById('sectionDashboard'),
    books: document.getElementById('sectionBooks'),
    loans: document.getElementById('sectionLoans'),
    users: document.getElementById('sectionUsers')
  };

  // Switch Tab Sidebar
  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      switchSection(target);
    });
  });

  function switchSection(sectionName) {
    currentSection = sectionName;
    navTabs.forEach(b => {
      if (b.getAttribute('data-section') === sectionName) {
        b.className = 'admin-nav-btn nav-tab-btn active w-full';
      } else {
        b.className = 'admin-nav-btn nav-tab-btn w-full';
      }
    });

    Object.keys(sections).forEach(key => {
      if (sections[key]) {
        if (key === sectionName) sections[key].classList.remove('hidden');
        else sections[key].classList.add('hidden');
      }
    });

    if (sectionName === 'dashboard') loadDashboardStats();
    if (sectionName === 'books') loadBooksList();
    if (sectionName === 'loans') loadLoansList();
    if (sectionName === 'users') loadUsersList();
  }

  // ==========================================
  // 1. DASHBOARD OVERVIEW (TỔNG QUAN)
  // ==========================================
  async function loadDashboardStats() {
    const res = await apiFetch('/api/loans/stats');
    if (!res.ok || !res.data.success) return;

    const s = res.data.stats;
    document.getElementById('statTotalBooks').textContent = `${s.totalBooks} cuốn`;
    document.getElementById('statTotalTitles').textContent = `(${s.totalTitles} đầu sách)`;
    document.getElementById('statActiveLoans').textContent = `${s.activeLoans} cuốn`;
    document.getElementById('statOverdueLoans').textContent = `${s.overdueCount} phiếu`;
    document.getElementById('statTotalMembers').textContent = `${s.memberCount} độc giả`;
    document.getElementById('statTotalFines').textContent = `Phạt: ${formatCurrency(s.totalFines)}`;

    // Top Sách Mượn Nhiều
    const topBooksList = document.getElementById('topBooksList');
    if (s.topBooks && s.topBooks.length > 0) {
      topBooksList.innerHTML = s.topBooks.map((b, i) => `
        <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition border border-slate-100">
          <span class="w-6 text-center font-bold text-sm ${i === 0 ? 'text-amber-500' : 'text-slate-400'}">${i + 1}</span>
          <img src="${b.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100'}" class="w-10 h-14 object-cover rounded shadow-xs border border-slate-200">
          <div class="flex-1 min-w-0">
            <h5 class="text-xs font-bold text-slate-800 truncate">${b.title}</h5>
            <p class="text-[11px] text-slate-400 truncate">${b.author} &bull; ${b.ageRestriction === '18+' ? '⚠️ 18+' : b.ageRestriction === 'kids' ? '🧒 Trẻ em' : 'Mọi lứa tuổi'}</p>
          </div>
          <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            ${b.borrowCount} lượt
          </span>
        </div>
      `).join('');
    } else {
      topBooksList.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Chưa có lượt mượn nào.</p>';
    }

    // Top Độc Giả Tích Cực
    const topMembersList = document.getElementById('topMembersList');
    if (s.topMembers && s.topMembers.length > 0) {
      topMembersList.innerHTML = s.topMembers.map((m, i) => `
        <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition border border-slate-100">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
            ${m.fullName ? m.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div class="flex-1 min-w-0">
            <h5 class="text-xs font-bold text-slate-800 truncate">${m.fullName}</h5>
            <p class="text-[11px] text-slate-400 truncate">${m.contact} &bull; ${m.age} tuổi</p>
          </div>
          <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            ${m.borrowCount} phiếu
          </span>
        </div>
      `).join('');
    } else {
      topMembersList.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Chưa có độc giả tích cực.</p>';
    }

    // Bảng Các Lượt Mượn Gần Đây (Recent Loans)
    const recentBody = document.getElementById('dashboardRecentLoansBody');
    if (recentBody) {
      if (s.recentLoans && s.recentLoans.length > 0) {
        recentBody.innerHTML = s.recentLoans.map(l => {
          let badge = '';
          if (l.status === 'returned') {
            badge = '<span class="badge badge-info"><i class="fa-solid fa-check mr-1 text-[9px]"></i>Đã trả</span>';
          } else if (l.status === 'overdue') {
            badge = '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation mr-1 text-[9px]"></i>Quá hạn</span>';
          } else {
            badge = '<span class="badge badge-warning"><i class="fa-solid fa-clock mr-1 text-[9px]"></i>Đang mượn</span>';
          }

          return `
            <tr>
              <td class="font-mono text-xs font-bold text-indigo-600">#${l.id}</td>
              <td>
                <div class="font-bold text-slate-800 text-xs">${l.userName}</div>
                <div class="text-[11px] text-slate-400">${l.userContact}</div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <img src="${l.bookCover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60'}" class="w-7 h-10 object-cover rounded border border-slate-200">
                  <div class="max-w-[180px] truncate text-xs font-semibold text-slate-800" title="${l.bookTitle}">
                    ${l.bookTitle}
                  </div>
                </div>
              </td>
              <td class="text-xs text-slate-600">${formatDate(l.borrowDate)}</td>
              <td class="text-xs ${l.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-700'}">${formatDate(l.dueDate)}</td>
              <td>${badge}</td>
              <td class="text-right text-xs font-bold ${l.fineAmount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                ${l.fineAmount > 0 ? formatCurrency(l.fineAmount) : '0 đ'}
              </td>
            </tr>
          `;
        }).join('');
      } else {
        recentBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">Chưa có lượt mượn nào gần đây.</td></tr>`;
      }
    }
  }

  // ==========================================
  // 2. QUẢN LÝ SÁCH (CRUD & PHÂN TRANG)
  // ==========================================
  const booksTableBody = document.getElementById('adminBooksTableBody');
  const searchBookInput = document.getElementById('adminSearchBookInput');
  const categoryFilter = document.getElementById('adminCategoryFilter');
  const booksPaginationInfo = document.getElementById('booksPaginationInfo');
  const booksPaginationButtons = document.getElementById('booksPaginationButtons');

  const bookModal = document.getElementById('bookModal');
  const bookModalTitle = document.getElementById('bookModalTitle');
  const bookForm = document.getElementById('bookForm');
  const btnOpenAddBook = document.getElementById('btnOpenAddBook');
  const modalCloseBtn = document.getElementById('bookModalCloseBtn');
  const modalCancelBtn = document.getElementById('bookModalCancelBtn');

  const inputBookTitle = document.getElementById('modalBookTitle');
  const inputBookAuthor = document.getElementById('modalBookAuthor');
  const inputBookCategory = document.getElementById('modalBookCategory');
  const inputBookAge = document.getElementById('modalBookAgeRestriction');
  const inputBookQuantity = document.getElementById('modalBookQuantity');
  const inputBookCover = document.getElementById('modalBookCover');
  const inputBookDesc = document.getElementById('modalBookDesc');
  const imgCoverPreview = document.getElementById('modalCoverPreview');

  // Nạp danh mục thể loại vào dropdown
  async function loadCategoriesFilter() {
    if (!categoryFilter) return;
    const res = await apiFetch('/api/books/categories');
    if (res.ok && res.data.categories) {
      const selected = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="all">Tất cả thể loại</option>' + 
        res.data.categories.map(c => `<option value="${c}">${c}</option>`).join('');
      categoryFilter.value = selected || 'all';
    }
  }

  async function loadBooksList() {
    await loadCategoriesFilter();
    const res = await apiFetch('/api/books');
    if (!res.ok || !res.data.success) return;

    booksListCache = res.data.books || [];
    filterAndPaginateBooks();
  }

  function filterAndPaginateBooks() {
    const q = (searchBookInput?.value || '').trim().toLowerCase();
    const cat = categoryFilter?.value || 'all';

    booksFiltered = booksListCache.filter(b => {
      const matchSearch = !q || 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);
      const matchCat = cat === 'all' || b.category === cat;
      return matchSearch && matchCat;
    });

    const totalPages = Math.ceil(booksFiltered.length / booksPageSize) || 1;
    if (booksPage > totalPages) booksPage = totalPages;
    if (booksPage < 1) booksPage = 1;

    const startIdx = (booksPage - 1) * booksPageSize;
    const endIdx = startIdx + booksPageSize;
    const pageBooks = booksFiltered.slice(startIdx, endIdx);

    renderBooksTable(pageBooks);
    renderBooksPagination(booksFiltered.length, totalPages);
  }

  function renderBooksTable(books) {
    if (!booksTableBody) return;
    if (books.length === 0) {
      booksTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Không tìm thấy sách nào phù hợp.</td></tr>`;
      return;
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200';

    booksTableBody.innerHTML = books.map(book => {
      const isAvailable = book.availableQuantity > 0;
      
      let ageBadge = '';
      if (book.ageRestriction === 'kids') {
        ageBadge = '<span class="badge bg-amber-100 text-amber-800 border border-amber-200">🧒 Trẻ em</span>';
      } else if (book.ageRestriction === '18+') {
        ageBadge = '<span class="badge bg-rose-100 text-rose-700 border border-rose-200 font-bold">⚠️ 18+</span>';
      } else {
        ageBadge = '<span class="badge bg-slate-100 text-slate-600">Phổ thông</span>';
      }

      return `
        <tr>
          <td class="font-mono text-xs font-bold text-indigo-600">#${book.id}</td>
          <td>
            <div class="flex items-center gap-3">
              <img src="${book.coverImage || fallbackImg}" class="w-10 h-14 aspect-[2/3] object-cover rounded-md shadow-xs border border-slate-200" onerror="this.src='${fallbackImg}'">
              <div class="max-w-[200px]">
                <div class="font-bold text-slate-800 text-sm truncate" title="${book.title}">${book.title}</div>
                <div class="text-xs text-slate-400 truncate">${book.author}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              ${book.category}
            </span>
          </td>
          <td>
            ${ageBadge}
          </td>
          <td class="text-sm font-semibold text-slate-700">
            ${book.quantity} cuốn
          </td>
          <td>
            ${isAvailable 
              ? `<span class="badge badge-success">Còn ${book.availableQuantity}</span>` 
              : `<span class="badge badge-danger">Hết sách</span>`}
          </td>
          <td class="text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="window.editBookModal(${book.id})" class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Chỉnh sửa sách">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="window.deleteBookHandler(${book.id})" class="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Xóa sách">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderBooksPagination(totalItems, totalPages) {
    if (!booksPaginationInfo || !booksPaginationButtons) return;

    if (totalItems === 0) {
      booksPaginationInfo.textContent = 'Không có cuốn sách nào.';
      booksPaginationButtons.innerHTML = '';
      return;
    }

    const startIdx = (booksPage - 1) * booksPageSize + 1;
    const endIdx = Math.min(booksPage * booksPageSize, totalItems);
    booksPaginationInfo.innerHTML = `Hiển thị <strong class="text-slate-800">${startIdx} - ${endIdx}</strong> trong tổng số <strong class="text-slate-800">${totalItems}</strong> cuốn sách`;

    let btns = '';

    // Nút Trang trước
    btns += `
      <button onclick="window.changeBooksPage(${booksPage - 1})" 
              class="px-2.5 py-1 text-xs rounded-lg border border-slate-200 transition ${booksPage === 1 ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-700'}"
              ${booksPage === 1 ? 'disabled' : ''}>
        <i class="fa-solid fa-chevron-left text-[10px]"></i>
      </button>
    `;

    // Các số trang
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7) {
        if (p > 1 && p < booksPage - 1 && p !== 2) continue;
        if (p < totalPages && p > booksPage + 1 && p !== totalPages - 1) continue;
      }

      if (p === booksPage) {
        btns += `<button class="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs">${p}</button>`;
      } else {
        btns += `<button onclick="window.changeBooksPage(${p})" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700">${p}</button>`;
      }
    }

    // Nút Trang sau
    btns += `
      <button onclick="window.changeBooksPage(${booksPage + 1})" 
              class="px-2.5 py-1 text-xs rounded-lg border border-slate-200 transition ${booksPage === totalPages ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-700'}"
              ${booksPage === totalPages ? 'disabled' : ''}>
        <i class="fa-solid fa-chevron-right text-[10px]"></i>
      </button>
    `;

    booksPaginationButtons.innerHTML = btns;
  }

  window.changeBooksPage = (page) => {
    booksPage = page;
    filterAndPaginateBooks();
  };

  if (searchBookInput) {
    searchBookInput.addEventListener('input', () => {
      booksPage = 1;
      filterAndPaginateBooks();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      booksPage = 1;
      filterAndPaginateBooks();
    });
  }

  // Modal Sách (Thêm / Sửa)
  function openBookModal(isEdit = false, book = null) {
    bookForm.reset();
    editingBookId = isEdit && book ? book.id : null;

    if (isEdit && book) {
      bookModalTitle.textContent = `Chỉnh Sửa Thông Tin Sách (#${book.id})`;
      inputBookTitle.value = book.title || '';
      inputBookAuthor.value = book.author || '';
      inputBookCategory.value = book.category || 'Văn học';
      inputBookAge.value = book.ageRestriction || 'all';
      inputBookQuantity.value = book.quantity || 1;
      inputBookCover.value = book.coverImage || '';
      inputBookDesc.value = book.description || '';

      if (book.coverImage) {
        imgCoverPreview.src = book.coverImage;
        imgCoverPreview.classList.remove('hidden');
      } else {
        imgCoverPreview.classList.add('hidden');
      }
    } else {
      bookModalTitle.textContent = 'Thêm Sách Mới Vào Kho Thư Viện';
      inputBookQuantity.value = 5;
      inputBookAge.value = 'all';
      imgCoverPreview.classList.add('hidden');
    }

    bookModal.classList.remove('hidden');
    bookModal.classList.add('flex');
    inputBookTitle.focus();
  }

  function closeBookModal() {
    bookModal.classList.add('hidden');
    bookModal.classList.remove('flex');
    editingBookId = null;
    bookForm.reset();
  }

  if (btnOpenAddBook) btnOpenAddBook.addEventListener('click', () => openBookModal(false));
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeBookModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeBookModal);

  if (inputBookCover) {
    inputBookCover.addEventListener('input', () => {
      const url = inputBookCover.value.trim();
      if (url) {
        imgCoverPreview.src = url;
        imgCoverPreview.classList.remove('hidden');
      } else {
        imgCoverPreview.classList.add('hidden');
      }
    });
  }

  window.editBookModal = (id) => {
    const book = booksListCache.find(b => b.id === id);
    if (book) openBookModal(true, book);
  };

  if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        title: inputBookTitle.value.trim(),
        author: inputBookAuthor.value.trim(),
        category: inputBookCategory.value.trim(),
        ageRestriction: inputBookAge.value,
        quantity: parseInt(inputBookQuantity.value, 10),
        coverImage: inputBookCover.value.trim(),
        description: inputBookDesc.value.trim()
      };

      let res;
      if (editingBookId) {
        res = await apiFetch(`/api/books/${editingBookId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/books', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok && res.data.success) {
        Notify.toast(res.data.message || 'Thao tác lưu sách thành công!');
        closeBookModal();
        loadBooksList();
        loadDashboardStats();
      } else {
        Notify.error('Lỗi lưu sách', res.data.message || 'Không thể lưu sách!');
      }
    });
  }

  window.deleteBookHandler = async (id) => {
    const book = booksListCache.find(b => b.id === id);
    const title = book ? `"${book.title}"` : 'cuốn sách này';

    const ok = await Notify.confirm('Xác nhận xóa sách?', `Bạn có chắc chắn muốn xóa vĩnh viễn ${title} khỏi kho thư viện không?`, 'Xóa vĩnh viễn');
    if (!ok) return;

    const res = await apiFetch(`/api/books/${id}`, { method: 'DELETE' });
    if (res.ok && res.data.success) {
      Notify.toast('Đã xóa sách khỏi thư viện thành công!');
      loadBooksList();
      loadDashboardStats();
    } else {
      Notify.error('Không thể xóa', res.data.message || 'Có lỗi xảy ra!');
    }
  };

  // ==========================================
  // 3. QUẢN LÝ MƯỢN & TRẢ SÁCH (LOANS)
  // ==========================================
  const loansTableBody = document.getElementById('adminLoansTableBody');
  const loanTabButtons = document.querySelectorAll('.loan-filter-tab');
  const searchLoanInput = document.getElementById('adminSearchLoanInput');
  let currentLoanFilter = 'all';

  const btnOpenCreateLoan = document.getElementById('btnOpenCreateLoan');
  const createLoanModal = document.getElementById('createLoanModal');
  const createLoanForm = document.getElementById('createLoanForm');
  const selectLoanUser = document.getElementById('selectLoanUser');
  const selectLoanBook = document.getElementById('selectLoanBook');
  const closeCreateLoanBtn = document.getElementById('closeCreateLoanBtn');
  const cancelCreateLoanBtn = document.getElementById('cancelCreateLoanBtn');

  async function loadLoansList() {
    const q = searchLoanInput ? searchLoanInput.value.trim() : '';
    let url = `/api/loans?status=${encodeURIComponent(currentLoanFilter)}&search=${encodeURIComponent(q)}`;
    const res = await apiFetch(url);
    if (!res.ok || !res.data.success) return;

    renderLoansTable(res.data.loans || []);
  }

  function renderLoansTable(loans) {
    if (!loansTableBody) return;
    if (loans.length === 0) {
      loansTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Không tìm thấy phiếu mượn nào.</td></tr>`;
      return;
    }

    loansTableBody.innerHTML = loans.map(loan => {
      let statusBadge = '';
      if (loan.status === 'returned') {
        statusBadge = '<span class="badge badge-info"><i class="fa-solid fa-check mr-1 text-[9px]"></i>Đã trả</span>';
      } else if (loan.status === 'overdue') {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation mr-1 text-[9px]"></i>Quá hạn</span>';
      } else {
        statusBadge = '<span class="badge badge-warning"><i class="fa-solid fa-clock mr-1 text-[9px]"></i>Đang mượn</span>';
      }

      const isReturned = loan.status === 'returned';

      return `
        <tr>
          <td class="font-mono text-xs font-bold text-indigo-600">#${loan.id}</td>
          <td>
            <div class="font-bold text-slate-800 text-sm">${loan.userName}</div>
            <div class="text-xs text-slate-400">${loan.userContact} &bull; <strong class="text-slate-600">${loan.userAge} tuổi</strong></div>
            ${loan.deliveryAddress ? `
              <div class="text-[11px] text-indigo-700 font-semibold mt-1">
                <i class="fa-solid fa-location-dot text-[10px]"></i> Nhận: ${loan.receiverName || loan.userName} (${loan.receiverPhone || loan.userContact}) &bull; ${loan.deliveryAddress}
              </div>
            ` : ''}
          </td>
          <td>
            <div class="font-bold text-slate-800 text-sm max-w-[200px] truncate" title="${loan.bookTitle}">${loan.bookTitle}</div>
            <div class="text-xs text-slate-400">Mã sách: #${loan.bookId} ${loan.bookAgeRestriction === '18+' ? '<span class="text-rose-600 font-bold">(18+)</span>' : loan.bookAgeRestriction === 'kids' ? '<span class="text-amber-600 font-bold">(Trẻ em)</span>' : ''}</div>
          </td>
          <td class="text-xs text-slate-600">${formatDate(loan.borrowDate)}</td>
          <td class="text-xs ${loan.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}">
            ${formatDate(loan.dueDate)}
          </td>
          <td>
            ${statusBadge}
            ${loan.fineAmount > 0 ? `<div class="text-[11px] font-bold text-rose-600 mt-0.5">Phạt: ${formatCurrency(loan.fineAmount)}</div>` : ''}
          </td>
          <td class="text-right">
            ${!isReturned ? `
              <button onclick="window.adminReturnBook(${loan.id}, '${loan.bookTitle.replace(/'/g, "\\'")}', '${loan.userName.replace(/'/g, "\\'")}', ${loan.fineAmount || 0})"
                      class="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-xs flex items-center gap-1.5 ml-auto">
                <i class="fa-solid fa-arrow-rotate-left"></i> Xác Nhận Trả
              </button>
            ` : `
              <span class="text-xs text-slate-400">Đã trả: ${formatDate(loan.returnDate)}</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  function setLoanFilter(status) {
    currentLoanFilter = status;
    loanTabButtons.forEach(btn => {
      if (btn.getAttribute('data-status') === status) {
        btn.classList.remove('bg-white', 'text-slate-600');
        btn.classList.add('bg-indigo-600', 'text-white', 'shadow-xs');
      } else {
        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-xs');
        btn.classList.add('bg-white', 'text-slate-600');
      }
    });
  }

  loanTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setLoanFilter(btn.getAttribute('data-status'));
      loadLoansList();
    });
  });

  if (searchLoanInput) {
    searchLoanInput.addEventListener('input', () => {
      loadLoansList();
    });
  }

  // Xác nhận trả sách (+1 số lượng kho và tính phí phạt)
  window.adminReturnBook = async (loanId, bookTitle, userName, fineAmount) => {
    const ok = await Notify.confirmReturnBook({
      bookTitle,
      borrowerName: userName,
      fineAmount: fineAmount || 0
    });
    if (!ok) return;

    const res = await apiFetch(`/api/loans/${loanId}/return`, { method: 'POST' });
    if (res.ok && res.data.success) {
      // Toast notification góc màn hình nhỏ gọn, tự đóng sau 2 giây
      Notify.toast('Đã thu hồi sách thành công!', 'success', `"${bookTitle}" đã được đưa trở lại kho (+1).`);
      loadLoansList();
      loadDashboardStats();
    } else {
      Notify.error('Lỗi khi trả sách', res.data.message || 'Có lỗi xảy ra!');
    }
  };

  // Modal Tạo Phiếu Mượn Cho Khách
  if (btnOpenCreateLoan) {
    btnOpenCreateLoan.addEventListener('click', async () => {
      createLoanForm.reset();
      
      const [uRes, bRes] = await Promise.all([
        apiFetch('/api/auth/users'),
        apiFetch('/api/books?availableOnly=true')
      ]);

      if (uRes.ok && uRes.data.users) {
        selectLoanUser.innerHTML = '<option value="">-- Chọn độc giả mượn sách --</option>';
        uRes.data.users.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `${u.fullName} (${u.contact} - ${u.age} tuổi) - Đang mượn: ${u.activeBorrowedCount}/3`;
          selectLoanUser.appendChild(opt);
        });
      }

      if (bRes.ok && bRes.data.books) {
        selectLoanBook.innerHTML = '<option value="">-- Chọn cuốn sách cần mượn --</option>';
        bRes.data.books.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.id;
          opt.textContent = `${b.title} [${b.ageRestriction}] (Còn: ${b.availableQuantity} cuốn)`;
          selectLoanBook.appendChild(opt);
        });
      }

      createLoanModal.classList.remove('hidden');
      createLoanModal.classList.add('flex');
    });
  }

  function closeCreateLoanModal() {
    createLoanModal.classList.add('hidden');
    createLoanModal.classList.remove('flex');
    createLoanForm.reset();
  }

  if (closeCreateLoanBtn) closeCreateLoanBtn.addEventListener('click', closeCreateLoanModal);
  if (cancelCreateLoanBtn) cancelCreateLoanBtn.addEventListener('click', closeCreateLoanModal);

  if (createLoanForm) {
    createLoanForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = selectLoanUser.value;
      const bookId = selectLoanBook.value;

      if (!userId || !bookId) {
        Notify.error('Thiếu thông tin', 'Vui lòng chọn độc giả và cuốn sách cần mượn!');
        return;
      }

      const res = await apiFetch('/api/loans/borrow', {
        method: 'POST',
        body: JSON.stringify({ userId, bookId })
      });

      if (res.ok && res.data.success) {
        Notify.success('Tạo phiếu mượn thành công!', res.data.message);
        closeCreateLoanModal();
        loadLoansList();
        loadDashboardStats();
      } else {
        Notify.error('Không thể tạo phiếu mượn', res.data.message || 'Lỗi khi mượn sách!');
      }
    });
  }

  // ==========================================
  // 4. QUẢN LÝ ĐỘC GIẢ (USERS, LOCK/UNLOCK & RESET PASSWORD)
  // ==========================================
  const usersTableBody = document.getElementById('adminUsersTableBody');
  const searchUserInput = document.getElementById('adminSearchUserInput');

  async function loadUsersList() {
    const res = await apiFetch('/api/auth/users');
    if (!res.ok || !res.data.success) return;

    usersListCache = res.data.users || [];
    filterAndRenderUsers();
  }

  function filterAndRenderUsers() {
    if (!usersTableBody) return;
    const q = (searchUserInput?.value || '').trim().toLowerCase();

    const filtered = usersListCache.filter(u => {
      if (!q) return true;
      return (u.fullName && u.fullName.toLowerCase().includes(q)) ||
             (u.contact && u.contact.toLowerCase().includes(q)) ||
             (u.address && u.address.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      usersTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">Không tìm thấy độc giả nào phù hợp.</td></tr>`;
      return;
    }

    usersTableBody.innerHTML = filtered.map(u => {
      const isAdmin = u.role === 'admin';
      const count = u.activeBorrowedCount || 0;
      const isVerified = u.isVerified === 1;
      const isLocked = u.isLocked === 1;

      let statusAccountBadge = '';
      if (isAdmin) {
        statusAccountBadge = '<span class="badge bg-purple-100 text-purple-800 border border-purple-200">Quản Trị</span>';
      } else if (isLocked) {
        statusAccountBadge = '<span class="badge bg-rose-100 text-rose-700 border border-rose-300 font-bold"><i class="fa-solid fa-lock mr-1 text-[9px]"></i>Đã Khóa</span>';
      } else {
        statusAccountBadge = '<span class="badge bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-check mr-1 text-[9px]"></i>Hoạt Động</span>';
      }

      return `
        <tr>
          <td class="font-mono text-xs font-bold text-indigo-600">#${u.id}</td>
          <td>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${isAdmin ? 'from-purple-600 to-indigo-600' : 'from-indigo-600 to-blue-500'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                ${u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div class="min-w-0">
                <div class="font-bold text-slate-800 text-sm truncate">${u.fullName}</div>
                <div class="text-xs text-slate-400 truncate">${u.contact}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="font-bold text-xs ${u.age >= 18 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md'}">
              ${u.age} tuổi (${formatDate(u.dateOfBirth)})
            </span>
          </td>
          <td>
            ${isVerified 
              ? '<span class="badge badge-success"><i class="fa-solid fa-check mr-1 text-[9px]"></i>Đã xác thực OTP</span>' 
              : '<span class="badge badge-warning"><i class="fa-solid fa-clock mr-1 text-[9px]"></i>Chờ xác thực</span>'}
          </td>
          <td>
            ${statusAccountBadge}
          </td>
          <td>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${count >= 3 ? 'bg-rose-100 text-rose-700' : count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">
              ${count} / 3 quyển
            </span>
          </td>
          <td class="text-sm font-semibold text-slate-700">
            ${u.totalLoansCount || 0} lượt
          </td>
          <td class="text-right">
            ${!isAdmin ? `
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="window.adminToggleLockUser(${u.id}, '${u.fullName.replace(/'/g, "\\'")}', ${isLocked ? 1 : 0})"
                        class="p-2 text-xs font-semibold rounded-lg transition ${isLocked ? 'text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50' : 'text-rose-600 hover:bg-rose-50 bg-rose-50/50'}"
                        title="${isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}">
                  <i class="fa-solid ${isLocked ? 'fa-lock-open' : 'fa-lock'}"></i>
                  <span class="hidden xl:inline ml-1">${isLocked ? 'Mở Khóa' : 'Khóa'}</span>
                </button>
                <button onclick="window.adminResetPasswordUser(${u.id}, '${u.fullName.replace(/'/g, "\\'")}')"
                        class="p-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 bg-amber-50/50 rounded-lg transition"
                        title="Reset mật khẩu về 123456">
                  <i class="fa-solid fa-key"></i>
                  <span class="hidden xl:inline ml-1">Reset MK</span>
                </button>
              </div>
            ` : `
              <span class="text-xs text-slate-400 italic">Quản trị viên</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  if (searchUserInput) {
    searchUserInput.addEventListener('input', () => {
      filterAndRenderUsers();
    });
  }

  // Khóa / Mở khóa tài khoản độc giả
  window.adminToggleLockUser = async (userId, userName, currentLocked) => {
    const actionText = currentLocked === 1 ? 'MỞ KHÓA' : 'TẠM KHÓA';
    const confirmBtnText = currentLocked === 1 ? 'Xác nhận Mở khóa' : 'Xác nhận Khóa tài khoản';

    const ok = await Notify.confirm(
      `${actionText} tài khoản?`,
      `Bạn có chắc chắn muốn ${actionText.toLowerCase()} tài khoản độc giả "${userName}" không?${currentLocked === 0 ? '\n\nKhi bị khóa, độc giả sẽ không thể đăng nhập hoặc thực hiện mượn sách.' : ''}`,
      confirmBtnText
    );
    if (!ok) return;

    const res = await apiFetch(`/api/auth/users/${userId}/toggle-lock`, { method: 'POST' });
    if (res.ok && res.data.success) {
      Notify.success('Thành công', res.data.message);
      loadUsersList();
    } else {
      Notify.error('Không thể thực hiện', res.data.message || 'Lỗi khi thay đổi trạng thái tài khoản!');
    }
  };

  // Đặt lại mật khẩu về mặc định 123456
  window.adminResetPasswordUser = async (userId, userName) => {
    const ok = await Notify.confirm(
      'Reset Mật Khẩu?',
      `Bạn có chắc chắn muốn đặt lại mật khẩu của độc giả "${userName}" về mật khẩu mặc định "123456" không?`,
      'Đặt lại mật khẩu'
    );
    if (!ok) return;

    const res = await apiFetch(`/api/auth/users/${userId}/reset-password`, { method: 'POST' });
    if (res.ok && res.data.success) {
      Swal.fire({
        icon: 'success',
        iconColor: '#10b981',
        title: 'Reset Mật Khẩu Thành Công!',
        html: `
          <p class="text-xs text-slate-500 mb-3 text-center">Đã đặt lại mật khẩu cho độc giả <strong>${userName}</strong>.</p>
          <div class="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-center shadow-2xs">
            <span class="text-xs text-slate-400 block mb-0.5">Mật khẩu mới khởi tạo:</span>
            <span class="text-base font-mono font-bold text-indigo-700 tracking-wider">123456</span>
          </div>
        `,
        width: '410px',
        confirmButtonText: 'Đã hiểu',
        customClass: {
          popup: 'rounded-2xl p-5 shadow-xl',
          confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl font-medium shadow-sm transition-all'
        },
        buttonsStyling: false
      });
    } else {
      Notify.error('Không thể đặt lại mật khẩu', res.data.message || 'Lỗi khi reset mật khẩu!');
    }
  };

  // ==========================================
  // NAVIGATION & TỰ ĐỘNG LỌC TỪ CÁC THẺ THỐNG KÊ (STAT CARDS)
  // ==========================================
  const cardStatBooks = document.getElementById('statCardTotalBooks');
  const cardStatActiveLoans = document.getElementById('statCardActiveLoans');
  const cardStatOverdueLoans = document.getElementById('statCardOverdueLoans');
  const cardStatTotalMembers = document.getElementById('statCardTotalMembers');

  // 1. Thẻ "Tổng Sách Trong Kho": Chuyển sang Tab Quản Lý Sách & xem tất cả
  if (cardStatBooks) {
    cardStatBooks.addEventListener('click', () => {
      if (searchBookInput) searchBookInput.value = '';
      if (categoryFilter) categoryFilter.value = 'all';
      booksPage = 1;
      switchSection('books');
    });
  }

  // 2. Thẻ "Sách Đang Mượn": Chuyển sang Tab Mượn & Trả, lọc trạng thái 'borrowed' (Đang mượn)
  if (cardStatActiveLoans) {
    cardStatActiveLoans.addEventListener('click', () => {
      setLoanFilter('borrowed');
      if (searchLoanInput) searchLoanInput.value = '';
      switchSection('loans');
    });
  }

  // 3. Thẻ "Phiếu Quá Hạn": Chuyển sang Tab Mượn & Trả, lọc trạng thái 'overdue' (Quá hạn)
  if (cardStatOverdueLoans) {
    cardStatOverdueLoans.addEventListener('click', () => {
      setLoanFilter('overdue');
      if (searchLoanInput) searchLoanInput.value = '';
      switchSection('loans');
    });
  }

  // 4. Thẻ "Tổng Độc Giả": Chuyển sang Tab Quản Lý Độc Giả & xem toàn bộ thành viên
  if (cardStatTotalMembers) {
    cardStatTotalMembers.addEventListener('click', () => {
      if (searchUserInput) searchUserInput.value = '';
      switchSection('users');
    });
  }

  // Khởi động nạp dữ liệu ban đầu
  loadDashboardStats();
});
