/**
 * ========================================================
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN - JAVASCRIPT DÙNG CHUNG (main.js)
 * Quản lý Phiên Đăng Nhập, Fetch API & Thông Báo SweetAlert2
 * ========================================================
 */

const TOKEN_KEY = 'LIBMASTER_AUTH_TOKEN';
const USER_KEY = 'LIBMASTER_AUTH_USER';

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  isMember() {
    const user = this.getUser();
    return user && user.role === 'member';
  },

  logout() {
    this.clearAuth();
    Notify.toast('Đã đăng xuất khỏi hệ thống!', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
  }
};

async function apiFetch(url, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (response.status === 401) {
      Auth.clearAuth();
      if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('admin.html')) {
        window.location.href = 'login.html';
      }
    }

    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`Lỗi kết nối API [${url}]:`, error);
    return {
      ok: false,
      status: 500,
      data: { success: false, message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại server!' }
    };
  }
}

const Notify = {
  // Toast nhỏ gọn ở góc màn hình (mặc định 2 giây tự đóng)
  toast(title, icon = 'success', subtitle = '', timer = 2000) {
    if (typeof Swal !== 'undefined') {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        width: '380px',
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });
      return Toast.fire({
        icon,
        title: title,
        html: subtitle ? `<p class="text-xs text-slate-500 mt-0.5">${subtitle}</p>` : undefined
      });
    } else {
      alert(title + (subtitle ? ` - ${subtitle}` : ''));
    }
  },

  // Modal thông báo thành công nhỏ gọn (width 410px)
  success(title, text = '', options = {}) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'success',
        iconColor: '#10b981',
        title: title,
        html: text ? `<p class="text-sm text-slate-600">${text}</p>` : undefined,
        width: '410px',
        confirmButtonText: options.confirmText || 'Đóng',
        timer: options.timer || (options.autoClose ? 2000 : undefined),
        timerProgressBar: !!(options.timer || options.autoClose),
        customClass: {
          popup: 'rounded-2xl p-5 shadow-xl',
          confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl font-medium shadow-sm transition-all'
        },
        buttonsStyling: false
      });
    }
    alert(title + '\n' + text);
  },

  // Modal thông báo lỗi nhỏ gọn (width 410px)
  error(title, text = '') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        icon: 'error',
        iconColor: '#ef4444',
        title: title,
        html: `<p class="text-sm text-slate-600">${text}</p>`,
        width: '410px',
        confirmButtonText: 'Đóng',
        customClass: {
          popup: 'rounded-2xl p-5 shadow-xl',
          confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white text-sm px-4 py-2 rounded-xl font-medium shadow-sm transition-all'
        },
        buttonsStyling: false
      });
    }
    alert(title + '\n' + text);
  },

  // Modal xác nhận chung nhỏ gọn (width 410px)
  async confirm(title, textOrHtml, confirmText = 'Đồng ý', isHtml = false) {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title: title,
        [isHtml ? 'html' : 'text']: textOrHtml,
        icon: 'warning',
        iconColor: '#f59e0b',
        width: '410px',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'Hủy bỏ',
        customClass: {
          popup: 'rounded-2xl p-5 shadow-xl',
          confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl font-medium shadow-sm ml-2 transition-all',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm px-4 py-2 rounded-xl font-medium transition-all'
        },
        buttonsStyling: false
      });
      return result.isConfirmed;
    }
    return confirm(title + '\n' + textOrHtml);
  },

  // Modal "Xác nhận trả sách" tinh tế, dạng thẻ thông tin cấu trúc rõ ràng
  async confirmReturnBook({ bookTitle, borrowerName = '', fineAmount = 0 }) {
    if (typeof Swal !== 'undefined') {
      const hasFine = fineAmount > 0;
      const htmlContent = `
        <p class="text-sm text-slate-500 mb-3 text-center">Bạn có chắc chắn muốn thực hiện hoàn trả tác phẩm này?</p>
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-sm space-y-1.5 shadow-2xs">
          <div class="text-slate-700 flex items-start gap-1.5">
            <span class="text-slate-400 font-medium min-w-[65px]">Sách:</span>
            <span class="text-indigo-600 font-bold">${bookTitle}</span>
          </div>
          ${borrowerName ? `
            <div class="text-slate-700 flex items-start gap-1.5">
              <span class="text-slate-400 font-medium min-w-[65px]">Độc giả:</span>
              <span class="font-semibold text-slate-800">${borrowerName}</span>
            </div>
          ` : ''}
          ${hasFine ? `
            <div class="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium flex items-center gap-1.5 mt-1">
              <i class="fa-solid fa-triangle-exclamation text-rose-500"></i>
              <span>Quá hạn! Phí phạt phát sinh: <strong>${formatCurrency(fineAmount)}</strong> (5.000 đ/ngày)</span>
            </div>
          ` : ''}
          <div class="text-[11px] text-slate-400 pt-1.5 border-t border-slate-200/70 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
            <span>Sách sẽ được hoàn trả về kho (Số lượng khả dụng +1)</span>
          </div>
        </div>
      `;

      const result = await Swal.fire({
        title: 'Xác nhận trả sách',
        html: htmlContent,
        icon: hasFine ? 'warning' : 'question',
        iconColor: hasFine ? '#f59e0b' : '#6366f1',
        width: '410px',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận trả',
        cancelButtonText: 'Hủy bỏ',
        customClass: {
          popup: 'rounded-2xl p-5 shadow-2xl',
          confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl font-medium shadow-sm ml-2 transition-all',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm px-4 py-2 rounded-xl font-medium transition-all'
        },
        buttonsStyling: false
      });
      return result.isConfirmed;
    }
    return confirm(`Xác nhận trả sách: ${bookTitle}?`);
  }
};

