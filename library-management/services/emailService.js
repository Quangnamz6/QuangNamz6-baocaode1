/**
 * ========================================================
 * DỊCH VỤ GỬI EMAIL XÁC THỰC OTP QUA GMAIL (services/emailService.js)
 * Sử dụng thư viện Nodemailer với Google App Password
 * ========================================================
 */

const nodemailer = require('nodemailer');

// Khởi tạo Transporter cho Nodemailer với dịch vụ Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim().replace(/\s+/g, '') : ''
  }
});

/**
 * Gửi email chứa mã OTP kích hoạt tài khoản LibMaster
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} otpCode - Mã OTP 6 chữ số
 * @param {string} [recipientName] - Tên người nhận (Tùy chọn)
 */
async function sendOTPEmail(toEmail, otpCode, recipientName = 'Quý độc giả') {
  const mailOptions = {
    from: `"Thư Viện LibMaster" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '[LibMaster] Mã xác thực OTP đăng ký tài khoản',
    text: `Xin chào ${recipientName},\n\nMã xác thực OTP đăng ký tài khoản của bạn là: ${otpCode}\nMã có hiệu lực trong vòng 5 phút.\nVui lòng không chia sẻ mã này cho bất kỳ ai.\n\nTrân trọng,\nBan Quản trị LibMaster`,
    html: `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã Xác Thực OTP - LibMaster</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
              
              <!-- HEADER VỚI GRADIENT TÍM & XANH ĐẬM -->
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); padding: 36px 30px; text-align: center;">
                  <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background: rgba(255, 255, 255, 0.15); border-radius: 16px; margin-bottom: 12px; font-size: 28px;">
                    📚
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">LibMaster</h1>
                  <p style="margin: 6px 0 0; color: #fbbf24; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                    Cổng Tri Thức & Quản Lý Thư Viện
                  </p>
                </td>
              </tr>

              <!-- NỘI DUNG CHÍNH -->
              <tr>
                <td style="padding: 36px 32px 24px;">
                  <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 700;">
                    Xin chào ${recipientName},
                  </h2>
                  
                  <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                    Bạn vừa thực hiện đăng ký tài khoản tại <strong>Hệ thống Thư viện LibMaster</strong>. Để hoàn tất quy trình và kích hoạt tài khoản của bạn, vui lòng nhập mã xác thực OTP dưới đây:
                  </p>

                  <!-- KHUNG CHỮ MÀU TÍM/XANH HIỆN RÕ MÃ OTP 6 CHỮ SỐ -->
                  <div style="background: linear-gradient(180deg, #eef2ff 0%, #f5f3ff 100%); border: 2px dashed #6366f1; border-radius: 16px; padding: 26px 20px; text-align: center; margin: 24px 0;">
                    <div style="color: #4f46e5; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      MÃ XÁC THỰC OTP CỦA BẠN
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #3730a3; text-indent: 12px; padding: 6px 0;">
                      ${otpCode}
                    </div>
                    <div style="color: #dc2626; font-size: 13px; font-weight: 600; margin-top: 10px;">
                      ⏱️ Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>
                    </div>
                  </div>

                  <!-- LƯU Ý AN TOÀN -->
                  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400e; font-size: 12.5px; line-height: 1.5;">
                      🔒 <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã này cho bất kỳ ai. Ban quản trị thư viện LibMaster sẽ không bao giờ yêu cầu cung cấp mã OTP của bạn.
                    </p>
                  </div>

                  <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                    Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này một cách an toàn.
                  </p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0 0 6px; color: #64748b; font-size: 12px; font-weight: 600;">
                    Ban Quản Trị Hệ Thống Thư Viện LibMaster
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                    Email liên hệ: ${process.env.EMAIL_USER} &bull; Hệ thống Quản trị Thư viện Điện tử
                  </p>
                </td>
              </tr>

            </table>

            <div style="margin-top: 20px; text-align: center; color: #94a3b8; font-size: 11px;">
              &copy; ${new Date().getFullYear()} LibMaster Library Management System. All rights reserved.
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [GMAIL SUCCESS] Đã gửi mã OTP thực tế tới ${toEmail} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [GMAIL ERROR] Gặp lỗi khi gửi email tới ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi email thông báo sách trong hàng chờ đã có sẵn trong kho
 * @param {string} toEmail - Email độc giả
 * @param {string} bookTitle - Tên cuốn sách
 * @param {string} recipientName - Tên độc giả
 * @param {number} hoursValid - Số giờ giữ chỗ ưu tiên (Mặc định: 24h)
 */
async function sendWaitlistNotificationEmail(toEmail, bookTitle, recipientName = 'Quý độc giả', hoursValid = 24) {
  const mailOptions = {
    from: `"Thư Viện LibMaster" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `[LibMaster] Sách bạn đang chờ đã có sẵn: "${bookTitle}"`,
    text: `Xin chào ${recipientName},\n\nCuốn sách "${bookTitle}" mà bạn đăng ký xếp hàng đã được hoàn trả về kho thư viện LibMaster.\nVị trí của bạn được giữ chỗ ưu tiên trong vòng ${hoursValid} giờ tới.\nVui lòng đăng nhập vào hệ thống để tiến hành mượn ngay.\n\nTrân trọng,\nBan Quản trị LibMaster`,
    html: `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Thông Báo Sách Đã Có Sẵn - LibMaster</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
                  <div style="font-size: 32px; margin-bottom: 8px;">⏳ &rarr; 📖</div>
                  <h1 style="margin: 0; font-size: 24px; font-weight: 800;">LibMaster Thông Báo Hàng Chờ</h1>
                  <p style="margin: 6px 0 0; color: #fbbf24; font-size: 13px; font-weight: 600;">SÁCH BẠN ĐANG CHỜ ĐÃ SẴN SÀNG TRONG KHO</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 28px;">
                  <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 17px; font-weight: 700;">
                    Xin chào ${recipientName},
                  </h2>
                  <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                    Thư viện LibMaster vui mừng thông báo cuốn sách bạn đã đăng ký xếp hàng chờ:
                  </p>
                  <div style="background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 14px; padding: 18px 20px; text-align: center; margin: 18px 0;">
                    <div style="color: #15803d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Tác phẩm sẵn sàng cho mượn</div>
                    <div style="font-size: 18px; font-weight: 800; color: #166534; line-height: 1.4;">${bookTitle}</div>
                  </div>
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                      ⏰ <strong>Ưu tiên giữ chỗ 24 giờ:</strong> Hệ thống tự động ưu tiên giữ cuốn sách này cho bạn trong vòng <strong>${hoursValid} giờ</strong> tới. Sau thời gian này, sách sẽ được chuyển cho người tiếp theo trong hàng chờ.
                    </p>
                  </div>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="http://localhost:3000" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                      Truy Cập LibMaster Mượn Ngay &rarr;
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
                  &copy; ${new Date().getFullYear()} LibMaster Library Management System &bull; Hệ thống hàng chờ thông minh
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [WAITLIST EMAIL SUCCESS] Đã gửi thông báo hàng chờ tới ${toEmail} | Book: ${bookTitle}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [WAITLIST EMAIL ERROR] Gặp lỗi khi gửi thông báo tới ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOTPEmail,
  sendOtpEmail: sendOTPEmail,
  sendWaitlistNotificationEmail
};
