/**
 * ========================================================
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - MODULE ĐỘC GIẢ (borrowers.js)
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  let searchQuery = '';
  let statusFilter = 'all';
  let editingMemberId = null;

  // DOM Elements
  const membersTableBody = document.getElementById('membersTableBody');
  const searchInput = document.getElementById('searchMemberInput');
  const statusFilterSelect = document.getElementById('statusFilter');
  const totalCountEl = document.getElementById('totalMembersCount');
  const activeCountEl = document.getElementById('activeMembersCount');
  const lockedCountEl = document.getElementById('lockedMembersCount');

  // Modal Thêm / Sửa
  const memberModal = document.getElementById('memberModal');
  const memberModalTitle = document.getElementById('memberModalTitle');
  const memberForm = document.getElementById('memberForm');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');

  // Input Fields
  const inputName = document.getElementById('memberName');
  const inputEmail = document.getElementById('memberEmail');
  const inputPhone = document.getElementById('memberPhone');
  const inputAddress = document.getElementById('memberAddress');

  // Modal Lịch sử mượn sách
  const historyModal = document.getElementById('historyModal');
  const historyModalTitle = document.getElementById('historyModalTitle');
  const historyContent = document.getElementById('historyContent');
  const historyCloseBtn = document.getElementById('historyCloseBtn');

  // ==========================================
  // CẬP NHẬT THỐNG KÊ NHANH
  // ==========================================
  function updateStats() {
    const members = db.getMembers();
    const active = members.filter(m => m.status === 'active').length;
    const locked = members.filter(m => m.status === 'locked').length;

    if (totalCountEl) totalCountEl.textContent = members.length;
    if (activeCountEl) activeCountEl.textContent = active;
    if (lockedCountEl) lockedCountEl.textContent = locked;
  }

  // ==========================================
  // RENDER BẢNG ĐỘC GIẢ
  // ==========================================
  function renderMembers() {
    let members = db.getMembers();
    const loans = db.getLoans();

    // 1. Tìm kiếm theo Tên, SĐT, Email
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      members = members.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.id && m.id.toLowerCase().includes(q))
      );
    }

    // 2. Lọc theo trạng thái
    if (statusFilter !== 'all') {
      members = members.filter(m => m.status === statusFilter);
    }

    if (!membersTableBody) return;

    if (members.length === 0) {
      membersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <i class="fa-solid fa-user-slash text-4xl mb-3 block text-slate-300"></i>
            Không tìm thấy thông tin độc giả nào phù hợp.
          </td>
        </tr>
      `;
      return;
    }

    membersTableBody.innerHTML = members.map(member => {
      // Đếm số sách đang mượn
      const currentBorrowing = loans.filter(l => l.memberId === member.id && l.status !== 'returned').length;
      const isLocked = member.status === 'locked';

      const statusBadge = !isLocked
        ? `<span class="badge badge-success"><i class="fa-solid fa-check mr-1 text-[10px]"></i>Hoạt động</span>`
        : `<span class="badge badge-danger"><i class="fa-solid fa-lock mr-1 text-[10px]"></i>Bị khóa</span>`;

      return `
        <tr class="transition-colors hover:bg-slate-50/80">
          <td class="font-mono text-xs font-semibold text-indigo-600">
            ${member.id}
          </td>
          <td>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-gradient-to-tr ${isLocked ? 'from-rose-500 to-rose-400' : 'from-indigo-600 to-blue-500'} flex items-center justify-center text-white font-bold text-xs shadow-sm">
                ${member.name ? member.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-sm leading-tight">${member.name}</h4>
                <p class="text-xs text-slate-400"><i class="fa-regular fa-calendar-days mr-1"></i>Gia nhập: ${db.formatDate(member.joinDate)}</p>
              </div>
            </div>
          </td>
          <td>
            <div class="text-xs space-y-1">
              <div class="text-slate-700 font-medium"><i class="fa-solid fa-phone mr-1.5 text-slate-400"></i>${member.phone || '--'}</div>
              <div class="text-slate-500"><i class="fa-regular fa-envelope mr-1.5 text-slate-400"></i>${member.email || '--'}</div>
            </div>
          </td>
          <td class="text-xs text-slate-600 max-w-[180px] truncate" title="${member.address || ''}">
            ${member.address || 'Chưa cập nhật'}
          </td>
          <td>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${currentBorrowing > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}">
              ${currentBorrowing} cuốn
            </span>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td class="text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="window.viewMemberHistory('${member.id}')" 
                      class="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Lịch sử mượn sách">
                <i class="fa-solid fa-clock-rotate-left text-sm"></i>
              </button>
              <button onclick="window.toggleMemberStatusHandler('${member.id}')" 
                      class="p-2 ${isLocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'} rounded-lg transition" 
                      title="${isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}">
                <i class="fa-solid ${isLocked ? 'fa-lock-open' : 'fa-lock'} text-sm"></i>
              </button>
              <button onclick="window.openEditMemberModal('${member.id}')" 
                      class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Chỉnh sửa">
                <i class="fa-solid fa-pen-to-square text-sm"></i>
              </button>
              <button onclick="window.deleteMemberHandler('${member.id}')" 
                      class="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Xóa độc giả">
                <i class="fa-solid fa-trash-can text-sm"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // XỬ LÝ TÌM KIẾM & BỘ LỌC
  // ==========================================
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMembers();
    });
  }

  if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      renderMembers();
    });
  }

  // ==========================================
  // MODAL THÊM / SỬA ĐỘC GIẢ
  // ==========================================
  function openModal(isEdit = false, member = null) {
    memberForm.reset();
    editingMemberId = isEdit && member ? member.id : null;

    if (isEdit && member) {
      memberModalTitle.textContent = `Cập Nhật Độc Giả (#${member.id})`;
      inputName.value = member.name || '';
      inputEmail.value = member.email || '';
      inputPhone.value = member.phone || '';
      inputAddress.value = member.address || '';
    } else {
      memberModalTitle.textContent = 'Thêm Độc Giả Mới';
    }

    memberModal.classList.remove('hidden');
    memberModal.classList.add('flex');
    inputName.focus();
  }

  function closeModal() {
    memberModal.classList.add('hidden');
    memberModal.classList.remove('flex');
    editingMemberId = null;
    memberForm.reset();
  }

  if (btnOpenAddModal) btnOpenAddModal.addEventListener('click', () => openModal(false));
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  window.openEditMemberModal = (id) => {
    const member = db.getMemberById(id);
    if (member) openModal(true, member);
  };

  // ==========================================
  // SUBMIT FORM ĐỘC GIẢ (VALIDATION)
  // ==========================================
  if (memberForm) {
    memberForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = inputName.value.trim();
      const email = inputEmail.value.trim();
      const phone = inputPhone.value.trim();
      const address = inputAddress.value.trim();

      if (!name) {
        Notify.error('Lỗi nhập liệu', 'Vui lòng nhập họ và tên độc giả!');
        inputName.focus();
        return;
      }

      // Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số)
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
      if (!phone || !phoneRegex.test(phone)) {
        Notify.error('Lỗi nhập liệu', 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại gồm 10 chữ số hợp lệ.');
        inputPhone.focus();
        return;
      }

      // Kiểm tra email nếu có nhập
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        Notify.error('Lỗi nhập liệu', 'Địa chỉ Email không đúng định dạng!');
        inputEmail.focus();
        return;
      }

      const memberData = { name, email, phone, address };

      try {
        if (editingMemberId) {
          db.updateMember(editingMemberId, memberData);
          Notify.toast('Cập nhật độc giả thành công!');
        } else {
          db.addMember(memberData);
          Notify.toast('Thêm độc giả mới thành công!');
        }
        closeModal();
        updateStats();
        renderMembers();
      } catch (err) {
        Notify.error('Thao tác thất bại', err.message);
      }
    });
  }

  // ==========================================
  // KHÓA / MỞ KHÓA TÀI KHOẢN ĐỘC GIẢ
  // ==========================================
  window.toggleMemberStatusHandler = async (id) => {
    const member = db.getMemberById(id);
    if (!member) return;

    const actionText = member.status === 'active' ? 'khóa' : 'mở khóa';
    const confirmed = await Notify.confirm(
      `Xác nhận ${actionText}?`,
      `Bạn có muốn ${actionText} tài khoản của "${member.name}" không?`,
      `Đồng ý ${actionText}`
    );

    if (confirmed) {
      db.toggleMemberStatus(id);
      Notify.toast(`Đã ${actionText} tài khoản thành công!`);
      updateStats();
      renderMembers();
    }
  };

  // ==========================================
  // XÓA ĐỘC GIẢ
  // ==========================================
  window.deleteMemberHandler = async (id) => {
    const member = db.getMemberById(id);
    if (!member) return;

    const confirmed = await Notify.confirm(
      'Xóa độc giả?',
      `Bạn có chắc chắn muốn xóa hồ sơ độc giả "${member.name}" không?`,
      'Xóa độc giả'
    );

    if (confirmed) {
      try {
        db.deleteMember(id);
        Notify.toast('Đã xóa độc giả thành công!');
        updateStats();
        renderMembers();
      } catch (err) {
        Notify.error('Không thể xóa', err.message);
      }
    }
  };

  // ==========================================
  // XEM LỊCH SỬ MƯỢN TRẢ CỦA ĐỘC GIẢ
  // ==========================================
  window.viewMemberHistory = (id) => {
    const member = db.getMemberById(id);
    if (!member || !historyModal || !historyContent) return;

    const memberLoans = db.getLoans().filter(l => l.memberId === id);
    historyModalTitle.textContent = `Lịch Sử Mượn Trả: ${member.name} (#${member.id})`;

    if (memberLoans.length === 0) {
      historyContent.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300"></i>
          <p>Độc giả này chưa có lịch sử mượn trả nào.</p>
        </div>
      `;
    } else {
      historyContent.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th class="p-2.5">Mã phiếu</th>
                <th class="p-2.5">Sách mượn</th>
                <th class="p-2.5">Ngày mượn</th>
                <th class="p-2.5">Hạn trả</th>
                <th class="p-2.5">Trạng thái</th>
                <th class="p-2.5 text-right">Phí phạt</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${memberLoans.map(l => {
                const book = db.getBookById(l.bookId);
                const bookTitle = book ? book.title : 'Sách đã xóa';

                let statusBadge = '';
                if (l.status === 'returned') {
                  statusBadge = '<span class="badge badge-info">Đã trả</span>';
                } else if (l.status === 'overdue') {
                  statusBadge = '<span class="badge badge-danger">Quá hạn</span>';
                } else {
                  statusBadge = '<span class="badge badge-warning">Đang mượn</span>';
                }

                return `
                  <tr>
                    <td class="p-2.5 font-mono font-semibold text-indigo-600">${l.id}</td>
                    <td class="p-2.5 font-medium text-slate-800">${bookTitle}</td>
                    <td class="p-2.5 text-slate-600">${db.formatDate(l.borrowDate)}</td>
                    <td class="p-2.5 text-slate-600">${db.formatDate(l.dueDate)}</td>
                    <td class="p-2.5">${statusBadge}</td>
                    <td class="p-2.5 text-right font-semibold ${l.fineAmount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                      ${l.fineAmount > 0 ? db.formatCurrency(l.fineAmount) : '--'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    historyModal.classList.remove('hidden');
    historyModal.classList.add('flex');
  };

  if (historyCloseBtn) {
    historyCloseBtn.addEventListener('click', () => {
      historyModal.classList.add('hidden');
      historyModal.classList.remove('flex');
    });
  }

  // Khởi tạo
  updateStats();
  renderMembers();
});