function formatCurrency(amount) {
  if (!amount) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Cập nhật Navbar hiển thị thông tin độc giả, chuông thông báo & tuổi
async function renderNavbarAuth() {
  const navContainer = document.getElementById('authNavArea');
  if (!navContainer) return;

  const user = Auth.getUser();

  if (user) {
    const isAdmin = user.role === 'admin';
    const ageText = user.age ? `${user.age} tuổi` : '';

    navContainer.innerHTML = `
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Chuông thông báo nhắc nhở hạn sách (Được nạp dữ liệu động) -->
        <div id="navNotificationArea"></div>

        ${isAdmin ? `
          <a href="admin.html" class="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200 flex items-center gap-1.5">
            <i class="fa-solid fa-gauge-high"></i> Bảng Quản Trị
          </a>
        ` : `
          <a href="profile.html" class="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200 flex items-center gap-1.5">
            <i class="fa-solid fa-book-bookmark"></i> Sách Đang Mượn
          </a>
        `}

        <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${isAdmin ? 'from-purple-600 to-indigo-600' : 'from-indigo-600 to-blue-500'} flex items-center justify-center text-white text-xs font-bold shadow-xs">
            ${user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div class="hidden sm:block text-left">
            <div class="text-xs font-bold text-slate-800 leading-tight">${user.fullName}</div>
            <div class="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <span>${isAdmin ? 'Quản Trị Viên' : 'Độc Giả'}</span>
              ${ageText ? `&bull; <span class="text-indigo-600 font-bold">${ageText}</span>` : ''}
            </div>
          </div>
        </div>

        <button onclick="Auth.logout()" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition" title="Đăng xuất">
          <i class="fa-solid fa-arrow-right-from-bracket text-sm"></i>
        </button>
      </div>
    `;

    // Nạp trạng thái cảnh báo hạn trả sách cho chuông thông báo
    loadNavNotificationAlerts();
  } else {
    navContainer.innerHTML = `
      <div class="flex items-center gap-2">
        <a href="login.html" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          Đăng Nhập
        </a>
        <a href="login.html?tab=register" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition">
          Đăng Ký
        </a>
      </div>
    `;
  }
}

// Tải thông báo cảnh báo hạn sách cho Chuông trên Navbar
window._userAlertLoans = [];
async function loadNavNotificationAlerts() {
  const notifContainer = document.getElementById('navNotificationArea');
  if (!notifContainer || !Auth.isLoggedIn()) return;

  try {
    const res = await apiFetch('/api/loans/my-loans');
    if (res.ok && res.data.success) {
      const activeLoans = res.data.activeLoans || [];
      const alertLoans = activeLoans.filter(l => l.isOverdue || l.isDueSoon);
      window._userAlertLoans = alertLoans;

      if (alertLoans.length > 0) {
        const hasOverdue = alertLoans.some(l => l.isOverdue);
        notifContainer.innerHTML = `
          <button onclick="window.showLoanNotificationsModal()" 
                  class="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer" 
                  title="Có ${alertLoans.length} thông báo hạn mượn sách">
            <i class="fa-solid fa-bell text-base ${hasOverdue ? 'text-rose-500 animate-bounce' : 'text-amber-500'}"></i>
            <span class="absolute top-1 right-1 w-2.5 h-2.5 ${hasOverdue ? 'bg-rose-500' : 'bg-amber-400'} rounded-full animate-ping"></span>
            <span class="absolute top-1 right-1 w-2.5 h-2.5 ${hasOverdue ? 'bg-rose-600' : 'bg-amber-500'} rounded-full"></span>
          </button>
        `;
      } else {
        notifContainer.innerHTML = `
          <button onclick="window.showLoanNotificationsModal()" 
                  class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" 
                  title="Không có sách nào đến hạn">
            <i class="fa-regular fa-bell text-base"></i>
          </button>
        `;
      }
    }
  } catch (e) {
    console.warn('Lỗi load thông báo:', e);
  }
}

// Modal danh sách thông báo hạn trả sách & gia hạn trực tiếp (400px)
window.showLoanNotificationsModal = function() {
  const alertLoans = window._userAlertLoans || [];

  if (alertLoans.length === 0) {
    Swal.fire({
      title: 'Thông Báo Hạn Sách',
      html: `
        <div class="py-4 text-center space-y-2">
          <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto text-xl border border-emerald-100">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <p class="text-sm font-bold text-slate-700">Tất cả sách mượn đều trong hạn!</p>
          <p class="text-xs text-slate-400">Bạn không có cuốn sách nào sắp đến hạn hay bị quá hạn.</p>
        </div>
      `,
      width: '400px',
      confirmButtonText: 'Đóng',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: 'rounded-2xl p-5 shadow-2xl' }
    });
    return;
  }

  const itemsHtml = alertLoans.map(l => {
    if (l.isOverdue) {
      return `
        <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-left space-y-1.5 shadow-2xs">
          <div class="flex items-start justify-between gap-2">
            <span class="font-bold text-xs text-slate-800 line-clamp-1">${l.bookTitle}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse shrink-0">QUÁ HẠN</span>
          </div>
          <p class="text-xs text-rose-700 font-semibold flex items-center gap-1.5">
            <span>🔴 Đã quá hạn <strong>${l.overdueDays} ngày</strong>!</span>
            <span>Phí phạt: <strong>${formatCurrency(l.fineAmount)}</strong></span>
          </p>
          <div class="text-[11px] text-slate-500">Hạn hoàn trả: ${formatDate(l.dueDate)}</div>
        </div>
      `;
    } else {
      return `
        <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1.5 shadow-2xs">
          <div class="flex items-start justify-between gap-2">
            <span class="font-bold text-xs text-slate-800 line-clamp-1">${l.bookTitle}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shrink-0">SẮP HẠN</span>
          </div>
          <p class="text-xs text-amber-800 font-semibold">
            🟡 Còn <strong>${l.daysRemaining} ngày</strong> nữa đến hạn trả cuốn sách này
          </p>
          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px] text-slate-500">Hạn: ${formatDate(l.dueDate)}</span>
            ${l.canRenew ? `
              <button onclick="Swal.close(); window.renewLoanHandler(${l.id}, '${l.bookTitle.replace(/'/g, "\\'")}')" 
                      class="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition">
                Gia hạn (+7 ngày)
              </button>
            ` : `
              <span class="text-[10px] font-medium text-slate-400">Đã gia hạn tối đa</span>
            `}
          </div>
        </div>
      `;
    }
  }).join('');

  Swal.fire({
    title: 'Nhắc Nhở & Cảnh Báo Hạn Sách',
    html: `
      <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        ${itemsHtml}
      </div>
    `,
    width: '400px',
    showCancelButton: true,
    confirmButtonText: 'Xem Tất Cả Sách',
    cancelButtonText: 'Đóng',
    confirmButtonColor: '#4f46e5',
    customClass: { popup: 'rounded-2xl p-5 shadow-2xl' }
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = 'profile.html';
    }
  });
};

