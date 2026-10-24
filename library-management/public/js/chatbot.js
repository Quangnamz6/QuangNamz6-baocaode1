/**
 * ========================================================
 * TRỢ LÝ THỦ THƯ ẢO AI (VIRTUAL LIBRARIAN CHATBOT)
 * public/js/chatbot.js
 * ========================================================
 */

(function () {
  'use strict';

  // Chèn CSS cho Chatbot Widget
  const style = document.createElement('style');
  style.id = 'libmaster-chatbot-style';
  style.textContent = `
    .lib-chatbot-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.5), 0 8px 10px -6px rgba(124, 58, 237, 0.4);
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    .lib-chatbot-btn:hover {
      transform: scale(1.1) translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(124, 58, 237, 0.7);
    }
    .lib-chatbot-btn .badge-ping {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      background-color: #10b981;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }
    .lib-chatbot-widget {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 540px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: bottom right;
    }
    .lib-chatbot-widget.hidden-chat {
      opacity: 0;
      transform: scale(0.85) translateY(20px);
      pointer-events: none;
      visibility: hidden;
    }
    .lib-chatbot-header {
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      color: #ffffff;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .lib-chatbot-body {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }
    .chat-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.5;
      word-break: break-word;
      animation: fadeInBubble 0.25s ease-out;
    }
    @keyframes fadeInBubble {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .chat-bubble.bot {
      background: #ffffff;
      color: #1e293b;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .chat-bubble.user {
      background: #7c3aed;
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .chat-suggest-pill {
      display: inline-block;
      background: #f3e8ff;
      color: #6b21a8;
      border: 1px solid #d8b4fe;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 11.5px;
      cursor: pointer;
      margin: 2px 3px 2px 0;
      transition: all 0.2s;
    }
    .chat-suggest-pill:hover {
      background: #7c3aed;
      color: #ffffff;
      border-color: #7c3aed;
      transform: translateY(-1px);
    }
    .bot-book-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      margin-top: 8px;
      display: flex;
      gap: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.04);
      transition: transform 0.2s;
    }
    .bot-book-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(124, 58, 237, 0.12);
      border-color: #c4b5fd;
    }
    .bot-book-card img {
      width: 50px;
      height: 70px;
      object-fit: cover;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }
    .bot-book-card .card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .bot-book-card .card-title {
      font-weight: 600;
      font-size: 12.5px;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bot-book-card .card-author {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .bot-book-card .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
    }
    .bot-book-btn {
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .bot-book-btn:hover {
      background: #6d28d9;
    }
    .lib-chatbot-input-area {
      padding: 10px 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lib-chatbot-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .lib-chatbot-input:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
    }
    .lib-chatbot-send-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .lib-chatbot-send-btn:hover {
      background: #6d28d9;
      transform: scale(1.05);
    }
    .typing-dots span {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #a855f7;
      border-radius: 50%;
      margin: 0 2px;
      animation: typing 1.2s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 100% { transform: translateY(0); opacity: 0.4; }
      50% { transform: translateY(-4px); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Tạo phần tử Chatbot HTML
  const container = document.createElement('div');
  container.id = 'libmaster-chatbot-container';
  container.innerHTML = `
    <!-- Nút tròn Icon Chatbot màu tím cố định góc dưới bên phải -->
    <button id="chatbot-toggle-btn" class="lib-chatbot-btn fixed bottom-6 right-6 z-50" title="Thủ thư ảo LibMaster">
      <span class="badge-ping"></span>
      <i class="fas fa-robot text-2xl"></i>
    </button>

    <!-- Khung Chatbot Widget (width: 360px) -->
    <div id="chatbot-widget" class="lib-chatbot-widget hidden-chat">
      <!-- Header -->
      <div class="lib-chatbot-header">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
          <div>
            <div class="font-bold text-sm tracking-wide">Thủ thư ảo LibMaster 🤖</div>
            <div class="text-[11px] text-purple-200 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span> Sẵn sàng hỗ trợ 24/7
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button id="chatbot-clear-btn" class="p-1 text-purple-200 hover:text-white rounded transition" title="Xóa hội thoại">
            <i class="fas fa-rotate-right text-xs"></i>
          </button>
          <button id="chatbot-close-btn" class="p-1 text-purple-200 hover:text-white rounded transition" title="Thu nhỏ">
            <i class="fas fa-chevron-down text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Body / Messages -->
      <div id="chatbot-body" class="lib-chatbot-body">
        <!-- Chào mừng ban đầu -->
        <div class="chat-bubble bot">
          👋 Chào bạn! Tôi là <strong>Thủ thư ảo LibMaster</strong>. Tôi có thể giúp bạn tìm sách theo tâm trạng, tác giả hoặc thể loại yêu thích!
          <div class="mt-2 pt-2 border-t border-slate-100">
            <span class="text-xs text-slate-500 font-medium block mb-1">Gợi ý câu hỏi nhanh:</span>
            <div class="flex flex-wrap gap-1">
              <span class="chat-suggest-pill" data-prompt="Tôi đang buồn, gợi ý sách nhẹ nhàng">Tôi đang buồn 🍃</span>
              <span class="chat-suggest-pill" data-prompt="Sách Nguyễn Nhật Ánh cho trẻ em">Sách Nguyễn Nhật Ánh 📚</span>
              <span class="chat-suggest-pill" data-prompt="Gợi ý sách kinh tế khởi nghiệp">Sách kinh tế 💼</span>
              <span class="chat-suggest-pill" data-prompt="Sách kỹ năng sống và tâm lý">Tâm lý & Kỹ năng 💡</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <form id="chatbot-form" class="lib-chatbot-input-area" onsubmit="return false;">
        <input 
          id="chatbot-input" 
          type="text" 
          class="lib-chatbot-input" 
          placeholder="Nhập tâm trạng, thể loại hoặc tác giả..." 
          autocomplete="off"
        />
        <button id="chatbot-send-btn" type="submit" class="lib-chatbot-send-btn" title="Gửi tin nhắn">
          <i class="fas fa-paper-plane text-xs"></i>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(container);

  // References
  const toggleBtn = document.getElementById('chatbot-toggle-btn');
  const widget = document.getElementById('chatbot-widget');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const clearBtn = document.getElementById('chatbot-clear-btn');
  const chatBody = document.getElementById('chatbot-body');
  const chatForm = document.getElementById('chatbot-form');
  const chatInput = document.getElementById('chatbot-input');

  let isOpen = false;

  function toggleChat(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (isOpen) {
      widget.classList.remove('hidden-chat');
      chatInput.focus();
    } else {
      widget.classList.add('hidden-chat');
    }
  }

  toggleBtn.addEventListener('click', () => toggleChat());
  closeBtn.addEventListener('click', () => toggleChat(false));

  clearBtn.addEventListener('click', () => {
    chatBody.innerHTML = `
      <div class="chat-bubble bot">
        👋 Chào bạn! Tôi là <strong>Thủ thư ảo LibMaster</strong>. Tôi có thể giúp bạn tìm sách theo tâm trạng, tác giả hoặc thể loại yêu thích!
        <div class="mt-2 pt-2 border-t border-slate-100">
          <span class="text-xs text-slate-500 font-medium block mb-1">Gợi ý câu hỏi nhanh:</span>
          <div class="flex flex-wrap gap-1">
            <span class="chat-suggest-pill" data-prompt="Tôi đang buồn, gợi ý sách nhẹ nhàng">Tôi đang buồn 🍃</span>
            <span class="chat-suggest-pill" data-prompt="Sách Nguyễn Nhật Ánh cho trẻ em">Sách Nguyễn Nhật Ánh 📚</span>
            <span class="chat-suggest-pill" data-prompt="Gợi ý sách kinh tế khởi nghiệp">Sách kinh tế 💼</span>
            <span class="chat-suggest-pill" data-prompt="Sách kỹ năng sống và tâm lý">Tâm lý & Kỹ năng 💡</span>
          </div>
        </div>
      </div>
    `;
    bindPills();
  });

  function bindPills() {
    chatBody.querySelectorAll('.chat-suggest-pill').forEach(pill => {
      pill.onclick = function () {
        const text = this.getAttribute('data-prompt');
        if (text) {
          chatInput.value = text;
          handleSend();
        }
      };
    });
  }
  bindPills();

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function appendUserMessage(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    scrollToBottom();
  }

  function appendTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'bot-typing-indicator';
    indicator.className = 'chat-bubble bot typing-dots';
    indicator.innerHTML = `<span></span><span></span><span></span> <small class="text-xs text-slate-400 ml-1">Đang suy nghĩ...</small>`;
    chatBody.appendChild(indicator);
    scrollToBottom();
    return indicator;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('bot-typing-indicator');
    if (el) el.remove();
  }

  function appendBotResponse(replyText, books) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';

    let html = `<div class="leading-relaxed">${escapeHtml(replyText)}</div>`;

    if (books && books.length > 0) {
      html += `<div class="mt-2 space-y-2">`;
      books.forEach(b => {
        const cover = b.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200';
        const rating = b.avgRating ? `⭐ ${b.avgRating}` : '⭐ 5.0';
        const ageBadge = b.ageRestriction === '18+' 
          ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 rounded">18+</span>'
          : (b.ageRestriction === 'kids' 
              ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">Thiếu nhi</span>'
              : '<span class="text-[10px] text-slate-500">Mọi độ tuổi</span>');

        html += `
          <div class="bot-book-card">
            <img src="${cover}" alt="${escapeHtml(b.title)}" onerror="this.src='https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200'">
            <div class="card-info">
              <div>
                <div class="card-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</div>
                <div class="card-author"><i class="fas fa-feather-alt text-[10px] mr-1"></i>${escapeHtml(b.author)}</div>
                <div class="text-[11px] text-amber-500 font-medium mt-0.5">${rating} · ${ageBadge}</div>
              </div>
              <div class="card-meta">
                <span class="text-[10px] text-slate-500 font-medium">${b.availableQuantity > 0 ? `<span class="text-emerald-600">Còn ${b.availableQuantity} cuốn</span>` : '<span class="text-rose-500 font-semibold">Tạm hết kho</span>'}</span>
                <button type="button" class="bot-book-btn" onclick="window.triggerChatbotBorrow(${b.id}, '${escapeHtml(b.title).replace(/'/g, "\\'")}', ${b.availableQuantity})">
                  ${b.availableQuantity > 0 ? 'Mượn Ngay' : 'Xếp Hàng'}
                </button>
              </div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    bubble.innerHTML = html;
    chatBody.appendChild(bubble);
    scrollToBottom();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Xử lý gửi tin nhắn AI
  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendUserMessage(text);
    chatInput.value = '';
    appendTypingIndicator();

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      removeTypingIndicator();

      if (data.success) {
        appendBotResponse(data.reply, data.books);
      } else {
        appendBotResponse(data.message || 'Xin lỗi, tôi gặp trục trặc khi tra cứu dữ liệu sách.', []);
      }
    } catch (err) {
      removeTypingIndicator();
      console.error('Chatbot error:', err);
      appendBotResponse('Không thể kết nối đến máy chủ trợ lý ảo. Vui lòng thử lại sau giây lát!', []);
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSend();
  });

  // Toàn cục: Kích hoạt mượn ngay từ Chatbot
  window.triggerChatbotBorrow = function (bookId, bookTitle, availableQuantity) {
    if (typeof window.openBorrowModal === 'function') {
      // Đã có hàm openBorrowModal trên trang hiện tại
      window.openBorrowModal(bookId);
    } else if (typeof window.handleBorrowClick === 'function') {
      window.handleBorrowClick(bookId);
    } else {
      // Chuyển hướng tới trang chi tiết sách hoặc trang chủ
      if (window.location.pathname.includes('book-detail.html')) {
        if (typeof window.openBorrowModalFromDetail === 'function') {
          window.openBorrowModalFromDetail(bookId);
        } else {
          window.location.href = `book-detail.html?id=${bookId}&openBorrow=1`;
        }
      } else {
        window.location.href = `index.html?borrowId=${bookId}`;
      }
    }
  };

  // Xuất API nếu trang khác cần gọi
  window.LibMasterChatbot = {
    open: () => toggleChat(true),
    close: () => toggleChat(false),
    toggle: () => toggleChat()
  };
})();
