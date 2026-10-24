/**
 * ========================================================
 * CẤU HÌNH VÀ KHỞI TẠO CƠ SỞ DỮ LIỆU SQLITE (config/db.js)
 * Cập nhật: Khắc phục ALTER TABLE UNIQUE trong SQLite
 * ========================================================
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối Cơ sở dữ liệu SQLite:', err.message);
  } else {
    console.log('✅ Đã kết nối thành công Cơ sở dữ liệu SQLite tại:', dbPath);
  }
});

const dbAsync = {
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

async function ensureColumnExists(tableName, columnName, columnDefinition) {
  const columns = await dbAsync.all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some(c => c.name === columnName);
  if (!exists) {
    await dbAsync.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`🛠️ Đã thêm cột ${columnName} vào bảng ${tableName}`);
  }
}

async function initDatabase() {
  try {
    // 1. Bảng Users (ID, FullName, Contact, PasswordHash, DateOfBirth, Address, IsVerified, Role, CreatedAt)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        contact TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        dateOfBirth TEXT NOT NULL DEFAULT '2000-01-01',
        address TEXT DEFAULT '',
        isVerified INTEGER NOT NULL DEFAULT 0,
        role TEXT CHECK(role IN ('admin', 'member')) NOT NULL DEFAULT 'member',
        createdAt TEXT NOT NULL
      )
    `);

    // Thêm các cột nếu table cũ đã tồn tại
    await ensureColumnExists('users', 'contact', "TEXT");
    await ensureColumnExists('users', 'address', "TEXT DEFAULT ''");
    await ensureColumnExists('users', 'isVerified', "INTEGER NOT NULL DEFAULT 0");
    await ensureColumnExists('users', 'isLocked', "INTEGER NOT NULL DEFAULT 0");
    await ensureColumnExists('users', 'dateOfBirth', "TEXT NOT NULL DEFAULT '2000-01-01'");
    await ensureColumnExists('users', 'points', "INTEGER NOT NULL DEFAULT 100");
    await ensureColumnExists('users', 'max_borrow_limit', "INTEGER NOT NULL DEFAULT 3");
    await ensureColumnExists('users', 'maxBorrowLimit', "INTEGER NOT NULL DEFAULT 3");

    // Cập nhật contact từ email nếu có cột email cũ và xử lý migration nếu email có NOT NULL
    const userCols = await dbAsync.all(`PRAGMA table_info(users)`);
    const emailCol = userCols.find(c => c.name === 'email');
    if (emailCol && emailCol.notnull === 1) {
      await dbAsync.run(`
        CREATE TABLE IF NOT EXISTS users_temp_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fullName TEXT NOT NULL,
          contact TEXT NOT NULL UNIQUE,
          email TEXT,
          passwordHash TEXT NOT NULL,
          dateOfBirth TEXT NOT NULL DEFAULT '2000-01-01',
          address TEXT DEFAULT '',
          isVerified INTEGER NOT NULL DEFAULT 0,
          role TEXT CHECK(role IN ('admin', 'member')) NOT NULL DEFAULT 'member',
          createdAt TEXT NOT NULL
        )
      `);
      await dbAsync.run(`
        INSERT OR IGNORE INTO users_temp_migrated (id, fullName, contact, email, passwordHash, dateOfBirth, address, isVerified, role, createdAt)
        SELECT id, fullName, COALESCE(contact, email), email, passwordHash, COALESCE(dateOfBirth, '2000-01-01'), COALESCE(address, ''), COALESCE(isVerified, 0), role, createdAt FROM users
      `);
      await dbAsync.run(`DROP TABLE users`);
      await dbAsync.run(`ALTER TABLE users_temp_migrated RENAME TO users`);
      console.log('🔄 Đã chuyển đổi bảng users sang cấu trúc mới linh hoạt cho Email & SĐT.');
    } else if (emailCol) {
      await dbAsync.run(`UPDATE users SET contact = email WHERE (contact IS NULL OR contact = '') AND email IS NOT NULL`);
    }

    // Tạo Index UNIQUE cho contact
    await dbAsync.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_contact ON users(contact)`);

    // 2. Bảng OTP_Codes (Lưu mã xác thực 6 số chống tài khoản ảo)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact TEXT NOT NULL,
        code TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        isUsed INTEGER NOT NULL DEFAULT 0
      )
    `);

    // 3. Bảng Books (Có ageRestriction: all, kids, 18+)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        availableQuantity INTEGER NOT NULL DEFAULT 1,
        coverImage TEXT,
        description TEXT,
        ageRestriction TEXT CHECK(ageRestriction IN ('all', 'kids', '18+')) NOT NULL DEFAULT 'all'
      )
    `);
    await ensureColumnExists('books', 'ageRestriction', "TEXT DEFAULT 'all'");

    // 4. Bảng Loans (Thêm receiverName, receiverPhone, deliveryAddress)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        bookId INTEGER NOT NULL,
        receiverName TEXT,
        receiverPhone TEXT,
        deliveryAddress TEXT,
        borrowDate TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        returnDate TEXT,
        status TEXT CHECK(status IN ('borrowed', 'returned', 'overdue')) NOT NULL DEFAULT 'borrowed',
        fineAmount INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
    await ensureColumnExists('loans', 'receiverName', "TEXT");
    await ensureColumnExists('loans', 'receiverPhone', "TEXT");
    await ensureColumnExists('loans', 'deliveryAddress', "TEXT");
    await ensureColumnExists('loans', 'is_extended', "INTEGER NOT NULL DEFAULT 0");
    await ensureColumnExists('loans', 'isExtended', "INTEGER NOT NULL DEFAULT 0");

    // 5. Bảng Reviews (Đánh giá & Bình luận sách)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 6. Bảng Waitlist (Hàng chờ thông minh khi sách hết kho)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        status TEXT CHECK(status IN ('waiting', 'notified', 'fulfilled', 'cancelled')) NOT NULL DEFAULT 'waiting',
        createdAt TEXT NOT NULL,
        notifiedAt TEXT,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 7. Bảng Quotes (Kho Trích dẫn văn học hay trong ngày)
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        bookTitle TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE SET NULL
      )
    `);

    // Seed trích dẫn nếu bảng quotes chưa có
    const quoteCount = await dbAsync.get('SELECT COUNT(*) as count FROM quotes');
    if (quoteCount && quoteCount.count === 0) {
      const sampleQuotes = [
        {
          bookId: 1,
          content: 'Khi bạn thực sự khao khát một điều gì đó, cả vũ trụ sẽ hợp sức lại giúp bạn đạt được nó.',
          author: 'Paulo Coelho',
          bookTitle: 'Nhà Giả Kim (The Alchemist)'
        },
        {
          bookId: 39,
          content: 'Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau.',
          author: 'Đại thi hào Nguyễn Du',
          bookTitle: 'Truyện Kiều'
        },
        {
          bookId: 7,
          content: 'Người ta chỉ thấy rõ bằng trái tim. Những gì cốt yếu thì vô hình trong mắt trần.',
          author: 'Antoine de Saint-Exupéry',
          bookTitle: 'Hoàng Tử Bé (Le Petit Prince)'
        },
        {
          bookId: 2,
          content: 'Bất kỳ kẻ ngốc nào cũng có thể viết mã mà máy tính hiểu được. Lập trình viên giỏi viết mã mà con người có thể hiểu được.',
          author: 'Martin Fowler & Robert C. Martin',
          bookTitle: 'Clean Code: Cẩm Nang Viết Mã Sạch'
        },
        {
          bookId: 38,
          content: 'Tình yêu là thứ duy nhất trên đời không thể gượng ép, nhưng cũng là thứ duy nhất khiến người ta sẵn lòng hy sinh tất cả.',
          author: 'Nguyễn Nhật Ánh',
          bookTitle: 'Mắt Biếc'
        },
        {
          bookId: 3,
          content: 'Muốn lấy mật thì đừng phá tổ ong. Nụ cười là chiếc chìa khóa vạn năng mở khóa mọi cánh cửa trái tim.',
          author: 'Dale Carnegie',
          bookTitle: 'Đắc Nhân Tâm (How to Win Friends)'
        },
        {
          bookId: 30,
          content: 'Hạnh phúc không phải là không có đau khổ, mà là khả năng mỉm cười và đi xuyên qua những giông bão của cuộc đời.',
          author: 'Thích Minh Niệm',
          bookTitle: 'Hiểu Về Trái Tim'
        },
        {
          bookId: 31,
          content: 'Người nghèo và tầng lớp trung lưu làm việc vì tiền bạc. Người giàu buộc tiền bạc phải làm việc phục vụ cho mình.',
          author: 'Robert T. Kiyosaki',
          bookTitle: 'Cha Giàu Cha Nghèo (Rich Dad Poor Dad)'
        },
        {
          bookId: 4,
          content: 'Lịch sử là điều mà rất ít người đã làm trong khi tất cả những người còn lại đang cày xới ngoài đồng và gánh nước.',
          author: 'Yuval Noah Harari',
          bookTitle: 'Sapiens: Lược Sử Loài Người'
        }
      ];

      for (const q of sampleQuotes) {
        await dbAsync.run(`
          INSERT INTO quotes (bookId, content, author, bookTitle, createdAt)
          VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
        `, [q.bookId, q.content, q.author, q.bookTitle]);
      }
      console.log('📜 Đã nạp kho trích dẫn danh ngôn văn học kinh điển vào bảng quotes.');
    }

    console.log('✅ Khởi tạo và kiểm tra schema cơ sở dữ liệu hoàn tất.');

    // 5. Seed Data Users (Tất cả tài khoản mẫu có sẵn đều set isVerified = 1)
    const defaultPasswordHash = await bcrypt.hash('123456', 10);

    // Admin: contact = admin@library.com
    const adminExists = await dbAsync.get('SELECT id FROM users WHERE contact = ?', ['admin@library.com']);
    if (!adminExists) {
      await dbAsync.run(`
        INSERT INTO users (fullName, contact, passwordHash, dateOfBirth, address, isVerified, role, createdAt)
        VALUES (?, ?, ?, '1990-01-01', 'Hà Nội', 1, 'admin', datetime('now', 'localtime'))
      `, ['Thủ Thư Quản Trị', 'admin@library.com', defaultPasswordHash]);
      console.log('🌱 Đã tạo tài khoản Admin: admin@library.com / 123456');
    } else {
      await dbAsync.run(`UPDATE users SET isVerified = 1 WHERE contact = 'admin@library.com'`);
    }

    // Độc giả mặc định: Tạ Quang Nam (taquangnam177@gmail.com / 123456 - Sinh năm 2006, 20 tuổi)
    const namExists = await dbAsync.get('SELECT id FROM users WHERE contact = ?', ['taquangnam177@gmail.com']);
    if (!namExists) {
      await dbAsync.run(`
        INSERT INTO users (fullName, contact, email, passwordHash, dateOfBirth, address, isVerified, role, isLocked, createdAt)
        VALUES (?, ?, ?, ?, '2006-08-18', 'Phổ Yên, Thái Nguyên', 1, 'member', 0, datetime('now', 'localtime'))
      `, ['Tạ Quang Nam', 'taquangnam177@gmail.com', 'taquangnam177@gmail.com', defaultPasswordHash]);
      console.log('🌱 Đã tạo tài khoản Độc giả mặc định: Tạ Quang Nam (taquangnam177@gmail.com / 123456 - 20 tuổi)');
    } else {
      await dbAsync.run(`UPDATE users SET fullName = 'Tạ Quang Nam', email = 'taquangnam177@gmail.com', dateOfBirth = '2006-08-18', address = 'Phổ Yên, Thái Nguyên', isVerified = 1 WHERE contact = 'taquangnam177@gmail.com'`);
    }

    // Kid: contact = kid@library.com
    const kidExists = await dbAsync.get('SELECT id FROM users WHERE contact = ?', ['kid@library.com']);
    if (!kidExists) {
      await dbAsync.run(`
        INSERT INTO users (fullName, contact, passwordHash, dateOfBirth, address, isVerified, role, createdAt)
        VALUES (?, ?, ?, '2012-08-20', 'Đà Nẵng', 1, 'member', datetime('now', 'localtime'))
      `, ['Bé Minh Tuấn', 'kid@library.com', defaultPasswordHash]);
      console.log('🌱 Đã tạo tài khoản Trẻ em: kid@library.com / 123456 (14 tuổi)');
    } else {
      await dbAsync.run(`UPDATE users SET isVerified = 1 WHERE contact = 'kid@library.com'`);
    }

    // 6. Seed Data Books (Cập nhật ảnh bìa sách thật dạng đứng tỉ lệ 2:3, đa dạng thể loại & truyện tranh)
    const sampleBooks = [
      // --- TÁC PHẨM VĂN HỌC VIỆT NAM TIÊU BIỂU ---
      {
        title: 'Dế Mèn Phiêu Lưu Ký',
        author: 'Tô Hoài',
        category: 'Văn học thiếu nhi',
        quantity: 8,
        availableQuantity: 8,
        ageRestriction: 'kids',
        coverImage: '/images/covers/de-men-phieu-luu-ky.jpg',
        description: 'Tác phẩm văn học thiếu nhi kinh điển của nhà văn Tô Hoài, kể về cuộc phiêu lưu kì thú và bài học trưởng thành sâu sắc của chú Dế Mèn dũng cảm, trượng nghĩa.'
      },
      {
        title: 'Số Đỏ',
        author: 'Vũ Trọng Phụng',
        category: 'Văn học Việt Nam',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'all',
        coverImage: '/images/covers/so-do.jpg',
        description: 'Kiệt tác tiểu thuyết trào phúng đỉnh cao của văn học Việt Nam thời kỳ 1930 - 1945, lột trần chân tướng xã hội thành thị nửa mùa qua hành trình leo thang danh vọng của nhân vật Xuân Tóc Đỏ.'
      },
      {
        title: 'Tắt Đèn',
        author: 'Ngô Tất Tố',
        category: 'Văn học Việt Nam',
        quantity: 7,
        availableQuantity: 7,
        ageRestriction: 'all',
        coverImage: '/images/covers/tat-den.jpg',
        description: 'Bức tranh hiện thực chân xác và xúc động về nỗi thống khổ của người nông dân Việt Nam trước cách mạng dưới ách áp bức sưu thuế, tôn vinh phẩm chất cao đẹp của chị Dậu.'
      },
      {
        title: 'Mắt Biếc',
        author: 'Nguyễn Nhật Ánh',
        category: 'Văn học Việt Nam',
        quantity: 10,
        availableQuantity: 9,
        ageRestriction: 'all',
        coverImage: '/images/covers/mat-biec.jpg',
        description: 'Bản tình ca đượm buồn và trong trẻo của nhà văn Nguyễn Nhật Ánh về mối tình đơn phương thủy chung của thầy giáo Ngạn dành cho cô bạn có đôi mắt biếc - Hà Lan.'
      },
      {
        title: 'Truyện Kiều',
        author: 'Nguyễn Du',
        category: 'Văn học kinh điển',
        quantity: 10,
        availableQuantity: 10,
        ageRestriction: 'all',
        coverImage: '/images/covers/truyen-kieu.jpg',
        description: 'Đại thi phẩm thi ca bằng chữ Nôm bất hủ của Đại thi hào Nguyễn Du, tái hiện tấn bi kịch đoạn trường của Thúy Kiều và giá trị nhân đạo sâu sắc vượt thời đại.'
      },
      {
        title: 'Cánh Đồng Bất Tận',
        author: 'Nguyễn Ngọc Tư',
        category: 'Văn học đương đại',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: '18+',
        coverImage: '/images/covers/canh-dong-bat-tan.jpg',
        description: 'Tập truyện ngắn đậm chất sông nước miền Tây Nam Bộ của nhà văn Nguyễn Ngọc Tư, xoay quanh những nỗi đau, bi kịch thân phận con người và tình cảm trắc trở, khuyến nghị độc giả từ 18 tuổi trở lên.'
      },
      {
        title: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ',
        author: 'Nguyễn Nhật Ánh',
        category: 'Văn học thiếu nhi',
        quantity: 8,
        availableQuantity: 8,
        ageRestriction: 'kids',
        coverImage: '/images/covers/cho-toi-xin-mot-ve-di-tuoi-tho.jpg',
        description: 'Tác phẩm đoạt giải thưởng Văn học ASEAN của Nguyễn Nhật Ánh, tấm vé thần kỳ đưa người đọc trở về thế giới tuổi thơ hồn nhiên, trong trẻo và ngập tràn tiếng cười của bốn bạn nhỏ cu Mùi, Tủn, Tí sún và Hải cò.'
      },

      // --- VĂN HỌC QUỐC TẾ & KINH ĐIỂN ---
      {
        title: 'Hoàng Tử Bé (Le Petit Prince)',
        author: 'Antoine de Saint-Exupéry',
        category: 'Truyện thiếu nhi',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'kids',
        coverImage: '/images/covers/hoang-tu-be.jpg',
        description: 'Câu chuyện kỳ diệu về một hoàng tử nhỏ đến từ một tiểu tinh cầu xa xôi, mang thông điệp trong trẻo và ấm áp về tình yêu thương, trách nhiệm.'
      },
      {
        title: 'Nhà Giả Kim (The Alchemist)',
        author: 'Paulo Coelho',
        category: 'Văn học',
        quantity: 8,
        availableQuantity: 7,
        ageRestriction: 'all',
        coverImage: '/images/covers/nha-gia-kim.jpg',
        description: 'Hành trình vượt sa mạc tìm kiếm kho báu của chàng chăn cừu Santiago, bài học sâu sắc về việc theo đuổi vận mệnh và ước mơ đời mình.'
      },
      {
        title: 'Đắc Nhân Tâm (How to Win Friends)',
        author: 'Dale Carnegie',
        category: 'Kỹ năng sống',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'all',
        coverImage: '/images/covers/dac-nhan-tam.jpg',
        description: 'Nghệ thuật giao tiếp ứng xử, thấu hiểu lòng người và tạo dựng các mối quan hệ tích cực, bền vững trong cuộc sống.'
      },
      {
        title: 'Clean Code: Cẩm Nang Viết Mã Sạch',
        author: 'Robert C. Martin',
        category: 'Công nghệ thông tin',
        quantity: 4,
        availableQuantity: 4,
        ageRestriction: 'all',
        coverImage: '/images/covers/clean-code.jpg',
        description: 'Quy chuẩn kinh điển trong ngành phát triển phần mềm về cách viết code dễ đọc, dễ bảo trì, hạn chế lỗi kỹ thuật.'
      },
      {
        title: 'Rừng Na Uy (Norwegian Wood)',
        author: 'Haruki Murakami',
        category: 'Văn học đương đại',
        quantity: 4,
        availableQuantity: 4,
        ageRestriction: '18+',
        coverImage: '/images/covers/rung-na-uy.jpg',
        description: 'Tiểu thuyết kinh điển của Haruki Murakami chứa đựng những trăn trở, mất mát của tuổi trẻ cùng các yếu tố tâm lý và tình cảm sâu sắc, chỉ dành riêng cho người đọc trên 18 tuổi.'
      },
      {
        title: 'Trăm Năm Cô Đơn (One Hundred Years of Solitude)',
        author: 'Gabriel García Márquez',
        category: 'Văn học kinh điển',
        quantity: 3,
        availableQuantity: 3,
        ageRestriction: '18+',
        coverImage: '/images/covers/tram-nam-co-don.jpg',
        description: 'Kiệt tác chủ nghĩa hiện thực huyền ảo về dòng họ Buendía qua bảy thế hệ với những biến cố dữ dội, khuyến cáo độc giả từ 18 tuổi trở lên.'
      },
      {
        title: 'Sapiens: Lược Sử Loài Người',
        author: 'Yuval Noah Harari',
        category: 'Lịch sử - Triết học',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/sapiens.jpg',
        description: 'Khám phá toàn cảnh hành trình tiến hóa vĩ đại của loài người từ thời kỳ đồ đá cho đến kỷ nguyên công nghệ hiện đại.'
      },
      {
        title: 'Tư Duy Nhanh Và Chậm',
        author: 'Daniel Kahneman',
        category: 'Tâm lý học',
        quantity: 4,
        availableQuantity: 4,
        ageRestriction: 'all',
        coverImage: '/images/covers/tu-duy-nhanh-va-cham.jpg',
        description: 'Kiệt tác kinh tế học hành vi và tâm lý học nhận thức của nhà đoạt giải Nobel Daniel Kahneman về hai hệ thống tư duy chi phối quyết định con người.'
      },

      // --- TRUYỆN TRANH & MANGA ĐÌNH ĐÁM ---
      {
        title: 'Doraemon: Chú Mèo Máy Đến Từ Tương Lai (Tập 1)',
        author: 'Fujiko F. Fujio',
        category: 'Truyện tranh (Manga)',
        quantity: 10,
        availableQuantity: 10,
        ageRestriction: 'kids',
        coverImage: '/images/covers/doraemon.jpg',
        description: 'Bộ truyện tranh huyền thoại tuổi thơ. Chú mèo máy thông minh Doraemon cùng các bảo bối kỳ diệu từ thế kỷ 22 giúp đỡ cậu bạn hậu đậu Nobita trong cuộc sống hàng ngày.'
      },
      {
        title: 'Thám Tử Lừng Danh Conan (Tập 1)',
        author: 'Gosho Aoyama',
        category: 'Truyện tranh (Manga)',
        quantity: 8,
        availableQuantity: 8,
        ageRestriction: 'all',
        coverImage: '/images/covers/conan.jpg',
        description: 'Thám tử học sinh Kudo Shinichi bị Tổ chức Áo Đen đầu độc teo nhỏ thành Edogawa Conan, mở đầu hành trình phá án thiên tài và vạch trần tổ chức bí ẩn.'
      },
      {
        title: 'Dragon Ball: 7 Viên Ngọc Rồng (Tập 1)',
        author: 'Akira Toriyama',
        category: 'Truyện tranh (Manga)',
        quantity: 8,
        availableQuantity: 8,
        ageRestriction: 'all',
        coverImage: '/images/covers/dragon-ball.jpg',
        description: 'Huyền thoại võ thuật phiêu lưu theo chân cậu bé Son Goku và Bulma lên đường truy tìm 7 viên ngọc rồng có khả năng ban điều ước thiêng liêng.'
      },
      {
        title: 'One Piece: Đảo Hải Tặc (Tập 1)',
        author: 'Eiichiro Oda',
        category: 'Truyện tranh (Manga)',
        quantity: 10,
        availableQuantity: 10,
        ageRestriction: 'all',
        coverImage: '/images/covers/one-piece.jpg',
        description: 'Monkey D. Luffy mang ước mơ trở thành Vua Hải Tặc, giương buồm ra biển lớn tập hợp đồng đội băng Mũ Rơm chinh phục kho báu huyền thoại One Piece.'
      },
      {
        title: 'Naruto: Huyền Thoại Ninja Làng Lá (Tập 1)',
        author: 'Masashi Kishimoto',
        category: 'Truyện tranh (Manga)',
        quantity: 7,
        availableQuantity: 7,
        ageRestriction: 'all',
        coverImage: '/images/covers/naruto.jpg',
        description: 'Cậu bé mồ côi Uzumaki Naruto mang trong mình phong ấn Cửu Vĩ hồ ly, vượt qua định kiến và khổ luyện để trở thành Hokage vĩ đại được mọi người công nhận.'
      },
      {
        title: 'Thần Đồng Đất Việt: Trạng Tí Xuất Quân (Tập 1)',
        author: 'Lê Linh',
        category: 'Truyện tranh thiếu nhi',
        quantity: 12,
        availableQuantity: 12,
        ageRestriction: 'kids',
        coverImage: '/images/covers/than-dong-dat-viet.jpg',
        description: 'Bộ truyện tranh thuần Việt hài hước, dí dỏm tái hiện cuộc đời Trạng Tí cùng nhóm bạn Sửu, Dần, Mẹo qua những câu chuyện lịch sử dân gian thông minh.'
      },
      {
        title: 'Tý Quậy: Tuổi Thơ Học Trò (Tập 1)',
        author: 'Đào Hải',
        category: 'Truyện tranh thiếu nhi',
        quantity: 8,
        availableQuantity: 8,
        ageRestriction: 'kids',
        coverImage: '/images/covers/ty-quay.jpg',
        description: 'Những trò nghịch ngợm ngộ nghĩnh, ngây thơ của hai bạn nhỏ Tý và Tèo dưới mái trường và khu phố Việt Nam thời học trò đầy ắp tiếng cười.'
      },
      {
        title: 'Shin - Cậu Bé Bút Chì (Tập 1)',
        author: 'Yoshito Usui',
        category: 'Truyện tranh hài hước',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'all',
        coverImage: '/images/covers/shin-cau-be-but-chi.jpg',
        description: 'Cậu bé Shinnosuke 5 tuổi tinh quái với những suy nghĩ và hành động ngộ nghĩnh cùng gia đình Nohara tại tỉnh Saitama Nhật Bản.'
      },
      {
        title: 'Attack on Titan: Đại Chiến Người Khổng Lồ (Tập 1)',
        author: 'Hajime Isayama',
        category: 'Truyện tranh hành động',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: '18+',
        coverImage: '/images/covers/attack-on-titan.jpg',
        description: 'Nhân loại co cụm sau những bức tường khổng lồ trước sự tàn phá của các Titan ăn thịt người. Chứa các yếu tố bạo lực và tâm lý khốc liệt, chỉ dành cho độc giả trên 18 tuổi.'
      },
      {
        title: 'Death Note: Cuốn Sổ Tử Thần (Tập 1)',
        author: 'Tsugumi Ohba & Takeshi Obata',
        category: 'Truyện tranh trinh thám',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: '18+',
        coverImage: '/images/covers/death-note.jpg',
        description: 'Cuộc đấu trí đỉnh cao giữa thiên tài Yagami Light sở hữu cuốn sổ tử thần và thám tử lập dị L nhằm định nghĩa lại công lý thế giới, khuyến cáo độc giả trên 18 tuổi.'
      },
      {
        title: 'Gintama: Linh Hồn Bạc (Tập 1)',
        author: 'Hideaki Sorachi',
        category: 'Truyện tranh hài hước',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/gintama.jpg',
        description: 'Bối cảnh thời kỳ Edo khi người ngoài hành tinh Amanto xâm lược Nhật Bản, kiếm sĩ tóc bạc Sakata Gintoki cùng tiệm Vạn Năng mở ra những câu chuyện cười ra nước mắt.'
      },

      // --- KHOA HỌC VIỄN TƯỞNG & GIẢ TƯỞNG ---
      {
        title: 'Harry Potter Và Hòn Đá Phù Thủy',
        author: 'J.K. Rowling',
        category: 'Văn học giả tưởng',
        quantity: 9,
        availableQuantity: 9,
        ageRestriction: 'kids',
        coverImage: '/images/covers/harry-potter.jpg',
        description: 'Cuộc phiêu lưu kỳ diệu của cậu bé Harry Potter khi bước chân vào Trường Phù thủy Hogwarts, mở ra thế giới phép thuật huyền bí và tình bạn gắn bó.'
      },
      {
        title: 'Chúa Tể Những Chiếc Nhẫn: Đoàn Hộ Nhẫn',
        author: 'J.R.R. Tolkien',
        category: 'Văn học kỳ ảo',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'all',
        coverImage: '/images/covers/chua-te-nhung-chiec-nhan.jpg',
        description: 'Sử thi kỳ ảo vĩ đại của vùng Trung Địa, nơi Frodo Baggins cùng liên minh dấn thân vào hành trình phá hủy Chiếc Nhẫn Chúa tại ngọn núi Diệt Vong.'
      },
      {
        title: 'Tam Thể (The Three-Body Problem)',
        author: 'Lưu Từ Hân',
        category: 'Khoa học viễn tưởng',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/tam-the.jpg',
        description: 'Kiệt tác Sci-Fi châu Á đoạt giải Hugo, đưa ra bài toán ba thiên thể hóc búa và viễn cảnh nhân loại đối mặt với nền văn minh ngoài hành tinh Trisolaris.'
      },
      {
        title: 'Dune: Xứ Cát (Dune Chronicles)',
        author: 'Frank Herbert',
        category: 'Khoa học viễn tưởng',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/dune-xu-cat.jpg',
        description: 'Sử thi vũ trụ hùng tráng xoay quanh hành tinh sa mạc Arrakis - nguồn cung cấp duy nhất của hương dược quý giá chi phối cả đế chế thiên hà.'
      },

      // --- TRINH THÁM & BÍ ẨN ---
      {
        title: 'Thám Tử Sherlock Holmes Toàn Tập',
        author: 'Arthur Conan Doyle',
        category: 'Văn học trinh thám',
        quantity: 7,
        availableQuantity: 7,
        ageRestriction: 'all',
        coverImage: '/images/covers/sherlock-holmes.jpg',
        description: 'Những vụ án kinh điển tại phố Baker thành Luân Đôn được thám tử thiên tài Sherlock Holmes giải mã bằng nghệ thuật suy luận logic đỉnh cao.'
      },
      {
        title: 'Phía Sau Nghi Can X',
        author: 'Higashino Keigo',
        category: 'Trinh thám đấu trí',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'all',
        coverImage: '/images/covers/phia-sau-nghi-can-x.jpg',
        description: 'Cuộc đấu trí giữa giáo sư vật lý Yukawa và thiên tài toán học Ishigami với một chứng cứ ngoại phạm hoàn hảo được thiết lập vì tình yêu thầm lặng.'
      },
      {
        title: 'Và Rồi Chẳng Còn Ai (Mười Người Da Đen Nhỏ)',
        author: 'Agatha Christie',
        category: 'Văn học trinh thám',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/muoi-nguoi-da-den-nho.jpg',
        description: 'Mười người xa lạ bị đưa tới một hòn đảo hoang biệt lập và lần lượt bị sát hại theo đúng bài thơ đồng dao cổ mà không để lại bất cứ dấu vết nào.'
      },
      {
        title: 'Bạch Dạ Hành (Hành Trình Dưới Trời Đêm)',
        author: 'Higashino Keigo',
        category: 'Văn học tâm lý',
        quantity: 4,
        availableQuantity: 4,
        ageRestriction: '18+',
        coverImage: '/images/covers/bach-da-hanh.jpg',
        description: 'Bi kịch tăm tối kéo dài suốt 19 năm của hai linh hồn nương tựa nhau trong bóng tối, tác phẩm nặng yếu tố tâm lý sâu sắc chỉ dành cho độc giả 18+.'
      },

      // --- KỸ NĂNG, TÂM LÝ & KINH TẾ TÀI CHÍNH ---
      {
        title: 'Cây Cam Ngọt Của Tôi',
        author: 'José Mauro de Vasconcelos',
        category: 'Văn học kinh điển',
        quantity: 8,
        availableQuantity: 8,
        ageRestriction: 'all',
        coverImage: '/images/covers/cay-cam-ngot-cua-toi.jpg',
        description: 'Tác phẩm xúc động chạm đến trái tim hàng triệu bạn đọc về tuổi thơ của cậu bé Zezé giàu trí tưởng tượng và người bạn cây cam ngọt thân thiết.'
      },
      {
        title: 'Hiểu Về Trái Tim',
        author: 'Thích Minh Niệm',
        category: 'Tâm lý - Kỹ năng sống',
        quantity: 7,
        availableQuantity: 7,
        ageRestriction: 'all',
        coverImage: '/images/covers/hieu-ve-trai-tim.jpg',
        description: 'Cẩm nang soi rọi nội tâm, chữa lành vết thương tinh thần, buông bỏ muộn phiền và tìm thấy sự bình an đích thực trong tâm hồn.'
      },
      {
        title: 'Cha Giàu Cha Nghèo (Rich Dad Poor Dad)',
        author: 'Robert T. Kiyosaki',
        category: 'Kinh tế - Tài chính',
        quantity: 10,
        availableQuantity: 10,
        ageRestriction: 'all',
        coverImage: '/images/covers/cha-giau-cha-ngheo.jpg',
        description: 'Cuốn sách tài chính cá nhân bán chạy nhất mọi thời đại, thay đổi tư duy tài chính và giải thích sự khác biệt giữa tài sản và tiêu sản.'
      },
      {
        title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
        author: 'Morgan Housel',
        category: 'Kinh tế - Tài chính',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'all',
        coverImage: '/images/covers/tam-ly-hoc-ve-tien.jpg',
        description: '19 câu chuyện ngắn khám phá cách suy nghĩ, cảm xúc và các cạm bẫy tâm lý ảnh hưởng trực tiếp đến quyết định tài chính của con người.'
      },
      {
        title: 'Không Gia Đình (Sans Famille)',
        author: 'Hector Malot',
        category: 'Văn học thiếu nhi',
        quantity: 6,
        availableQuantity: 6,
        ageRestriction: 'kids',
        coverImage: '/images/covers/khong-gia-dinh.jpg',
        description: 'Hành trình phiêu lưu gian khổ nhưng giàu nghĩa tình của chú bé mồ côi Rémi cùng gánh xiếc rong của cụ Vitalis trên khắp nẻo đường nước Pháp.'
      },
      {
        title: 'Lược Sử Thời Gian (A Brief History of Time)',
        author: 'Stephen Hawking',
        category: 'Khoa học - Vũ trụ',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/luoc-su-thoi-gian.jpg',
        description: 'Hành trình giải mã vũ trụ của nhà vật lý thiên tài Stephen Hawking: vụ nổ Big Bang, lỗ đen vũ trụ, mũi tên thời gian và nguồn gốc vũ trụ.'
      },
      {
        title: 'Lập Trình Viên Đắc Lực (The Pragmatic Programmer)',
        author: 'David Thomas & Andrew Hunt',
        category: 'Công nghệ thông tin',
        quantity: 5,
        availableQuantity: 5,
        ageRestriction: 'all',
        coverImage: '/images/covers/lap-trinh-vien-dac-luc.jpg',
        description: 'Cẩm nang kinh điển rèn luyện tư duy thực chiến, làm chủ công cụ và các nguyên lý vàng xây dựng phần mềm chất lượng cao.'
      }
    ];

    for (const b of sampleBooks) {
      const existing = await dbAsync.get('SELECT id FROM books WHERE title LIKE ?', [`%${b.title.split('(')[0].trim()}%`]);
      if (!existing) {
        await dbAsync.run(`
          INSERT INTO books (title, author, category, quantity, availableQuantity, coverImage, description, ageRestriction)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [b.title, b.author, b.category, b.quantity, b.availableQuantity, b.coverImage, b.description, b.ageRestriction]);
      } else {
        await dbAsync.run(`UPDATE books SET ageRestriction = ?, coverImage = ?, description = ?, category = ? WHERE id = ?`, [b.ageRestriction, b.coverImage, b.description, b.category, existing.id]);
      }
    }

    // 7. Seed Reviews mẫu nếu bảng reviews chưa có dữ liệu
    const reviewCount = await dbAsync.get('SELECT COUNT(*) as count FROM reviews');
    if (reviewCount && reviewCount.count === 0) {
      const allBooks = await dbAsync.all('SELECT id FROM books');
      const sampleReviewsData = [
        { rating: 5, comment: 'Một tác phẩm kinh điển vô cùng xuất sắc! Lối hành văn cuốn hút và để lại nhiều bài học nhân sinh sâu sắc.' },
        { rating: 5, comment: 'Sách rất hay, cốt truyện hấp dẫn đến trang cuối cùng. Độc giả thư viện nhất định phải đọc thử cuốn này!' },
        { rating: 4, comment: 'Chất lượng sách tại thư viện được giữ gìn rất tốt, trang in đẹp và nội dung giàu giá trị nhân văn.' },
        { rating: 5, comment: 'Đọc đi đọc lại nhiều lần vẫn cảm thấy nguyên vẹn cảm xúc ban đầu. Đánh giá 5 sao cho tác phẩm!' },
        { rating: 4, comment: 'Một trải nghiệm đọc sách tuyệt vời. Cảm ơn thư viện LibMaster đã có sẵn tựa sách này trong kho.' }
      ];

      for (let i = 0; i < allBooks.length; i++) {
        const bId = allBooks[i].id;
        const r1 = sampleReviewsData[i % sampleReviewsData.length];
        const r2 = sampleReviewsData[(i + 2) % sampleReviewsData.length];
        await dbAsync.run(`
          INSERT INTO reviews (bookId, userId, rating, comment, createdAt)
          VALUES (?, 2, ?, ?, datetime('now', '-2 days', 'localtime'))
        `, [bId, r1.rating, r1.comment]);
        await dbAsync.run(`
          INSERT INTO reviews (bookId, userId, rating, comment, createdAt)
          VALUES (?, 1, ?, ?, datetime('now', '-5 hours', 'localtime'))
        `, [bId, r2.rating, r2.comment]);
      }
      console.log('⭐ Đã nạp dữ liệu đánh giá và nhận xét mẫu cho các đầu sách.');
    }

    console.log('🌱 Dữ liệu sách mẫu với ảnh bìa thật 2:3, cấu trúc bảo mật OTP và Đánh giá sao đã sẵn sàng.');
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo Database:', error);
  }
}

initDatabase();

module.exports = {
  db,
  dbAsync
};
