/**
 * ========================================================
 * SCRIPT NẠP 1-5 ĐÁNH GIÁ & CẢM NHẬN VÀO TỪNG QUYỂN SÁCH
 * File: scripts/seed-reviews.js
 * ========================================================
 */

const { dbAsync } = require('../config/db');

// Danh sách đánh giá & cảm nhận theo chủ đề tác phẩm
const REVIEW_TEMPLATES = {
  it: [
    { rating: 5, comment: 'Một cuốn sách gối đầu giường không thể thiếu cho bất kỳ ai theo đuổi ngành lập trình. Tác giả giải thích rất trực quan về tư duy clean code và refactoring.' },
    { rating: 5, comment: 'Đọc xong cuốn này tư duy viết mã của mình thay đổi hẳn. Code sáng sủa, dễ bảo trì hơn rất nhiều. Sách thư viện bảo quản rất mới.' },
    { rating: 4, comment: 'Các ví dụ thực tế và súc tích, tuy một số cú pháp đã cũ nhưng triết lý thiết kế hệ thống vẫn còn nguyên giá trị thực tiễn.' },
    { rating: 5, comment: 'Rất khuyến khích các bạn sinh viên IT nên mượn đọc sớm từ năm nhất để rèn luyện thói quen viết code chuyên nghiệp.' }
  ],
  manga: [
    { rating: 5, comment: 'Tác phẩm gắn liền với cả một thời tuổi thơ dữ dội! Nét vẽ kinh điển, cốt truyện lôi cuốn từng trang không thể rời mắt.' },
    { rating: 5, comment: 'Mượn về cho cả hai anh em cùng đọc, truyện tranh ở thư viện LibMaster được bọc cẩn thận, trang in rõ nét rất thích.' },
    { rating: 4, comment: 'Tình tiết hài hước và nhân văn sâu sắc. Đọc giải trí sau những giờ học tập căng thẳng thì không còn gì bằng!' },
    { rating: 5, comment: 'Cốt truyện quá đỉnh cao, nhân vật xây dựng cực kỳ có chiều sâu và truyền cảm hứng mạnh mẽ.' }
  ],
  detective: [
    { rating: 5, comment: 'Một kiệt tác trinh thám đấu trí nghẹt thở! Tác giả đan cài các manh mối quá tinh tế, cú twist ở những chương cuối làm mình thật sự sởn gai ốc.' },
    { rating: 5, comment: 'Đọc liền một mạch trong đêm không thể dừng lại được. Nghệ thuật suy luận logic đỉnh cao và tâm lý tội phạm được mổ xẻ rất chân thực.' },
    { rating: 4, comment: 'Không khí truyện u ám và cuốn hút lạ kỳ. Rất bái phục tài năng xây dựng tình huống của tác giả.' },
    { rating: 5, comment: 'Cái kết để lại nhiều suy ngẫm day dứt về ranh giới giữa thiện và ác trong lòng con người. Đánh giá 5 sao xứng đáng!' }
  ],
  scifi: [
    { rating: 5, comment: 'Trí tưởng tượng của tác giả vượt xa tầm nhìn thời đại. Những khái niệm vũ trụ và định luật vật lý được lồng ghép cực kỳ ngoạn mục!' },
    { rating: 5, comment: 'Mở rộng thế giới quan một cách kỳ diệu. Đọc xong cảm thấy con người thật nhỏ bé nhưng khát vọng khám phá thì vô tận.' },
    { rating: 4, comment: 'Một tác phẩm khoa học viễn tưởng đồ sộ, cần đọc chậm rãi để chiêm nghiệm hết các tầng ý nghĩa sâu xa.' }
  ],
  selfhelp: [
    { rating: 5, comment: 'Những bài học đắt giá về cách đối nhân xử thế và thấu hiểu người khác. Cuốn sách giúp mình bình tâm hơn rất nhiều trước áp lực cuộc sống.' },
    { rating: 5, comment: 'Cuốn sách thay đổi tư duy và cách nhìn nhận của mình về các mối quan hệ xã hội. Lời văn giản dị nhưng thấm thía từng câu chữ.' },
    { rating: 4, comment: 'Mỗi khi cảm thấy bế tắc hay mất phương hướng, mở vài trang sách ra đọc lại thấy lòng nhẹ nhõm và tích cực hơn.' }
  ],
  finance: [
    { rating: 5, comment: 'Tư duy tài chính sắc bén, giúp mình phân biệt rõ ràng giữa tài sản và tiêu sản. Rất cần thiết cho các bạn trẻ chuẩn bị bước vào đời.' },
    { rating: 5, comment: 'Cách tác giả tiếp cận tâm lý con người đối với tiền bạc rất độc đáo và thực tế, không hề lý thuyết sáo rỗng.' },
    { rating: 4, comment: 'Sách cung cấp những góc nhìn tỉnh táo về quản lý tài chính cá nhân và đầu tư dài hạn.' }
  ],
  literature: [
    { rating: 5, comment: 'Tác phẩm văn học tuyệt đẹp, ngôn từ bay bổng và đong đầy chất thơ. Một câu chuyện làm lay động những góc sâu kín nhất trong tâm hồn.' },
    { rating: 5, comment: 'Mình đã khóc khi đọc đến những trang cuối cùng. Thật sự là một kiệt tác giàu tình yêu thương và lòng trắc ẩn.' },
    { rating: 4, comment: 'Cuốn sách mang lại cảm giác bình yên lạ thường giữa nhịp sống hối hả. Rất biết ơn thư viện đã lưu giữ tác phẩm hay này.' },
    { rating: 5, comment: 'Đọc đi đọc lại nhiều lần qua từng giai đoạn trưởng thành, mỗi lần lại nhận ra thêm một tầng ý nghĩa mới sâu sắc.' }
  ],
  vietnam: [
    { rating: 5, comment: 'Bức tranh hiện thực xã hội Việt Nam được khắc họa vô cùng chân thực và sâu sắc. Giá trị tư tưởng và nghệ thuật vượt thời gian.' },
    { rating: 5, comment: 'Ngôn ngữ phong phú, đậm đà bản sắc dân tộc. Tác phẩm xứng đáng là niềm tự hào của nền văn học nước nhà.' },
    { rating: 4, comment: 'Những lát cắt cuộc đời và số phận con người Việt Nam để lại trong lòng độc giả nhiều niềm thương cảm sâu sắc.' }
  ],
  kids: [
    { rating: 5, comment: 'Cuốn sách nuôi dưỡng tâm hồn trẻ thơ tuyệt đẹp, câu chữ trong sáng và giàu tính giáo dục nhân văn.' },
    { rating: 5, comment: 'Mở sách ra là như được quay trở về với chiếc vé tuổi thơ hồn nhiên, trong trẻo. Rất thích hợp cho cả trẻ nhỏ và người lớn cùng đọc.' },
    { rating: 5, comment: 'Hình vẽ minh họa sinh động, lời kể dí dỏm giúp các bé rèn luyện thói quen yêu thích đọc sách từ nhỏ.' }
  ]
};