// Hàm dùng chung: Gia hạn mượn sách 1-Click (+7 ngày) với SweetAlert2 (400px)
window.renewLoanHandler = async function(loanId, bookTitle, onSuccess) {
  if (typeof Swal !== 'undefined') {
    const confirmResult = await Swal.fire({
      title: 'Xác Nhận Gia Hạn',
      html: `
        <div class="text-center space-y-2 text-sm text-slate-600">
          <p>Bạn muốn gia hạn thêm <strong class="text-indigo-600 font-bold">+7 ngày</strong> mượn cho cuốn sách:</p>
          <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl font-bold text-slate-800 text-xs">
            ${bookTitle}
          </div>
          <p class="text-[11px] text-slate-400">Lưu ý: Mỗi phiếu mượn chỉ được gia hạn tối đa <strong>1 lần duy nhất</strong>.</p>
        </div>
      `,
      icon: 'question',
      iconColor: '#6366f1',
      width: '400px',
      showCancelButton: true,
      confirmButtonText: 'Gia hạn ngay (+7 ngày)',
      cancelButtonText: 'Hủy bỏ',
      customClass: {
        popup: 'rounded-2xl p-5 shadow-2xl',
        confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold shadow-xs ml-2 transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-4 py-2.5 rounded-xl font-medium transition-all'
      },
      buttonsStyling: false
    });

    if (!confirmResult.isConfirmed) return;
  }

  const res = await apiFetch(`/api/loans/${loanId}/renew`, { method: 'POST' });
  if (res.ok && res.data.success) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        iconColor: '#10b981',
        title: 'Gia Hạn Thành Công!',
        html: `
          <div class="space-y-1.5 text-xs text-slate-600">
            <p>${res.data.message}</p>
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800">
              Hạn hoàn trả mới: <strong>${formatDate(res.data.newDueDate)}</strong>
            </div>
          </div>
        `,
        width: '400px',
        confirmButtonText: 'Tuyệt vời',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'rounded-2xl p-5 shadow-2xl' }
      });
    } else {
      alert(res.data.message);
    }

    loadNavNotificationAlerts();
    if (typeof onSuccess === 'function') onSuccess();
  } else {
    Notify.error('Không thể gia hạn', res.data.message || 'Lỗi khi gia hạn phiếu mượn.');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  renderNavbarAuth();
});

