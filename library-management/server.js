/**
 * ========================================================
 * HỆ THỐNG QUẢN LÝ THƯ VIỆN (LIBRARY MANAGEMENT SYSTEM)
 * Server Entry Point (server.js)
 * ========================================================
 */

// Nạp biến môi trường từ tệp .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Khởi tạo database & seed data
require('./config/db');

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const loansRoutes = require('./routes/loans');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware cấu hình
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ thư mục static frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Gắn các API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/ai', aiRoutes);
app.get('/api/quotes/today', (req, res) => res.redirect('/api/books/quote-of-the-day'));

// Prometheus Metrics Configuration (Giám sát hệ thống)
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// Prometheus metrics endpoint cho dịch vụ prometheus thu thập
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Điều hướng mặc định cho các file html nếu cần
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Xử lý lỗi 404 cho API
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint không tồn tại.' });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Server Thư Viện đang chạy tại: http://localhost:${PORT}`);
  console.log(`📚 Trang chủ độc giả:         http://localhost:${PORT}/index.html`);
  console.log(`🔐 Trang Đăng nhập / Đăng ký:  http://localhost:${PORT}/login.html`);
  console.log(`👤 Trang cá nhân Độc giả:     http://localhost:${PORT}/profile.html`);
  console.log(`🛠️ Trang Quản trị (Admin):     http://localhost:${PORT}/admin.html`);
  console.log(`=======================================================`);
});