// Hàm xác định nhóm chủ đề phù hợp cho từng sách
function getCategoryKey(book) {
  const title = (book.title || '').toLowerCase();
  const cat = (book.category || '').toLowerCase();

  if (cat.includes('công nghệ') || title.includes('code') || title.includes('programmer')) return 'it';
  if (cat.includes('truyện tranh') || cat.includes('manga')) return 'manga';
  if (cat.includes('trinh thám') || title.includes('conan') || title.includes('holmes') || title.includes('can x') || title.includes('chẳng còn ai')) return 'detective';
  if (cat.includes('viễn tưởng') || cat.includes('vũ trụ') || title.includes('tam thể') || title.includes('dune') || title.includes('thời gian') || title.includes('sapiens')) return 'scifi';
  if (cat.includes('kinh tế') || cat.includes('tài chính') || title.includes('tiền') || title.includes('cha giàu')) return 'finance';
  if (cat.includes('kỹ năng') || cat.includes('tâm lý') || title.includes('đắc nhân') || title.includes('trái tim') || title.includes('tư duy')) return 'selfhelp';
  if (cat.includes('thiếu nhi') || book.ageRestriction === 'kids' || title.includes('tuổi thơ') || title.includes('dế mèn') || title.includes('bé')) return 'kids';
  if (cat.includes('việt nam') || title.includes('kiều') || title.includes('số đỏ') || title.includes('tắt đèn') || title.includes('mắt biếc') || title.includes('cánh đồng')) return 'vietnam';
  return 'literature';
}

