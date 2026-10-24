/**
 * ========================================================
 * TRANG CÁ NHÂN ĐỘC GIẢ (public/js/profile.js)
 * Cập nhật: Hiển thị thông tin người nhận (receiverName, phone, address)
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    Notify.toast('Vui lòng đăng nhập để xem thông tin cá nhân!', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
    return;
  }

  const userNameEl = document.getElementById('profileUserName');
  const userEmailEl = document.getElementById('profileUserEmail');
  const userRoleBadge = document.getElementById('profileUserRole');
  const userAgeEl = document.getElementById('profileUserAge');
  const activeCountEl = document.getElementById('profileActiveCount');
  const borrowLimitProgress = document.getElementById('borrowLimitProgress');
  const profileLimitDesc = document.getElementById('profileLimitDesc');
  const userTotalPointsEl = document.getElementById('userTotalPoints');
  const perkActionContainer = document.getElementById('perkActionContainer');

  const badgeLoyal = document.getElementById('badge-loyal');
  const badgeLoyalStatus = document.getElementById('badge-loyal-status');
  const badgeMaster = document.getElementById('badge-master');
  const badgeMasterStatus = document.getElementById('badge-master-status');
  const badgeLegend = document.getElementById('badge-legend');
  const badgeLegendStatus = document.getElementById('badge-legend-status');

  const activeLoansList = document.getElementById('activeLoansList');
  const returnedLoansList = document.getElementById('returnedLoansList');
  const emptyActiveNotice = document.getElementById('emptyActiveNotice');
  const emptyReturnedNotice = document.getElementById('emptyReturnedNotice');

  let currentUserData = null;

  // 1. Tải thông tin tài khoản
  async function loadUserProfile() {
    const res = await apiFetch('/api/auth/me');
    if (res.ok && res.data.user) {
      const u = res.data.user;
      currentUserData = u;
      userNameEl.textContent = u.fullName;
      userEmailEl.textContent = u.contact;
      userRoleBadge.textContent = u.role === 'admin' ? 'Quản Trị Viên' : 'Độc Giả Thư Viện';
      
      if (userAgeEl) {
        userAgeEl.textContent = `${u.age} tuổi (Sinh ngày: ${formatDate(u.dateOfBirth)})`;
      }

      // Giới hạn mượn sách & Điểm thưởng
      const points = u.points !== undefined && u.points !== null ? u.points : 100;
      const maxLimit = u.maxBorrowLimit || u.max_borrow_limit || 3;
      const count = u.activeBorrowedCount || 0;

      if (userTotalPointsEl) {
        userTotalPointsEl.textContent = points;
      }

      activeCountEl.textContent = `${count} / ${maxLimit} quyển`;
      if (profileLimitDesc) {
        profileLimitDesc.textContent = `Giới hạn tối đa ${maxLimit} quyển sách chưa trả cùng lúc.`;
      }
      
      const percent = Math.min(100, Math.round((count / maxLimit) * 100));
      borrowLimitProgress.style.width = `${percent}%`;
      if (count >= maxLimit) {
        borrowLimitProgress.className = 'h-full rounded-full bg-rose-500 transition-all duration-500';
      } else {
        borrowLimitProgress.className = 'h-full rounded-full bg-indigo-600 transition-all duration-500';
      }

      // Cập nhật Bảng Huy Hiệu
      updateBadges(points);

      // Cập nhật Nút Đổi Đặc Quyền
      updatePerkButton(points, maxLimit);
    }
  }

  function updateBadges(points) {
    // Huy hiệu 2: Độc Giả Thân Thiết (đã mượn từ 3 cuốn trở lên hoặc tích lũy >= 50 điểm)
    if (points >= 50) {
      badgeLoyal.classList.add('border-indigo-300', 'bg-indigo-50/40');
      badgeLoyalStatus.innerHTML = '<span class="text-indigo-600 font-semibold"><i class="fa-solid fa-check"></i> Đã mở khóa</span>';
    } else {
      badgeLoyalStatus.textContent = 'Cần từ 50 điểm';
    }

    // Huy hiệu 3: Bậc Thầy Tri Thức (>= 150 điểm)
    if (points >= 150) {
      badgeMaster.classList.add('border-amber-300', 'bg-amber-50/40');
      badgeMasterStatus.innerHTML = '<span class="text-amber-600 font-semibold"><i class="fa-solid fa-check"></i> Đã mở khóa</span>';
    } else {
      badgeMasterStatus.textContent = `Cần 150 điểm (còn thiếu ${150 - points})`;
    }

    // Huy hiệu 4: Đại Sứ Thư Viện (>= 300 điểm)
    if (points >= 300) {
      badgeLegend.classList.add('border-purple-300', 'bg-purple-50/40');
      badgeLegendStatus.innerHTML = '<span class="text-purple-600 font-semibold"><i class="fa-solid fa-check"></i> Đã mở khóa</span>';
    } else {
      badgeLegendStatus.textContent = `Cần 300 điểm (còn thiếu ${300 - points})`;
    }
  }

  function updatePerkButton(points, maxLimit) {
    if (!perkActionContainer) return;

    if (maxLimit >= 5) {
      perkActionContainer.innerHTML = `
        <div class="py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs">
          <i class="fa-solid fa-circle-check text-emerald-600"></i> Đã Kích Hoạt Đặc Quyền (Tối đa 5 quyển)
        </div>
      `;
    } else {
      const canAfford = points >= 200;
      perkActionContainer.innerHTML = `
        <button id="btnRedeemPerk" type="button" 
                class="w-full py-2.5 px-4 ${canAfford ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 cursor-pointer shadow-md shadow-purple-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-unlock-keyhole"></i> ${canAfford ? 'Đổi 200 Điểm Mở Rộng' : `Chưa Đủ Điểm (${points}/200)`}
        </button>
      `;

      const btn = document.getElementById('btnRedeemPerk');
      if (btn && canAfford) {
        btn.addEventListener('click', handleRedeemPerk);
      }
    }
  }

  async function handleRedeemPerk() {
    const result = await Swal.fire({
      title: 'Xác nhận đổi đặc quyền?',
      text: 'Bạn có muốn dùng 200 điểm thưởng để nâng giới hạn mượn sách lên 5 quyển không?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý đổi ngay',
      cancelButtonText: 'Để sau'
    });

    if (!result.isConfirmed) return;

    const res = await apiFetch('/api/auth/redeem-perk', { method: 'POST' });
    if (res.ok && res.data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Chúc Mừng!',
        text: res.data.message || 'Bạn đã nâng cấp thành công đặc quyền mượn tối đa 5 quyển sách!',
        confirmButtonColor: '#7c3aed'
      });
      loadUserProfile();
    } else {
      Notify.error('Không thể đổi đặc quyền', res.data?.message || 'Lỗi xử lý.');
    }
  }

  // 2. Tải danh sách sách
  async function loadMyLoans() {
    const res = await apiFetch('/api/loans/my-loans');
    if (!res.ok || !res.data.success) {
      Notify.error('Lỗi', 'Không thể tải danh sách phiếu mượn của bạn.');
      return;
    }

    const { activeLoans, returnedLoans } = res.data;
    const fallbackImg = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300';

    // Render Sách đang mượn
    if (activeLoans.length === 0) {
      emptyActiveNotice.classList.remove('hidden');
      activeLoansList.innerHTML = '';
    } else {
      emptyActiveNotice.classList.add('hidden');
      activeLoansList.innerHTML = activeLoans.map(loan => {
        const isOverdue = loan.isOverdue || loan.status === 'overdue' || loan.daysRemaining < 0;
        const isDueSoon = loan.isDueSoon || (!isOverdue && loan.daysRemaining >= 0 && loan.daysRemaining <= 2);
        const overdueDays = loan.overdueDays || Math.max(1, Math.abs(loan.daysRemaining || 1));
        const fineAmount = loan.fineAmount > 0 ? loan.fineAmount : (isOverdue ? overdueDays * 5000 : 0);

        let ageTag = '';
        if (loan.bookAgeRestriction === 'kids') {
          ageTag = '<span class="badge bg-amber-100 text-amber-800 border border-amber-200">🧒 Trẻ em</span>';
        } else if (loan.bookAgeRestriction === '18+') {
          ageTag = '<span class="badge bg-rose-100 text-rose-700 border border-rose-200 font-bold">⚠️ 18+</span>';
        }

        return `
          <div class="p-5 rounded-2xl bg-white border ${isOverdue ? 'border-rose-300 shadow-sm shadow-rose-100 bg-rose-50/20 ring-1 ring-rose-200' : (isDueSoon ? 'border-amber-300 shadow-sm shadow-amber-100 bg-amber-50/20 ring-1 ring-amber-200' : 'border-slate-200/80 shadow-xs')} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:shadow-md">
            
            <div class="flex items-center gap-4 min-w-0">
              <img src="${loan.bookCover || fallbackImg}" alt="${loan.bookTitle}" 
                   onerror="this.src='${fallbackImg}'"
                   class="w-16 h-24 aspect-[2/3] object-cover rounded-xl shadow-xs border border-slate-200">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    ${loan.bookCategory}
                  </span>
                  ${ageTag}
                </div>
                <h4 class="font-bold text-slate-800 text-base leading-snug truncate">${loan.bookTitle}</h4>
                <p class="text-xs text-slate-500"><i class="fa-solid fa-feather-pointed mr-1 text-slate-400"></i>${loan.bookAuthor}</p>
                
                ${loan.receiverName ? `
                  <div class="text-[11px] text-slate-500 pt-1">
                    <i class="fa-solid fa-location-dot text-indigo-500 mr-1"></i>Người nhận: <strong>${loan.receiverName}</strong> (${loan.receiverPhone || ''}) &bull; ${loan.deliveryAddress || ''}
                  </div>
                ` : ''}

                <!-- Thẻ Cảnh Báo Trực Tiếp -->
                ${isOverdue ? `
                  <div class="p-2 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5 animate-pulse mt-1">
                    <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
                    <span>🔴 Đã quá hạn <strong>${overdueDays} ngày</strong>! Phí phạt tạm tính: <strong>${formatCurrency(fineAmount)}</strong></span>
                  </div>
                ` : (isDueSoon ? `
                  <div class="p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 mt-1">
                    <i class="fa-solid fa-clock text-amber-600"></i>
                    <span>🟡 Còn <strong>${loan.daysRemaining} ngày</strong> nữa đến hạn trả cuốn "${loan.bookTitle}"</span>
                  </div>
                ` : '')}

                <div class="text-xs text-slate-400 font-mono">Mã phiếu: #${loan.id}</div>
              </div>
            </div>

            <div class="flex flex-col md:items-end w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 space-y-2.5">
              <div class="text-xs">
                <span class="text-slate-400">Ngày mượn:</span> <strong class="text-slate-700">${formatDate(loan.borrowDate)}</strong>
              </div>
              <div class="text-xs">
                <span class="text-slate-400">Hạn hoàn trả:</span> 
                <strong class="${isOverdue ? 'text-rose-600 font-bold' : (isDueSoon ? 'text-amber-700 font-bold' : 'text-slate-800')}">${formatDate(loan.dueDate)}</strong>
              </div>

              ${isOverdue ? `
                <div class="badge badge-danger">
                  <i class="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>Quá hạn &bull; Phạt: ${formatCurrency(fineAmount)}
                </div>
              ` : `
                <div class="badge ${isDueSoon ? 'badge-warning' : 'badge-info'}">
                  <i class="fa-solid fa-clock mr-1 text-[10px]"></i>${isDueSoon ? 'Sắp đến hạn' : 'Đang trong hạn mượn'}
                </div>
              `}

              <div class="flex items-center gap-2 w-full md:w-auto pt-1">
                <!-- Nút Gia Hạn (+7 ngày) -->
                ${!isOverdue ? (
                  (loan.is_extended || loan.isExtended) ? `
                    <span class="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 w-full md:w-auto">
                      <i class="fa-solid fa-check text-indigo-500"></i> Đã gia hạn (+7 ngày)
                    </span>
                  ` : `
                    <button onclick="window.renewLoanHandler(${loan.id}, '${loan.bookTitle.replace(/'/g, "\\'")}', () => { loadMyLoans(); loadUserProfile(); })" 
                            class="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 w-full md:w-auto cursor-pointer"
                            title="Gia hạn mượn thêm 7 ngày (tối đa 1 lần)">
                      <i class="fa-solid fa-calendar-plus"></i> Gia hạn (+7 ngày)
                    </button>
                  `
                ) : ''}

                <!-- Nút Hoàn Trả Sách -->
                <button onclick="window.returnBookHandler(${loan.id}, '${loan.bookTitle.replace(/'/g, "\\'")}', ${fineAmount})" 
                        class="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 w-full md:w-auto">
                  <i class="fa-solid fa-arrow-rotate-left"></i> Hoàn Trả Sách
                </button>
              </div>
            </div>

          </div>
        `;
      }).join('');
    }

    // Render Lịch sử đã trả
    if (returnedLoans.length === 0) {
      emptyReturnedNotice.classList.remove('hidden');
      returnedLoansList.innerHTML = '';
    } else {
      emptyReturnedNotice.classList.add('hidden');
      returnedLoansList.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-left modern-table">
            <thead>
              <tr>
                <th>Mã Phiếu</th>
                <th>Tên Cuốn Sách</th>
                <th>Người Nhận & Nơi Nhận</th>
                <th>Ngày Mượn</th>
                <th>Hạn Trả</th>
                <th>Ngày Đã Trả</th>
                <th>Phí Phạt</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              ${returnedLoans.map(loan => `
                <tr>
                  <td class="font-mono text-xs font-bold text-indigo-600">#${loan.id}</td>
                  <td class="font-bold text-slate-800 text-sm">${loan.bookTitle}</td>
                  <td class="text-xs text-slate-600">
                    <div>${loan.receiverName || '--'} (${loan.receiverPhone || ''})</div>
                    <div class="text-[11px] text-slate-400 truncate max-w-xs">${loan.deliveryAddress || ''}</div>
                  </td>
                  <td class="text-xs text-slate-600">${formatDate(loan.borrowDate)}</td>
                  <td class="text-xs text-slate-600">${formatDate(loan.dueDate)}</td>
                  <td class="text-xs text-emerald-700 font-semibold">${formatDate(loan.returnDate)}</td>
                  <td class="text-xs font-semibold ${loan.fineAmount > 0 ? 'text-rose-600' : 'text-slate-400'}">
                    ${loan.fineAmount > 0 ? formatCurrency(loan.fineAmount) : '0 đ'}
                  </td>
                  <td>
                    <span class="badge badge-info"><i class="fa-solid fa-check mr-1 text-[9px]"></i>Đã hoàn trả</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  window.returnBookHandler = async (loanId, title, fineAmount) => {
    const confirmed = await Notify.confirmReturnBook({
      bookTitle: title,
      borrowerName: '',
      fineAmount: fineAmount || 0
    });
    if (!confirmed) return;

    const res = await apiFetch(`/api/loans/${loanId}/return`, { method: 'POST' });
    if (res.ok && res.data.success) {
      Notify.toast('Đã hoàn trả sách thành công!', 'success', `"${title}" đã được đưa trở lại thư viện.`);
      loadUserProfile();
      loadMyLoans();
    } else {
      Notify.error('Lỗi khi trả sách', res.data.message || 'Có lỗi xảy ra!');
    }
  };

  await loadUserProfile();
  await loadMyLoans();
});
