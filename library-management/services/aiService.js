/**
 * ========================================================
 * TRỢ LÝ THỦ THƯ ẢO AI (services/aiService.js)
 * Phân tích ý định tự nhiên, lọc theo độ tuổi và gợi ý sách thông minh
 * ========================================================
 */

// Hàm loại bỏ dấu tiếng Việt để tìm kiếm không dấu linh hoạt
function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

/**
 * Xử lý câu hỏi tự nhiên của người dùng và trả về gợi ý sách phù hợp
 * @param {string} userMessage - Câu hỏi từ người dùng
 * @param {number|null} userAge - Độ tuổi người dùng (nếu đã đăng nhập)
 * @param {Array} allBooks - Danh sách sách đầy đủ trong Database
 */
function analyzeAndRecommend(userMessage, userAge = null, allBooks = []) {
  const query = (userMessage || '').trim();
  const normalizedQuery = removeVietnameseTones(query);
  const isUnderage = userAge !== null && userAge < 18;

  // 1. Lọc sách theo quy định kiểm soát độ tuổi (Loại trừ sách 18+ nếu độc giả dưới 18 tuổi)
  let eligibleBooks = allBooks.filter(book => {
    if (isUnderage && book.ageRestriction === '18+') {
      return false;
    }
    return true;
  });

  // Kiểm tra nếu người dùng dưới 18 tuổi cố tình hỏi sách 18+
  const asksFor18Plus = normalizedQuery.includes('18+') || 
                        normalizedQuery.includes('nguoi lon') || 
                        normalizedQuery.includes('rung na uy') || 
                        normalizedQuery.includes('bach da hanh') || 
                        normalizedQuery.includes('canh dong bat tan');

  if (isUnderage && asksFor18Plus) {
    // Lấy 2 cuốn sách thiếu nhi / tuổi thơ xuất sắc thay thế
    const safeAlternatives = eligibleBooks.filter(b => b.ageRestriction === 'kids' || b.category.includes('thiếu nhi')).slice(0, 3);
    return {
      reply: `Dạ chào bạn, vì tài khoản của bạn hiện ghi nhận ${userAge} tuổi, theo quy định bảo vệ độc giả của Thư viện LibMaster, mình xin phép chưa thể gợi ý sách nhãn 18+. Thay vào đó, mình gửi bạn những tác phẩm vô cùng sâu sắc và trong trẻo rất phù hợp với lứa tuổi nhé:`,
      suggestions: safeAlternatives.map(b => ({
        ...b,
        reason: 'Tác phẩm trong sáng, giàu tính giáo dục và truyền cảm hứng tích cực.'
      }))
    };
  }

  // 2. Định nghĩa các nhóm chủ đề & từ khóa phân tích ý định
  const intents = [
    {
      key: 'healing_sad',
      match: ['buon', 'co don', 'chua lanh', 'met moi', 'ap luc', 'stress', 'nhe nhang', 'binh yen', 'dong luc', 'buon ba', 'an ui'],
      reply: 'Mình hiểu đôi khi cuộc sống có những ngày mệt mỏi và chùng chình. Dưới đây là những cuốn sách mang hơi thở bình yên và ấm áp, như một cái ôm nhẹ nhàng giúp xoa dịu tâm hồn bạn:',
      filter: b => {
        const t = removeVietnameseTones(b.title + ' ' + b.description + ' ' + b.category);
        return t.includes('cam ngot') || t.includes('trai tim') || t.includes('hoang tu be') || t.includes('tuoi tho') || t.includes('gia kim');
      },
      reason: 'Mang lại sự an ủi, xoa dịu tâm hồn và tái tạo năng lượng tích cực.'
    },
    {
      key: 'it_coding',
      match: ['lap trinh', 'code', 'cong nghe', 'it', 'phan mem', 'developer', 'ky thuat', 'viet code', 'clean code'],
      reply: 'Chào lập trình viên tương lai! Để nâng cấp tư duy thiết kế phần mềm và xây dựng mã nguồn chuẩn mực, mình xin đề xuất các tác phẩm kinh điển của làng công nghệ:',
      filter: b => b.category.toLowerCase().includes('công nghệ') || b.title.toLowerCase().includes('code') || b.title.toLowerCase().includes('lập trình'),
      reason: 'Cẩm nang cốt lõi về tư duy viết mã sạch và kỹ năng thực chiến ngành phần mềm.'
    },
    {
      key: 'manga_comics',
      match: ['truyen tranh', 'manga', 'comic', 'hoat hinh', 'anime', 'giai tri', 'hai huoc', 'vui ve', 'conan', 'doraemon', 'one piece', 'naruto', 'shin', 'dragon ball'],
      reply: 'Tuyệt vời! Nếu bạn đang tìm kiếm những giây phút phiêu lưu đầy ắp tiếng cười và cảm xúc tuổi thơ, đây là những bộ truyện tranh huyền thoại đang có sẵn tại LibMaster:',
      filter: b => b.category.toLowerCase().includes('truyện tranh') || b.category.toLowerCase().includes('manga'),
      reason: 'Cốt truyện lôi cuốn, giải trí tuyệt đỉnh và gợi nhớ ký ức tuổi thơ tươi đẹp.'
    },
    {
      key: 'detective_mystery',
      match: ['trinh tham', 'pha an', 'suy luan', 'toi pham', 'bi an', 'twist', 'sat nhan', 'holmes', 'keigo', 'agatha'],
      reply: 'Chào bạn, một tín đồ của những vụ án bí ẩn và các màn đấu trí căng thẳng! Đây là những siêu phẩm trinh thám với những cú twist đỉnh cao:',
      filter: b => b.category.toLowerCase().includes('trinh thám') || b.title.toLowerCase().includes('holmes') || b.title.toLowerCase().includes('nghi can') || b.title.toLowerCase().includes('chẳng còn ai'),
      reason: 'Nghệ thuật suy luận logic đỉnh cao, hồi hộp nghẹt thở đến trang cuối cùng.'
    },
    {
      key: 'scifi_universe',
      match: ['vien tuong', 'khoa hoc', 'vu tru', 'tam the', 'dune', 'hawking', 'sapiens', 'loai nguoi', 'thoi gian', 'hanh tinh'],
      reply: 'Nếu bạn khao khát vượt ra ngoài những giới hạn thông thường để khám phá vũ trụ bao la và dòng chảy lịch sử nhân loại, hãy đắm chìm vào những kiệt tác này:',
      filter: b => b.category.toLowerCase().includes('khoa học') || b.category.toLowerCase().includes('viễn tưởng') || b.category.toLowerCase().includes('lịch sử'),
      reason: 'Mở rộng thế giới quan vĩ mô với trí tưởng tượng kỳ vĩ và chiều sâu tri thức.'
    },
    {
      key: 'finance_wealth',
      match: ['tien', 'lam giau', 'kinh te', 'tai chinh', 'dau tu', 'kinh doanh', 'cha giau', 'quan ly tai chinh'],
      reply: 'Xây dựng tư duy tài chính thông minh là bước đệm quan trọng nhất cho sự tự do cá nhân. Thủ thư xin gửi tới bạn những cuốn sách kinh điển về tiền tệ và đầu tư:',
      filter: b => b.category.toLowerCase().includes('kinh tế') || b.category.toLowerCase().includes('tài chính'),
      reason: 'Trang bị tư duy quản lý tài chính tỉnh táo và cách thức xây dựng tài sản bền vững.'
    },
    {
      key: 'selfhelp_skill',
      match: ['ky nang', 'dac nhan tam', 'giao tiep', 'ung xu', 'tam ly', 'thau hieu', 'lanh dao', 'phat trien'],
      reply: 'Để nâng cao kỹ năng lắng nghe, thấu cảm và xây dựng những mối quan hệ bền vững trong cuộc sống, bạn không nên bỏ lỡ những cuốn sách này:',
      filter: b => b.category.toLowerCase().includes('kỹ năng') || b.category.toLowerCase().includes('tâm lý'),
      reason: 'Bí quyết thu phục nhân tâm, rèn luyện sự bình tĩnh và làm chủ cảm xúc.'
    },
    {
      key: 'kids_young',
      match: ['thieu nhi', 'tre em', 'be', 'hoc tro', 'con nit', 'nho tuoi', 'truong hoc'],
      reply: 'Dành riêng cho các độc giả nhỏ tuổi và những ai mong muốn tìm lại sự trong trẻo của ngày thơ bé:',
      filter: b => b.ageRestriction === 'kids' || b.category.toLowerCase().includes('thiếu nhi'),
      reason: 'Câu chuyện giàu lòng nhân ái, nuôi dưỡng tâm hồn trẻ thơ trong sáng.'
    },
    {
      key: 'author_nguyen_nhat_anh',
      match: ['nguyen nhat anh', 'nhat anh', 'mat biec', 've di tuoi tho'],
      reply: 'Nhà văn Nguyễn Nhật Ánh luôn có biệt tài kéo chúng ta về với những rung động đầu đời và miền ký ức tuổi thơ ngọt ngào. Dưới đây là các tác phẩm tiêu biểu của bác:',
      filter: b => b.author.toLowerCase().includes('nguyễn nhật ánh'),
      reason: 'Hành văn hóm hỉnh, mộc mạc và đong đầy hoài niệm tuổi học trò thơ mộng.'
    },
    {
      key: 'vietnam_literature',
      match: ['viet nam', 'van hoc viet', 'truyen kieu', 'to hoai', 'vu trong phung', 'ngo tat to', 'nguyen du'],
      reply: 'Nền văn học Việt Nam sở hữu những kiệt tác chân thực và xúc động lay chuyển lòng người. Mời bạn cùng chiêm nghiệm những áng văn bất hủ này:',
      filter: b => b.category.toLowerCase().includes('việt nam') || b.author.includes('Nguyễn Du') || b.author.includes('Tô Hoài') || b.author.includes('Vũ Trọng Phụng'),
      reason: 'Giá trị nghệ thuật và hiện thực sâu sắc, đậm đà hồn cốt văn hóa dân tộc.'
    }
  ];

  // 3. Tìm nhóm ý định phù hợp nhất
  let matchedIntent = null;
  for (const intent of intents) {
    if (intent.match.some(keyword => normalizedQuery.includes(keyword))) {
      matchedIntent = intent;
      break;
    }
  }

  let finalBooks = [];
  let replyIntro = '';

  if (matchedIntent) {
    replyIntro = matchedIntent.reply;
    const candidates = eligibleBooks.filter(matchedIntent.filter);
    // Ưu tiên sách còn hàng trong kho
    finalBooks = candidates.sort((a, b) => b.availableQuantity - a.availableQuantity).slice(0, 3);
  } else {
    // 4. Tìm kiếm từ khóa tự do trên tiêu đề, tác giả hoặc mô tả sách
    const scoredBooks = eligibleBooks.map(book => {
      let score = 0;
      const t = removeVietnameseTones(book.title);
      const a = removeVietnameseTones(book.author);
      const c = removeVietnameseTones(book.category);
      const d = removeVietnameseTones(book.description || '');

      const words = normalizedQuery.split(' ').filter(w => w.length > 1);
      words.forEach(w => {
        if (t.includes(w)) score += 5;
        if (a.includes(w)) score += 4;
        if (c.includes(w)) score += 3;
        if (d.includes(w)) score += 1;
      });

      return { book, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredBooks.length > 0) {
      replyIntro = `Dựa trên yêu cầu của bạn, mình đã tìm thấy ${Math.min(scoredBooks.length, 3)} tác phẩm được bạn đọc LibMaster đánh giá rất cao:`;
      finalBooks = scoredBooks.slice(0, 3).map(s => s.book);
    } else {
      // Fallback: Gợi ý các cuốn sách được đánh giá cao nhất thư viện
      replyIntro = `Thủ thư ảo LibMaster xin chào bạn! Dưới đây là những cuốn sách nổi bật và được yêu thích nhất trong tuần này tại thư viện, bạn cùng tham khảo nhé:`;
      finalBooks = eligibleBooks
        .filter(b => b.availableQuantity > 0)
        .sort((a, b) => (parseFloat(b.avgRating || 0) - parseFloat(a.avgRating || 0)))
        .slice(0, 3);
    }
  }

  // 5. Chuẩn hóa dữ liệu trả về cho Chat Widget
  const suggestions = finalBooks.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    category: b.category,
    coverImage: b.coverImage,
    avgRating: b.avgRating || 5.0,
    reviewCount: b.reviewCount || 1,
    availableQuantity: b.availableQuantity,
    ageRestriction: b.ageRestriction,
    reason: matchedIntent?.reason || 'Cuốn sách nổi bật với đánh giá xuất sắc từ cộng đồng độc giả.'
  }));

  return {
    reply: replyIntro,
    suggestions
  };
}

module.exports = {
  analyzeAndRecommend
};