async function seedReviews() {
  try {
    console.log('🚀 Bắt đầu nạp 1-5 đánh giá & cảm nhận ảo cho từng cuốn sách trong LibMaster...');

    // Đảm bảo có danh sách độc giả phong phú để đánh giá không bị trùng 1 người
    const existingUsers = await dbAsync.all('SELECT id, fullName FROM users');
    let userIds = existingUsers.map(u => u.id);

    // Lấy toàn bộ sách trong hệ thống
    const books = await dbAsync.all('SELECT id, title, category, author, ageRestriction FROM books ORDER BY id ASC');
    console.log(`📚 Tìm thấy tổng cộng: ${books.length} cuốn sách.`);

    // Xóa reviews cũ để nạp mới đồng bộ, đẹp mắt
    await dbAsync.run('DELETE FROM reviews');
    console.log('🧹 Đã dọn dẹp bảng reviews cũ.');

    let totalCreated = 0;

    for (const book of books) {
      const catKey = getCategoryKey(book);
      const templates = REVIEW_TEMPLATES[catKey] || REVIEW_TEMPLATES.literature;

      // Sinh từ 2 đến 5 đánh giá ngẫu nhiên cho mỗi quyển sách
      const countForBook = Math.floor(Math.random() * 4) + 2; // 2, 3, 4 hoặc 5 đánh giá
      const shuffledTemplates = [...templates].sort(() => 0.5 - Math.random());

      for (let i = 0; i < countForBook; i++) {
        const tpl = shuffledTemplates[i % shuffledTemplates.length];
        
        // Chọn ngẫu nhiên độc giả đánh giá
        const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];

        // Sinh thời gian tạo rải rác từ 1 đến 28 ngày trước và giờ/phút ngẫu nhiên
        const daysAgo = Math.floor(Math.random() * 25) + 1;
        const hoursAgo = Math.floor(Math.random() * 20) + 1;
        const minutesAgo = Math.floor(Math.random() * 55) + 1;

        await dbAsync.run(`
          INSERT INTO reviews (bookId, userId, rating, comment, createdAt)
          VALUES (?, ?, ?, ?, datetime('now', '-${daysAgo} days', '-${hoursAgo} hours', '-${minutesAgo} minutes', 'localtime'))
        `, [book.id, randomUserId, tpl.rating, tpl.comment]);

        totalCreated++;
      }
    }

    console.log(`✅ Hoàn thành! Đã tạo thành công ${totalCreated} đánh giá & nhận xét cho toàn bộ ${books.length} cuốn sách.`);

    // Kiểm tra mẫu 3 cuốn sách
    const sampleStats = await dbAsync.all(`
      SELECT 
        b.id, b.title,
        ROUND(AVG(r.rating), 1) as avgRating,
        COUNT(r.id) as reviewCount
      FROM books b
      JOIN reviews r ON b.id = r.bookId
      GROUP BY b.id
      ORDER BY b.id ASC
      LIMIT 5
    `);

    console.log('\n📊 Điểm đánh giá mẫu của 5 cuốn sách đầu tiên:');
    sampleStats.forEach(s => {
      console.log(`- [#${s.id}] ${s.title}: ⭐ ${s.avgRating}/5 (${s.reviewCount} đánh giá)`);
    });

  } catch (error) {
    console.error('❌ Lỗi khi nạp đánh giá ảo:', error);
  }
}

seedReviews();
