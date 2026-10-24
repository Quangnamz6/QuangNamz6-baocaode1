/**
 * ========================================================
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - MODULE QUẢN LÝ SÁCH (books.js)
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Trạng thái tìm kiếm, lọc và phân trang
  let searchQuery = '';
  let selectedCategory = 'all';
  let availabilityFilter = 'all';
  let currentPage = 1;
  const itemsPerPage = 6;
  let editingBookId = null;

  // DOM Elements
  const booksTableBody = document.getElementById('booksTableBody');
  const searchInput = document.getElementById('searchBookInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const availabilitySelect = document.getElementById('availabilityFilter');
  const paginationContainer = document.getElementById('paginationContainer');
  const totalBooksBadge = document.getElementById('totalBooksCount');

  // Modal Elements
  const bookModal = document.getElementById('bookModal');
  const bookModalTitle = document.getElementById('bookModalTitle');
  const bookForm = document.getElementById('bookForm');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');

  // Form Fields
  const inputTitle = document.getElementById('bookTitle');
  const inputAuthor = document.getElementById('bookAuthor');
  const inputIsbn = document.getElementById('bookIsbn');
  const inputCategory = document.getElementById('bookCategory');
  const inputYear = document.getElementById('bookYear');
  const inputQuantity = document.getElementById('bookQuantity');
  const inputCoverUrl = document.getElementById('bookCoverUrl');
  const inputDescription = document.getElementById('bookDescription');
  const coverPreview = document.getElementById('coverPreview');

  // Modal Chi tiết
  const bookDetailModal = document.getElementById('bookDetailModal');
  const detailModalContent = document.getElementById('detailModalContent');
  const detailCloseBtn = document.getElementById('detailCloseBtn');

  // ==========================================
  // KHỞI TẠO BỘ LỌC THỂ LOẠI
  // ==========================================
  function initCategoryOptions() {
    const books = db.getBooks();
    const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean)));

    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="all">Tất cả thể loại</option>';
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });
    }
  }

  // ==========================================
  // RENDER DANH SÁCH SÁCH VÀ PHÂN TRANG
  // ==========================================
  function renderBooks() {
    let books = db.getBooks();

    // 1. Tìm kiếm theo Tên, Tác giả hoặc ISBN
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      books = books.filter(b => 
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        (b.id && b.id.toLowerCase().includes(q))
      );
    }

    // 2. Lọc theo Thể loại
    if (selectedCategory !== 'all') {
      books = books.filter(b => b.category === selectedCategory);
    }

    // 3. Lọc theo Tình trạng tồn kho
    if (availabilityFilter === 'available') {
      books = books.filter(b => b.availableQuantity > 0);
    } else if (availabilityFilter === 'out') {
      books = books.filter(b => b.availableQuantity <= 0);
    }

    // Cập nhật số lượng
    if (totalBooksBadge) {
      totalBooksBadge.textContent = `${books.length} đầu sách`;
    }

    // Phân trang
    const totalPages = Math.ceil(books.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedBooks = books.slice(startIndex, startIndex + itemsPerPage);

    // Render bảng
    if (booksTableBody) {
      if (paginatedBooks.length === 0) {
        booksTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-12 text-slate-400">
              <i class="fa-solid fa-box-open text-4xl mb-3 block text-slate-300"></i>
              Không tìm thấy sách nào phù hợp với bộ lọc hiện tại.
            </td>
          </tr>
        `;
      } else {
        booksTableBody.innerHTML = paginatedBooks.map(book => {
          const isAvailable = book.availableQuantity > 0;
          const statusBadge = isAvailable
            ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check mr-1 text-[10px]"></i>Còn ${book.availableQuantity}/${book.totalQuantity}</span>`
            : `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark mr-1 text-[10px]"></i>Hết sách</span>`;

          const fallbackImage = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300';
          const coverImg = book.coverUrl ? book.coverUrl : fallbackImage;

          return `
            <tr class="transition-colors hover:bg-slate-50/80">
              <td class="font-mono text-xs font-semibold text-indigo-600">
                ${book.id}
              </td>
              <td>
                <div class="flex items-center gap-3">
                  <img src="${coverImg}" alt="${book.title}" 
                       onerror="this.src='${fallbackImage}'"
                       class="w-11 h-14 object-cover rounded shadow-sm border border-slate-200">
                  <div class="max-w-[240px]">
                    <h4 class="font-bold text-slate-800 text-sm hover:text-indigo-600 cursor-pointer line-clamp-1" onclick="window.viewBookDetail('${book.id}')">
                      ${book.title}
                    </h4>
                    <p class="text-xs text-slate-500 line-clamp-1">ISBN: ${book.isbn || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </td>
              <td class="text-slate-600 font-medium">
                ${book.author}
              </td>
              <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                  ${book.category || 'Chung'}
                </span>
              </td>
              <td class="text-slate-600 text-sm font-medium">
                ${book.publishYear || '--'}
              </td>
              <td>
                ${statusBadge}
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button onclick="window.viewBookDetail('${book.id}')" 
                          class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Xem chi tiết">
                    <i class="fa-solid fa-eye text-sm"></i>
                  </button>
                  <button onclick="window.openEditBookModal('${book.id}')" 
                          class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Chỉnh sửa">
                    <i class="fa-solid fa-pen-to-square text-sm"></i>
                  </button>
                  <button onclick="window.deleteBookHandler('${book.id}')" 
                          class="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Xóa sách">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    renderPagination(totalPages);
  }

  // ==========================================
  // RENDER NÚT PHÂN TRANG
  // ==========================================
  function renderPagination(totalPages) {
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let buttonsHtml = '';

    // Nút Trang trước
    buttonsHtml += `
      <button onclick="window.changePage(${currentPage - 1})" 
              ${currentPage === 1 ? 'disabled class="px-3 py-1.5 text-xs font-medium text-slate-300 rounded-lg cursor-not-allowed"' : 'class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"'}>
        <i class="fa-solid fa-chevron-left mr-1"></i> Trước
      </button>
    `;

    // Các số trang
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        buttonsHtml += `
          <button class="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg shadow-sm">
            ${i}
          </button>
        `;
      } else {
        buttonsHtml += `
          <button onclick="window.changePage(${i})" 
                  class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            ${i}
          </button>
        `;
      }
    }

    // Nút Trang sau
    buttonsHtml += `
      <button onclick="window.changePage(${currentPage + 1})" 
              ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 text-xs font-medium text-slate-300 rounded-lg cursor-not-allowed"' : 'class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"'}>
        Sau <i class="fa-solid fa-chevron-right ml-1"></i>
      </button>
    `;

    paginationContainer.innerHTML = buttonsHtml;
  }

  window.changePage = (page) => {
    currentPage = page;
    renderBooks();
  };

  // ==========================================
  // XỬ LÝ SỰ KIỆN TÌM KIẾM VÀ LỌC
  // ==========================================
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderBooks();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      selectedCategory = e.target.value;
      currentPage = 1;
      renderBooks();
    });
  }

  if (availabilitySelect) {
    availabilitySelect.addEventListener('change', (e) => {
      availabilityFilter = e.target.value;
      currentPage = 1;
      renderBooks();
    });
  }

  // Xem trước ảnh bìa trực tiếp khi nhập URL
  if (inputCoverUrl && coverPreview) {
    inputCoverUrl.addEventListener('input', () => {
      const url = inputCoverUrl.value.trim();
      if (url) {
        coverPreview.src = url;
        coverPreview.classList.remove('hidden');
      } else {
        coverPreview.classList.add('hidden');
      }
    });
  }

  // ==========================================
  // MODAL: THÊM MỚI / CHỈNH SỬA SÁCH
  // ==========================================
  function openModal(isEdit = false, book = null) {
    bookForm.reset();
    editingBookId = isEdit && book ? book.id : null;

    if (isEdit && book) {
      bookModalTitle.textContent = `Chỉnh Sửa Sách (#${book.id})`;
      inputTitle.value = book.title || '';
      inputAuthor.value = book.author || '';
      inputIsbn.value = book.isbn || '';
      inputCategory.value = book.category || 'Văn học';
      inputYear.value = book.publishYear || new Date().getFullYear();
      inputQuantity.value = book.totalQuantity || 1;
      inputCoverUrl.value = book.coverUrl || '';
      inputDescription.value = book.description || '';

      if (book.coverUrl) {
        coverPreview.src = book.coverUrl;
        coverPreview.classList.remove('hidden');
      } else {
        coverPreview.classList.add('hidden');
      }
    } else {
      bookModalTitle.textContent = 'Thêm Sách Mới';
      inputYear.value = new Date().getFullYear();
      inputQuantity.value = 5;
      coverPreview.classList.add('hidden');
    }

    bookModal.classList.remove('hidden');
    bookModal.classList.add('flex');
    inputTitle.focus();
  }

  function closeModal() {
    bookModal.classList.add('hidden');
    bookModal.classList.remove('flex');
    editingBookId = null;
    bookForm.reset();
  }

  if (btnOpenAddModal) btnOpenAddModal.addEventListener('click', () => openModal(false));
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  // Mở modal sửa từ bảng
  window.openEditBookModal = (id) => {
    const book = db.getBookById(id);
    if (book) {
      openModal(true, book);
    }
  };

  // ==========================================
  // VALIDATION & SUBMIT FORM SÁCH
  // ==========================================
  if (bookForm) {
    bookForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = inputTitle.value.trim();
      const author = inputAuthor.value.trim();
      const isbn = inputIsbn.value.trim();
      const category = inputCategory.value.trim();
      const year = parseInt(inputYear.value, 10);
      const quantity = parseInt(inputQuantity.value, 10);
      const coverUrl = inputCoverUrl.value.trim();
      const description = inputDescription.value.trim();

      // Kiểm tra tính hợp lệ
      if (!title) {
        Notify.error('Lỗi nhập liệu', 'Vui lòng nhập tên cuốn sách!');
        inputTitle.focus();
        return;
      }

      if (!author) {
        Notify.error('Lỗi nhập liệu', 'Vui lòng nhập tên tác giả!');
        inputAuthor.focus();
        return;
      }

      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1000 || year > currentYear + 1) {
        Notify.error('Lỗi nhập liệu', `Năm xuất bản không hợp lệ (1000 - ${currentYear + 1})!`);
        inputYear.focus();
        return;
      }

      if (isNaN(quantity) || quantity < 1) {
        Notify.error('Lỗi nhập liệu', 'Số lượng nhập kho tối thiểu là 1 cuốn!');
        inputQuantity.focus();
        return;
      }

      const bookData = {
        title,
        author,
        isbn,
        category,
        publishYear: year,
        totalQuantity: quantity,
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
        description
      };

      try {
        if (editingBookId) {
          db.updateBook(editingBookId, bookData);
          Notify.toast('Cập nhật thông tin sách thành công!');
        } else {
          db.addBook(bookData);
          Notify.toast('Thêm sách mới vào thư viện thành công!');
        }
        closeModal();
        initCategoryOptions();
        renderBooks();
      } catch (err) {
        Notify.error('Có lỗi xảy ra', err.message);
      }
    });
  }

  // ==========================================
  // XÓA SÁCH CÓ XÁC NHẬN
  // ==========================================
  window.deleteBookHandler = async (id) => {
    const book = db.getBookById(id);
    if (!book) return;

    const confirmed = await Notify.confirm(
      'Xác nhận xóa sách?',
      `Bạn có chắc chắn muốn xóa cuốn sách "${book.title}" khỏi hệ thống không?`,
      'Xóa vĩnh viễn'
    );

    if (confirmed) {
      try {
        db.deleteBook(id);
        Notify.toast('Đã xóa sách thành công!');
        initCategoryOptions();
        renderBooks();
      } catch (err) {
        Notify.error('Không thể xóa', err.message);
      }
    }
  };

  // ==========================================
  // XEM CHI TIẾT SÁCH (MODAL)
  // ==========================================
  window.viewBookDetail = (id) => {
    const book = db.getBookById(id);
    if (!book || !detailModalContent) return;

    const fallbackImage = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';
    const isAvailable = book.availableQuantity > 0;

    detailModalContent.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div class="col-span-1">
          <img src="${book.coverUrl || fallbackImage}" 
               onerror="this.src='${fallbackImage}'"
               class="w-full h-72 object-cover rounded-xl shadow-md border border-slate-200">
        </div>
        <div class="col-span-2 space-y-3">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md">${book.id}</span>
            <span class="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-md">${book.category}</span>
            ${isAvailable 
              ? `<span class="badge badge-success">Còn ${book.availableQuantity}/${book.totalQuantity} cuốn</span>`
              : `<span class="badge badge-danger">Đã hết sách</span>`}
          </div>

          <h3 class="text-xl font-bold text-slate-800 leading-snug">${book.title}</h3>
          <p class="text-sm text-slate-600 font-medium"><i class="fa-solid fa-feather mr-1.5 text-indigo-500"></i>Tác giả: <span class="font-semibold text-slate-800">${book.author}</span></p>

          <div class="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-sm">
            <div>
              <span class="text-slate-400 text-xs block">Mã ISBN:</span>
              <span class="font-mono font-medium text-slate-700">${book.isbn || 'Chưa cập nhật'}</span>
            </div>
            <div>
              <span class="text-slate-400 text-xs block">Năm xuất bản:</span>
              <span class="font-medium text-slate-700">${book.publishYear || 'N/A'}</span>
            </div>
            <div>
              <span class="text-slate-400 text-xs block">Tổng số lượng trong kho:</span>
              <span class="font-semibold text-slate-700">${book.totalQuantity} cuốn</span>
            </div>
            <div>
              <span class="text-slate-400 text-xs block">Đang cho mượn:</span>
              <span class="font-semibold text-amber-600">${book.totalQuantity - book.availableQuantity} cuốn</span>
            </div>
          </div>

          <div>
            <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Mô tả tóm tắt:</h5>
            <p class="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              ${book.description || 'Chưa có thông tin mô tả chi tiết cho cuốn sách này.'}
            </p>
          </div>
        </div>
      </div>
    `;

    bookDetailModal.classList.remove('hidden');
    bookDetailModal.classList.add('flex');
  };

  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', () => {
      bookDetailModal.classList.add('hidden');
      bookDetailModal.classList.remove('flex');
    });
  }

  // Khởi chạy ban đầu
  initCategoryOptions();
  renderBooks();
});
