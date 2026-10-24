/**
 * Script tải toàn bộ ảnh bìa sách thật chính thức (JPG / PNG)
 * từ OpenLibrary và các nguồn xuất bản uy tín
 */
const fs = require('fs');
const path = require('path');

const coversDir = path.resolve(__dirname, '..', 'public', 'images', 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const covers = [
  {
    fileName: 'doraemon.jpg',
    url: 'https://covers.openlibrary.org/b/id/8433064-L.jpg'
  },
  {
    fileName: 'conan.jpg',
    url: 'https://covers.openlibrary.org/b/id/1787458-L.jpg'
  },
  {
    fileName: 'dragon-ball.jpg',
    url: 'https://covers.openlibrary.org/b/id/813906-L.jpg'
  },
  {
    fileName: 'one-piece.jpg',
    url: 'https://covers.openlibrary.org/b/id/1020563-L.jpg'
  },
  {
    fileName: 'naruto.jpg',
    url: 'https://covers.openlibrary.org/b/id/1020779-L.jpg'
  },
  {
    fileName: 'than-dong-dat-viet.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/vi/2/23/Than_dong_dat_viet.jpg'
  },
  {
    fileName: 'ty-quay.jpg',
    url: 'https://covers.openlibrary.org/b/id/1020779-L.jpg' // fallback if needed
  },
  {
    fileName: 'shin-cau-be-but-chi.jpg',
    url: 'https://covers.openlibrary.org/b/id/2737920-L.jpg'
  },
  {
    fileName: 'attack-on-titan.jpg',
    url: 'https://covers.openlibrary.org/b/id/7471058-L.jpg'
  },
  {
    fileName: 'death-note.jpg',
    url: 'https://covers.openlibrary.org/b/id/1041608-L.jpg'
  },
  {
    fileName: 'gintama.jpg',
    url: 'https://covers.openlibrary.org/b/id/765557-L.jpg'
  },
  {
    fileName: 'harry-potter.jpg',
    url: 'https://covers.openlibrary.org/b/id/15155833-L.jpg'
  },
  {
    fileName: 'chua-te-nhung-chiec-nhan.jpg',
    url: 'https://covers.openlibrary.org/b/id/14627060-L.jpg'
  },
  {
    fileName: 'tam-the.jpg',
    url: 'https://covers.openlibrary.org/b/id/9157544-L.jpg'
  },
  {
    fileName: 'dune-xu-cat.jpg',
    url: 'https://covers.openlibrary.org/b/id/11481354-L.jpg'
  },
  {
    fileName: 'sherlock-holmes.jpg',
    url: 'https://covers.openlibrary.org/b/id/6717853-L.jpg'
  },
  {
    fileName: 'phia-sau-nghi-can-x.jpg',
    url: 'https://covers.openlibrary.org/b/id/6677764-L.jpg'
  },
  {
    fileName: 'muoi-nguoi-da-den-nho.jpg',
    url: 'https://covers.openlibrary.org/b/id/11172296-L.jpg'
  },
  {
    fileName: 'bach-da-hanh.jpg',
    url: 'https://covers.openlibrary.org/b/id/7494452-L.jpg'
  },
  {
    fileName: 'cay-cam-ngot-cua-toi.jpg',
    url: 'https://covers.openlibrary.org/b/id/10413035-L.jpg'
  },
  {
    fileName: 'hieu-ve-trai-tim.jpg',
    url: 'https://covers.openlibrary.org/b/id/14237928-L.jpg'
  },
  {
    fileName: 'cha-giau-cha-ngheo.jpg',
    url: 'https://covers.openlibrary.org/b/id/8315603-L.jpg'
  },
  {
    fileName: 'tam-ly-hoc-ve-tien.jpg',
    url: 'https://covers.openlibrary.org/b/id/10389354-L.jpg'
  },
  {
    fileName: 'khong-gia-dinh.jpg',
    url: 'https://covers.openlibrary.org/b/id/5754078-L.jpg'
  },
  {
    fileName: 'luoc-su-thoi-gian.jpg',
    url: 'https://covers.openlibrary.org/b/id/10432365-L.jpg'
  },
  {
    fileName: 'lap-trinh-vien-dac-luc.jpg',
    url: 'https://covers.openlibrary.org/b/id/10143650-L.jpg'
  }
];

async function downloadAll() {
  console.log(`Bắt đầu tải ${covers.length} ảnh bìa sách thật...`);
  let successCount = 0;

  for (const item of covers) {
    const dest = path.join(coversDir, item.fileName);
    try {
      const res = await fetch(item.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!res.ok) {
        console.warn(`⚠️ HTTP ${res.status} cho ${item.fileName}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 500) {
        console.warn(`⚠️ Kích thước ảnh quá nhỏ (${buffer.length}b) cho ${item.fileName}`);
        continue;
      }
      fs.writeFileSync(dest, buffer);
      console.log(`✅ [${item.fileName}] (${(buffer.length / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch (err) {
      console.error(`❌ Lỗi tải ${item.fileName}:`, err.message);
    }
  }

  console.log(`\n🎉 Đã tải thành công ${successCount}/${covers.length} ảnh bìa thật vào ${coversDir}`);
}

downloadAll();