/**
 * ========================================================
 * BỘ CHỌN ĐỊA CHỈ HÀNH CHÍNH VIỆT NAM (TỈNH/HUYỆN/XÃ)
 * Sử dụng API mở miễn phí: https://provinces.open-api.vn/api/
 * ========================================================
 */
window.initVietnamAddressSelector = function({
  provinceSelectId,
  districtSelectId,
  wardSelectId,
  streetInputId,
  fullAddressInputId,
  onChange
}) {
  const provinceSelect = typeof provinceSelectId === 'string' ? document.getElementById(provinceSelectId) : provinceSelectId;
  const districtSelect = typeof districtSelectId === 'string' ? document.getElementById(districtSelectId) : districtSelectId;
  const wardSelect = typeof wardSelectId === 'string' ? document.getElementById(wardSelectId) : wardSelectId;
  const streetInput = typeof streetInputId === 'string' ? document.getElementById(streetInputId) : streetInputId;
  const fullAddressInput = typeof fullAddressInputId === 'string' ? document.getElementById(fullAddressInputId) : fullAddressInputId;

  if (!provinceSelect || !districtSelect || !wardSelect) return null;

  // Cache dữ liệu để chuyển đổi nhanh và không tốn request
  if (!window._vnProvincesCache) {
    window._vnProvincesCache = {
      provinces: null,
      districts: {},
      wards: {}
    };
  }
  const cache = window._vnProvincesCache;

  function updateFullAddress() {
    const provinceText = (provinceSelect.value && provinceSelect.selectedOptions[0]) ? provinceSelect.selectedOptions[0].text : '';
    const districtText = (districtSelect.value && districtSelect.selectedOptions[0]) ? districtSelect.selectedOptions[0].text : '';
    const wardText = (wardSelect.value && wardSelect.selectedOptions[0]) ? wardSelect.selectedOptions[0].text : '';
    const streetText = streetInput ? streetInput.value.trim() : '';

    const parts = [];
    if (streetText) parts.push(streetText);
    if (wardText) parts.push(wardText);
    if (districtText) parts.push(districtText);
    if (provinceText) parts.push(provinceText);

    // Ghép định dạng: [Số nhà] - [Phường/Xã] - [Quận/Huyện] - [Tỉnh/Thành phố]
    const full = parts.join(' - ');

    if (fullAddressInput) {
      fullAddressInput.value = full;
    }

    if (typeof onChange === 'function') {
      onChange(full, { street: streetText, ward: wardText, district: districtText, province: provinceText });
    }

    return full;
  }

  // Bước 1: Nạp danh sách Tỉnh/Thành phố từ API
  async function loadProvinces() {
    provinceSelect.innerHTML = '<option value="">-- Đang tải Tỉnh / Thành... --</option>';
    try {
      if (!cache.provinces) {
        const res = await fetch('https://provinces.open-api.vn/api/p/');
        cache.provinces = await res.json();
      }

      provinceSelect.innerHTML = '<option value="">-- Chọn Tỉnh / Thành phố --</option>' +
        cache.provinces.map(p => `<option value="${p.code}">${p.name}</option>`).join('');
    } catch (err) {
      console.warn('Không thể nạp Tỉnh/Thành từ API:', err);
      provinceSelect.innerHTML = '<option value="">-- Chọn Tỉnh / Thành phố --</option>';
    }
  }

  // Bước 2: Nạp Quận/Huyện theo Tỉnh đã chọn
  async function loadDistricts(provinceCode) {
    districtSelect.innerHTML = '<option value="">-- Đang nạp Quận / Huyện... --</option>';
    districtSelect.disabled = true;
    wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
    wardSelect.disabled = true;

    if (!provinceCode) {
      districtSelect.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>';
      updateFullAddress();
      return;
    }

    try {
      if (!cache.districts[provinceCode]) {
        const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await res.json();
        cache.districts[provinceCode] = data.districts || [];
      }

      const districts = cache.districts[provinceCode];
      districtSelect.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>' +
        districts.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
      districtSelect.disabled = false;
    } catch (err) {
      console.warn('Lỗi nạp Quận/Huyện:', err);
      districtSelect.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>';
    }
    updateFullAddress();
  }

  // Bước 3: Nạp Phường/Xã theo Quận/Huyện đã chọn
  async function loadWards(districtCode) {
    wardSelect.innerHTML = '<option value="">-- Đang nạp Phường / Xã... --</option>';
    wardSelect.disabled = true;

    if (!districtCode) {
      wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
      updateFullAddress();
      return;
    }

    try {
      if (!cache.wards[districtCode]) {
        const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const data = await res.json();
        cache.wards[districtCode] = data.wards || [];
      }

      const wards = cache.wards[districtCode];
      wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>' +
        wards.map(w => `<option value="${w.code}">${w.name}</option>`).join('');
      wardSelect.disabled = false;
    } catch (err) {
      console.warn('Lỗi nạp Phường/Xã:', err);
      wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
    }
    updateFullAddress();
  }

  // Sự kiện
  provinceSelect.addEventListener('change', () => {
    loadDistricts(provinceSelect.value);
  });

  districtSelect.addEventListener('change', () => {
    loadWards(districtSelect.value);
  });

  wardSelect.addEventListener('change', () => {
    updateFullAddress();
  });

  if (streetInput) {
    streetInput.addEventListener('input', () => {
      updateFullAddress();
    });
  }

  // Khởi chạy nạp danh sách tỉnh ban đầu
  loadProvinces();

  return {
    getFullAddress: updateFullAddress,
    setValues: async ({ street = '', provinceName = '', districtName = '', wardName = '' } = {}) => {
      if (streetInput && street) streetInput.value = street;
      if (!cache.provinces) await loadProvinces();

      if (provinceName && cache.provinces) {
        const p = cache.provinces.find(item => item.name.toLowerCase().includes(provinceName.toLowerCase()));
        if (p) {
          provinceSelect.value = p.code;
          await loadDistricts(p.code);

          if (districtName && cache.districts[p.code]) {
            const d = cache.districts[p.code].find(item => item.name.toLowerCase().includes(districtName.toLowerCase()));
            if (d) {
              districtSelect.value = d.code;
              await loadWards(d.code);

              if (wardName && cache.wards[d.code]) {
                const w = cache.wards[d.code].find(item => item.name.toLowerCase().includes(wardName.toLowerCase()));
                if (w) wardSelect.value = w.code;
              }
            }
          }
        }
      }
      updateFullAddress();
    },
    reset: () => {
      provinceSelect.value = '';
      districtSelect.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>';
      districtSelect.disabled = true;
      wardSelect.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
      wardSelect.disabled = true;
      if (streetInput) streetInput.value = '';
      if (fullAddressInput) fullAddressInput.value = '';
    }
  };
};

