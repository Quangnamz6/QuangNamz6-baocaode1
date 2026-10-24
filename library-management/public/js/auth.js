/**
 * ========================================================
 * XỬ LÝ ĐĂNG NHẬP, ĐĂNG KÝ & CHỌN ĐỊA CHỈ HÀNH CHÍNH
 * File: public/js/auth.js
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // OTP Modal elements
  const otpModal = document.getElementById('otpModal');
  const otpTargetContact = document.getElementById('otpTargetContact');
  const otpCodeInput = document.getElementById('otpCodeInput');
  const btnVerifyOtpSubmit = document.getElementById('btnVerifyOtpSubmit');
  const btnResendOtp = document.getElementById('btnResendOtp');
  const btnCloseOtpModal = document.getElementById('btnCloseOtpModal');

  let pendingContact = '';

  // Khởi tạo bộ chọn địa chỉ hành chính Việt Nam cho Form đăng ký
  let regAddressSelector = null;
  if (typeof initVietnamAddressSelector === 'function') {
    regAddressSelector = initVietnamAddressSelector({
      provinceSelectId: 'regProvince',
      districtSelectId: 'regDistrict',
      wardSelectId: 'regWard',
      streetInputId: 'regStreet',
      fullAddressInputId: 'regAddress'
    });
  }

  // Chuyển tab Đăng Nhập / Đăng Ký
  function showLoginTab() {
    tabLoginBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition bg-white text-indigo-700 shadow-sm';
    tabRegisterBtn.className = 'flex-1 py-2 text-xs font-bold text-slate-500 rounded-xl hover:text-slate-800 transition';
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  }

  function showRegisterTab() {
    tabRegisterBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition bg-white text-indigo-700 shadow-sm';
    tabLoginBtn.className = 'flex-1 py-2 text-xs font-bold text-slate-500 rounded-xl hover:text-slate-800 transition';
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }

  if (tabLoginBtn) tabLoginBtn.addEventListener('click', showLoginTab);
  if (tabRegisterBtn) tabRegisterBtn.addEventListener('click', showRegisterTab);

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'register') {
    showRegisterTab();
  }

  // Modal OTP controls
  function openOtpModal(contact, mockOtp) {
    pendingContact = contact;
    otpTargetContact.textContent = contact;
    otpCodeInput.value = mockOtp || '';
    otpModal.classList.remove('hidden');
    otpModal.classList.add('flex');
    otpCodeInput.focus();

    // Thông báo hiển thị mã OTP để kiểm thử thuận tiện
    if (mockOtp) {
      Swal.fire({
        icon: 'info',
        title: 'Mã OTP Xác Thực',
        html: `
          <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
            <div class="text-xs text-indigo-600 font-semibold mb-1">Mã OTP (Hiệu lực 5 phút):</div>
            <div class="text-3xl font-black font-mono tracking-widest text-indigo-800">${mockOtp}</div>
          </div>
          <p class="text-xs text-slate-400 mt-2">Hệ thống đã tự động điền sẵn vào ô xác nhận để bạn kiểm thử nhanh chóng.</p>
        `,
        width: '410px',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Tiếp Tục Nhập Mã',
        customClass: {
          popup: 'rounded-2xl p-5 shadow-xl'
        }
      });
    }
  }

  function closeOtpModal() {
    otpModal.classList.add('hidden');
    otpModal.classList.remove('flex');
  }

  if (btnCloseOtpModal) btnCloseOtpModal.addEventListener('click', closeOtpModal);

  // Xử lý ĐĂNG NHẬP (Email hoặc SĐT)
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contact = document.getElementById('loginContact').value.trim();
      const password = document.getElementById('loginPassword').value;

      const btn = document.getElementById('btnLoginSubmit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ contact, password })
      });

      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Hệ Thống';

      if (res.ok && res.data.success) {
        Auth.setAuth(res.data.token, res.data.user);
        Notify.toast(res.data.message || 'Đăng nhập thành công!');

        setTimeout(() => {
          if (res.data.user.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'index.html';
          }
        }, 600);
      } else if (res.status === 403 && res.data.isUnverified) {
        Notify.toast('Tài khoản chưa kích hoạt OTP! Mở bảng nhập mã...', 'warning');
        openOtpModal(res.data.contact, res.data.mockOtp);
      } else {
        Notify.error('Đăng nhập thất bại', res.data.message || 'Email/SĐT hoặc mật khẩu không đúng!');
      }
    });
  }

  // Xử lý ĐĂNG KÝ BƯỚC 1: Thu thập thông tin và địa chỉ hành chính
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('regFullName').value.trim();
      const contact = document.getElementById('regContact').value.trim();
      const dateOfBirth = document.getElementById('regDateOfBirth').value;
      const password = document.getElementById('regPassword').value;

      // Lấy chuỗi địa chỉ ghép tự động: [Số nhà] - [Phường/Xã] - [Quận/Huyện] - [Tỉnh/Thành]
      let address = '';
      if (regAddressSelector) {
        address = regAddressSelector.getFullAddress();
      } else {
        const addressInput = document.getElementById('regAddress');
        address = addressInput ? addressInput.value.trim() : '';
      }

      if (!dateOfBirth) {
        Notify.error('Thiếu thông tin', 'Vui lòng chọn ngày tháng năm sinh để hệ thống kiểm tra độ tuổi!');
        return;
      }

      const btn = document.getElementById('btnRegisterSubmit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi mã OTP...';

      const res = await apiFetch('/api/auth/register-request', {
        method: 'POST',
        body: JSON.stringify({ fullName, contact, password, dateOfBirth, address })
      });

      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi Mã Xác Thực OTP';

      if (res.ok && res.data.success) {
        Notify.toast(res.data.message || 'Mã OTP đã được gửi về Gmail của bạn!', 'info');
        openOtpModal(res.data.contact, res.data.mockOtp);
      } else {
        Notify.error('Không thể đăng ký', res.data.message || 'Vui lòng kiểm tra lại thông tin!');
      }
    });
  }

  // Xử lý BƯỚC 2: Xác nhận OTP
  if (btnVerifyOtpSubmit) {
    btnVerifyOtpSubmit.addEventListener('click', async () => {
      const otp = otpCodeInput.value.trim();
      if (!otp || otp.length !== 6) {
        Notify.error('Mã không hợp lệ', 'Vui lòng nhập đúng mã OTP gồm 6 chữ số!');
        return;
      }

      btnVerifyOtpSubmit.disabled = true;
      btnVerifyOtpSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...';

      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ contact: pendingContact, otp })
      });

      btnVerifyOtpSubmit.disabled = false;
      btnVerifyOtpSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác Nhận Kích Hoạt';

      if (res.ok && res.data.success) {
        closeOtpModal();
        Auth.setAuth(res.data.token, res.data.user);
        Swal.fire({
          icon: 'success',
          iconColor: '#10b981',
          title: 'Kích Hoạt Tài Khoản Thành Công!',
          text: 'Tài khoản độc giả của bạn đã được xác thực mã OTP thành công.',
          width: '410px',
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Bắt Đầu Sử Dụng',
          customClass: {
            popup: 'rounded-2xl p-5 shadow-xl'
          }
        }).then(() => {
          window.location.href = 'index.html';
        });
      } else {
        Notify.error('Xác thực thất bại', res.data.message || 'Mã OTP không đúng hoặc đã hết hạn!');
      }
    });
  }

  // Gửi lại mã OTP
  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', async () => {
      if (!pendingContact) return;
      btnResendOtp.disabled = true;
      btnResendOtp.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi lại...';

      const res = await apiFetch('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ contact: pendingContact })
      });

      btnResendOtp.disabled = false;
      btnResendOtp.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Gửi lại mã OTP';

      if (res.ok && res.data.success) {
        otpCodeInput.value = res.data.mockOtp || '';
        Notify.toast('Đã gửi lại mã OTP mới!');
        if (res.data.mockOtp) {
          Swal.fire({
            icon: 'info',
            title: 'Mã OTP Mới Của Bạn',
            html: `<div class="text-3xl font-black font-mono tracking-widest text-indigo-700">${res.data.mockOtp}</div>`,
            width: '410px',
            confirmButtonColor: '#4f46e5',
            customClass: {
              popup: 'rounded-2xl p-5 shadow-xl'
            }
          });
        }
      } else {
        Notify.error('Lỗi', res.data.message || 'Không thể gửi lại OTP!');
      }
    });
  }
});