/**
 * ========================================================
 * LOGIC KIỂM SOÁT ĐỘ TUỔI ĐỘC GIẢ (AGE RESTRICTION 18+)
 * ========================================================
 */
window.getCurrentUserAge = function() {
  const user = Auth.getUser();
  if (!user) return null;
  if (user.age !== undefined && user.age !== null) return parseInt(user.age, 10);
  if (user.dateOfBirth) {
    const dob = new Date(user.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
  return null;
};

window.showAgeRestrictionWarning = function(bookTitle, userAge) {
  const displayAge = (userAge !== null && userAge !== undefined) ? userAge : (window.getCurrentUserAge() || '--');
  if (typeof Swal !== 'undefined') {
    return Swal.fire({
      icon: 'warning',
      iconColor: '#ef4444',
      title: '<span class="text-lg font-bold text-red-600">Không đủ điều kiện mượn sách</span>',
      html: `
        <p class="text-sm text-slate-600 mb-2.5">Tác phẩm <strong class="text-slate-800">&ldquo;${bookTitle}&rdquo;</strong> dành riêng cho độc giả từ <strong class="text-red-600">18 tuổi trở lên</strong>.</p>
        <div class="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-700 my-2 text-left space-y-1.5 shadow-2xs">
          <div class="flex items-center gap-1.5 font-semibold">
            <i class="fa-solid fa-triangle-exclamation text-red-500"></i>
            <span>Độ tuổi hiện tại của bạn: <strong>${displayAge} tuổi</strong></span>
          </div>
          <p class="text-red-600 text-[11px] leading-relaxed">Theo quy định kiểm soát độ tuổi của thư viện, bạn chưa đủ tuổi để đăng ký mượn tác phẩm này.</p>
        </div>
      `,
      width: '400px',
      confirmButtonText: 'Đã hiểu',
      customClass: {
        popup: 'rounded-2xl p-5 shadow-2xl border border-red-100',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-medium shadow-sm transition-all'
      },
      buttonsStyling: false
    });
  } else {
    alert(`Không đủ điều kiện mượn sách: Tác phẩm "${bookTitle}" dành riêng cho độc giả từ 18 tuổi trở lên.`);
  }
};


