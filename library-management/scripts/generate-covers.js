/**
 * Script tạo ảnh bìa SVG chất lượng cao cho toàn bộ sách mới
 * Kích thước chuẩn tỉ lệ 2:3 (400 x 600 px)
 */
const fs = require('fs');
const path = require('path');

const coversDir = path.resolve(__dirname, '..', 'public', 'images', 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function generateSvgCover({
  title,
  subtitle = '',
  author,
  category,
  ageTag = 'ALL',
  primaryColor = '#4f46e5',
  secondaryColor = '#1e1b4b',
  accentColor = '#f59e0b',
  iconSvg = '',
  patternType = 'circles'
}) {
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safeAuthor = escapeXml(author);
  const safeCategory = escapeXml(category.toUpperCase());
  const safeAge = escapeXml(ageTag);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>

    <!-- Spine Shadow -->
    <linearGradient id="spineShadow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.6"/>
      <stop offset="3%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="6%" stop-color="#000000" stop-opacity="0.25"/>
      <stop offset="10%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>

    <!-- Border highlight -->
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>

    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Base Background -->
  <rect width="400" height="600" fill="url(#bgGrad)" rx="8"/>

  <!-- Decorative Pattern Background -->
  <g opacity="0.08">
    <circle cx="200" cy="240" r="160" fill="#fff" />
    <circle cx="200" cy="240" r="120" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6,6" />
    <circle cx="200" cy="240" r="80" fill="none" stroke="#fff" stroke-width="1.5" />
    <path d="M 0,100 L 400,500 M 0,200 L 400,600" stroke="#fff" stroke-width="1" />
  </g>

  <!-- Accent Glow -->
  <circle cx="320" cy="120" r="140" fill="${accentColor}" opacity="0.15" />
  <circle cx="80" cy="460" r="120" fill="${accentColor}" opacity="0.12" />

  <!-- Top Category Ribbon -->
  <g transform="translate(30, 36)">
    <rect width="180" height="26" rx="6" fill="#000000" fill-opacity="0.35" />
    <text x="12" y="17" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1.5">
      ${safeCategory}
    </text>
  </g>

  <!-- Age Restriction Tag -->
  <g transform="translate(320, 36)">
    <rect width="50" height="26" rx="6" fill="${safeAge === '18+' ? '#ef4444' : (safeAge === 'KIDS' ? '#f59e0b' : '#10b981')}" />
    <text x="25" y="17" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" text-anchor="middle">
      ${safeAge}
    </text>
  </g>

  <!-- Center Artwork / Icon Container -->
  <g transform="translate(200, 220)" filter="url(#dropShadow)">
    <circle cx="0" cy="0" r="68" fill="#ffffff" fill-opacity="0.12" stroke="${accentColor}" stroke-width="2.5" />
    <circle cx="0" cy="0" r="54" fill="#ffffff" fill-opacity="0.06" />
    ${iconSvg}
  </g>

  <!-- Decorative Divider Line -->
  <line x1="60" y1="330" x2="340" y2="330" stroke="${accentColor}" stroke-width="2" opacity="0.8" />
  <circle cx="200" cy="330" r="4" fill="${accentColor}" />

  <!-- Title & Subtitle Section -->
  <g transform="translate(200, 375)" text-anchor="middle" filter="url(#dropShadow)">
    <!-- Main Title -->
    <text x="0" y="0" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" letter-spacing="0.5">
      ${safeTitle}
    </text>
    ${safeSubtitle ? `
    <text x="0" y="28" fill="${accentColor}" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" opacity="0.95">
      ${safeSubtitle}
    </text>` : ''}
  </g>

  <!-- Author Section -->
  <g transform="translate(200, 480)" text-anchor="middle">
    <rect x="-120" y="-18" width="240" height="32" rx="16" fill="#000000" fill-opacity="0.3" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>
    <text x="0" y="3" fill="#e2e8f0" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">
      ✍ ${safeAuthor}
    </text>
  </g>

  <!-- Bottom Publisher Bar -->
  <g transform="translate(0, 560)">
    <rect width="400" height="40" fill="#000000" fill-opacity="0.45" />
    <line x1="0" y1="0" x2="400" y2="0" stroke="${accentColor}" stroke-width="1.5" opacity="0.6"/>
    <text x="200" y="24" fill="#cbd5e1" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="2" text-anchor="middle">
      LIBMASTER CLASSIC COLLECTION
    </text>
  </g>

  <!-- Book Spine 3D Effect Overlay -->
  <rect width="400" height="600" fill="url(#spineShadow)" rx="8" pointer-events="none" />
  <rect width="400" height="600" fill="url(#glowGrad)" rx="8" pointer-events="none" />
</svg>`;
}

// Danh sách các bìa cần tạo
const booksToGenerate = [
  {
    fileName: 'doraemon.svg',
    title: 'DORAEMON',
    subtitle: 'Tập 1: Chú Mèo Máy Kỳ Diệu',
    author: 'Fujiko F. Fujio',
    category: 'Manga / Truyện Tranh',
    ageTag: 'KIDS',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    accentColor: '#facc15',
    iconSvg: `
      <!-- Doraemon bell / pocket icon -->
      <circle cx="0" cy="-6" r="32" fill="#38bdf8"/>
      <circle cx="-10" cy="-14" r="8" fill="#ffffff"/>
      <circle cx="10" cy="-14" r="8" fill="#ffffff"/>
      <circle cx="-8" cy="-14" r="3.5" fill="#0f172a"/>
      <circle cx="8" cy="-14" r="3.5" fill="#0f172a"/>
      <circle cx="0" cy="-6" r="5" fill="#ef4444"/>
      <path d="M -16,6 Q 0,22 16,6" stroke="#0f172a" stroke-width="3" fill="none"/>
      <circle cx="0" cy="24" r="8" fill="#eab308" stroke="#0f172a" stroke-width="1.5"/>
    `
  },
  {
    fileName: 'conan.svg',
    title: 'CONAN',
    subtitle: 'Tập 1: Thám Tử Lừng Danh',
    author: 'Gosho Aoyama',
    category: 'Manga Trinh Thám',
    ageTag: 'ALL',
    primaryColor: '#1e3a8a',
    secondaryColor: '#0f172a',
    accentColor: '#ef4444',
    iconSvg: `
      <!-- Conan glasses and bowtie -->
      <rect x="-30" y="-18" width="24" height="20" rx="4" fill="none" stroke="#ffffff" stroke-width="3"/>
      <rect x="6" y="-18" width="24" height="20" rx="4" fill="none" stroke="#ffffff" stroke-width="3"/>
      <line x1="-6" y1="-8" x2="6" y2="-8" stroke="#ffffff" stroke-width="3"/>
      <!-- Red bowtie -->
      <polygon points="-18,14 -2,6 -2,22" fill="#ef4444"/>
      <polygon points="18,14 2,6 2,22" fill="#ef4444"/>
      <circle cx="0" cy="14" r="5" fill="#dc2626"/>
    `
  },
  {
    fileName: 'dragon-ball.svg',
    title: 'DRAGON BALL',
    subtitle: '7 Viên Ngọc Rồng - Tập 1',
    author: 'Akira Toriyama',
    category: 'Manga Phiêu Lưu',
    ageTag: 'ALL',
    primaryColor: '#ea580c',
    secondaryColor: '#431407',
    accentColor: '#facc15',
    iconSvg: `
      <!-- 4-star Dragon Ball -->
      <circle cx="0" cy="0" r="36" fill="#f59e0b" stroke="#facc15" stroke-width="2"/>
      <circle cx="-10" cy="-10" r="4" fill="#dc2626"/>
      <circle cx="10" cy="-10" r="4" fill="#dc2626"/>
      <circle cx="-10" cy="10" r="4" fill="#dc2626"/>
      <circle cx="10" cy="10" r="4" fill="#dc2626"/>
    `
  },
  {
    fileName: 'one-piece.svg',
    title: 'ONE PIECE',
    subtitle: 'Đảo Hải Tặc - Tập 1',
    author: 'Eiichiro Oda',
    category: 'Manga Phiêu Lưu',
    ageTag: 'ALL',
    primaryColor: '#0369a1',
    secondaryColor: '#082f49',
    accentColor: '#eab308',
    iconSvg: `
      <!-- Straw Hat Jolly Roger -->
      <ellipse cx="0" cy="-14" rx="34" ry="10" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
      <path d="M -16,-14 Q 0,-34 16,-14" fill="#eab308"/>
      <rect x="-16" y="-16" width="32" height="4" fill="#dc2626"/>
      <!-- Skull -->
      <circle cx="0" cy="6" r="16" fill="#ffffff"/>
      <circle cx="-6" cy="4" r="3.5" fill="#0f172a"/>
      <circle cx="6" cy="4" r="3.5" fill="#0f172a"/>
      <rect x="-6" y="16" width="12" height="6" rx="2" fill="#ffffff"/>
      <line x1="-2" y1="16" x2="-2" y2="22" stroke="#0f172a"/>
      <line x1="2" y1="16" x2="2" y2="22" stroke="#0f172a"/>
    `
  },
  {
    fileName: 'naruto.svg',
    title: 'NARUTO',
    subtitle: 'Huyền Thoại Ninja Làng Lá',
    author: 'Masashi Kishimoto',
    category: 'Manga Hành Động',
    ageTag: 'ALL',
    primaryColor: '#f97316',
    secondaryColor: '#1c1917',
    accentColor: '#38bdf8',
    iconSvg: `
      <!-- Ninja headband with leaf symbol -->
      <rect x="-34" y="-14" width="68" height="28" rx="4" fill="#94a3b8" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="-28" cy="0" r="2" fill="#475569"/>
      <circle cx="28" cy="0" r="2" fill="#475569"/>
      <!-- Leaf emblem spiral -->
      <path d="M -8,-4 Q 0,-12 8,-2 Q 12,6 2,8 Q -10,8 -6,-2" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
    `
  },
  {
    fileName: 'than-dong-dat-viet.svg',
    title: 'THẦN ĐỒNG ĐẤT VIỆT',
    subtitle: 'Trạng Tí Xuất Quân - Tập 1',
    author: 'Lê Linh',
    category: 'Truyện Tranh Thiếu Nhi',
    ageTag: 'KIDS',
    primaryColor: '#059669',
    secondaryColor: '#064e3b',
    accentColor: '#fde047',
    iconSvg: `
      <!-- Scroll & Pen motif -->
      <rect x="-24" y="-16" width="48" height="32" rx="4" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      <line x1="-16" y1="-6" x2="16" y2="-6" stroke="#ca8a04" stroke-width="2"/>
      <line x1="-16" y1="2" x2="16" y2="2" stroke="#ca8a04" stroke-width="2"/>
      <line x1="-16" y1="10" x2="6" y2="10" stroke="#ca8a04" stroke-width="2"/>
      <polygon points="12,-20 22,-30 28,-24 18,-14" fill="#ef4444"/>
    `
  },
  {
    fileName: 'ty-quay.svg',
    title: 'TÝ QUẬY',
    subtitle: 'Tuổi Thơ Học Trò - Tập 1',
    author: 'Đào Hải',
    category: 'Truyện Tranh Thiếu Nhi',
    ageTag: 'KIDS',
    primaryColor: '#0284c7',
    secondaryColor: '#1e293b',
    accentColor: '#f43f5e',
    iconSvg: `
      <!-- Paper plane & Star -->
      <polygon points="-24,14 26,-18 -4,2 6,18" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5"/>
      <polygon points="18,12 22,2 26,12 36,12 28,18 31,28 22,22 13,28 16,18 8,12" fill="#facc15"/>
    `
  },
  {
    fileName: 'shin-cau-be-but-chi.svg',
    title: 'SHIN CẬU BÉ BÚT CHÌ',
    subtitle: 'Gia Đình Vui Nhộn - Tập 1',
    author: 'Yoshito Usui',
    category: 'Manga Hài Hước',
    ageTag: 'ALL',
    primaryColor: '#dc2626',
    secondaryColor: '#450a0a',
    accentColor: '#facc15',
    iconSvg: `
      <!-- Yellow shorts & Crayon -->
      <circle cx="0" cy="-4" r="26" fill="#fecdd3"/>
      <path d="M -16,-12 Q -8,-20 0,-12" stroke="#000" stroke-width="4" fill="none"/>
      <path d="M 0,-12 Q 8,-20 16,-12" stroke="#000" stroke-width="4" fill="none"/>
      <circle cx="-8" cy="-4" r="4" fill="#000"/>
      <circle cx="8" cy="-4" r="4" fill="#000"/>
      <ellipse cx="-16" cy="4" rx="5" ry="3" fill="#f43f5e"/>
      <ellipse cx="16" cy="4" rx="5" ry="3" fill="#f43f5e"/>
    `
  },
  {
    fileName: 'attack-on-titan.svg',
    title: 'ATTACK ON TITAN',
    subtitle: 'Đại Chiến Người Khổng Lồ - Tập 1',
    author: 'Hajime Isayama',
    category: 'Manga Kinh Dị / Hành Động',
    ageTag: '18+',
    primaryColor: '#7f1d1d',
    secondaryColor: '#18181b',
    accentColor: '#e2e8f0',
    iconSvg: `
      <!-- Crossed Blades & Survey Corp wings motif -->
      <line x1="-24" y1="-24" x2="24" y2="24" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>
      <line x1="24" y1="-24" x2="-24" y2="24" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>
      <rect x="-8" y="-8" width="16" height="16" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
    `
  },
  {
    fileName: 'death-note.svg',
    title: 'DEATH NOTE',
    subtitle: 'Cuốn Sổ Tử Thần - Tập 1',
    author: 'Tsugumi Ohba & T. Obata',
    category: 'Manga Tâm Lý / Đấu Trí',
    ageTag: '18+',
    primaryColor: '#18181b',
    secondaryColor: '#09090b',
    accentColor: '#94a3b8',
    iconSvg: `
      <!-- Gothic Notebook & Apple -->
      <rect x="-24" y="-28" width="48" height="56" rx="3" fill="#09090b" stroke="#71717a" stroke-width="2"/>
      <text x="0" y="4" fill="#ffffff" font-family="'Times New Roman', serif" font-size="16" font-weight="900" text-anchor="middle">DN</text>
      <!-- Shinigami Apple -->
      <circle cx="20" cy="18" r="9" fill="#dc2626"/>
      <path d="M 20,9 Q 22,6 24,6" stroke="#15803d" stroke-width="2" fill="none"/>
    `
  },
  {
    fileName: 'gintama.svg',
    title: 'GINTAMA',
    subtitle: 'Linh Hồn Bạc - Tiệm Vạn Năng',
    author: 'Hideaki Sorachi',
    category: 'Manga Hài Hước',
    ageTag: 'ALL',
    primaryColor: '#475569',
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    iconSvg: `
      <!-- Wooden sword Lake Toya motif -->
      <line x1="-26" y1="-26" x2="26" y2="26" stroke="#ca8a04" stroke-width="5" stroke-linecap="round"/>
      <rect x="18" y="18" width="10" height="10" fill="#991b1b"/>
      <circle cx="-16" cy="16" r="14" fill="#38bdf8" opacity="0.7"/>
    `
  },
  {
    fileName: 'harry-potter.svg',
    title: 'HARRY POTTER',
    subtitle: 'Và Hòn Đá Phù Thủy',
    author: 'J.K. Rowling',
    category: 'Văn Học Giả Tưởng',
    ageTag: 'KIDS',
    primaryColor: '#881337',
    secondaryColor: '#1c1917',
    accentColor: '#facc15',
    iconSvg: `
      <!-- Glasses and Lightning bolt -->
      <circle cx="-14" cy="-2" r="14" fill="none" stroke="#facc15" stroke-width="2.5"/>
      <circle cx="14" cy="-2" r="14" fill="none" stroke="#facc15" stroke-width="2.5"/>
      <line x1="0" y1="-2" x2="0" y2="-2" stroke="#facc15" stroke-width="2.5"/>
      <polygon points="-2,-24 4,-14 -1,-14 3,-4 -4,-12 1,-12" fill="#facc15"/>
    `
  },
  {
    fileName: 'chua-te-nhung-chiec-nhan.svg',
    title: 'CHÚA TỂ NHỮNG CHIẾC NHẪN',
    subtitle: 'Đoàn Hộ Nhẫn (The Fellowship)',
    author: 'J.R.R. Tolkien',
    category: 'Văn Học Kỳ Ảo',
    ageTag: 'ALL',
    primaryColor: '#14532d',
    secondaryColor: '#052e16',
    accentColor: '#eab308',
    iconSvg: `
      <!-- The One Ring glowing -->
      <circle cx="0" cy="0" r="28" fill="none" stroke="#eab308" stroke-width="6"/>
      <circle cx="0" cy="0" r="28" fill="none" stroke="#facc15" stroke-width="2"/>
      <circle cx="0" cy="0" r="16" fill="#eab308" opacity="0.15"/>
    `
  },
  {
    fileName: 'tam-the.svg',
    title: 'TAM THỂ',
    subtitle: 'The Three-Body Problem',
    author: 'Lưu Từ Hân',
    category: 'Khoa Học Viễn Tưởng',
    ageTag: 'ALL',
    primaryColor: '#0f172a',
    secondaryColor: '#020617',
    accentColor: '#06b6d4',
    iconSvg: `
      <!-- Three celestial bodies orbiting -->
      <circle cx="-16" cy="-14" r="12" fill="#06b6d4"/>
      <circle cx="20" cy="-6" r="10" fill="#38bdf8"/>
      <circle cx="-4" cy="20" r="14" fill="#818cf8"/>
      <path d="M -16,-14 Q 10,10 20,-6" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3" fill="none"/>
    `
  },
  {
    fileName: 'dune-xu-cat.svg',
    title: 'DUNE: XỨ CÁT',
    subtitle: 'Biên Niên Sử Hành Tinh Sa Mạc',
    author: 'Frank Herbert',
    category: 'Khoa Học Viễn Tưởng',
    ageTag: 'ALL',
    primaryColor: '#b45309',
    secondaryColor: '#451a03',
    accentColor: '#fde047',
    iconSvg: `
      <!-- Sand Dunes & Two Moons -->
      <circle cx="-14" cy="-16" r="8" fill="#fef08a"/>
      <circle cx="14" cy="-22" r="5" fill="#fef08a"/>
      <path d="M -30,16 Q -10,-4 10,16 Q 24,6 30,16" fill="none" stroke="#fde047" stroke-width="3"/>
    `
  },
  {
    fileName: 'sherlock-holmes.svg',
    title: 'SHERLOCK HOLMES',
    subtitle: 'Tuyển Tập Án Mạng Phố Baker',
    author: 'Arthur Conan Doyle',
    category: 'Văn Học Trinh Thám',
    ageTag: 'ALL',
    primaryColor: '#334155',
    secondaryColor: '#0f172a',
    accentColor: '#fbbf24',
    iconSvg: `
      <!-- Pipe & Magnifying glass -->
      <circle cx="-4" cy="-4" r="18" fill="none" stroke="#fbbf24" stroke-width="3"/>
      <line x1="10" y1="10" x2="26" y2="26" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
      <!-- Pipe stem -->
      <path d="M -20,18 Q -10,24 0,14" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
    `
  },
  {
    fileName: 'phia-sau-nghi-can-x.svg',
    title: 'PHÍA SAU NGHI CAN X',
    subtitle: 'Tuyệt Tác Trinh Thám Đấu Trí',
    author: 'Higashino Keigo',
    category: 'Trinh Thám Đấu Trí',
    ageTag: 'ALL',
    primaryColor: '#1e293b',
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    iconSvg: `
      <!-- Math symbol 'X' and balance -->
      <line x1="-18" y1="-18" x2="18" y2="18" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <line x1="18" y1="-18" x2="-18" y2="18" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="26" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
    `
  },
  {
    fileName: 'muoi-nguoi-da-den-nho.svg',
    title: 'VÀ RỒI CHẲNG CÒN AI',
    subtitle: 'Mười Người Da Đen Nhỏ',
    author: 'Agatha Christie',
    category: 'Văn Học Trinh Thám',
    ageTag: 'ALL',
    primaryColor: '#4c0519',
    secondaryColor: '#18181b',
    accentColor: '#fb7185',
    iconSvg: `
      <!-- Clock & Silhouette figure -->
      <circle cx="0" cy="0" r="28" fill="none" stroke="#fb7185" stroke-width="2"/>
      <line x1="0" y1="0" x2="0" y2="-16" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="12" y2="4" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="3" fill="#fb7185"/>
    `
  },
  {
    fileName: 'bach-da-hanh.svg',
    title: 'BẠCH DẠ HÀNH',
    subtitle: 'Hành Trình Dưới Trời Đêm',
    author: 'Higashino Keigo',
    category: 'Văn Học Tâm Lý',
    ageTag: '18+',
    primaryColor: '#3b0764',
    secondaryColor: '#0f172a',
    accentColor: '#c084fc',
    iconSvg: `
      <!-- Dark Sun & Paper cutout child motif -->
      <circle cx="0" cy="0" r="24" fill="#0f172a" stroke="#c084fc" stroke-width="2"/>
      <path d="M -8,-6 L 0,-14 L 8,-6 L 0,2 Z" fill="#c084fc"/>
    `
  },
  {
    fileName: 'cay-cam-ngot-cua-toi.svg',
    title: 'CÂY CAM NGỌT CỦA TÔI',
    subtitle: 'Khúc Ca Tuổi Thơ Bất Hủ',
    author: 'José Mauro de Vasconcelos',
    category: 'Văn Học Kinh Điển',
    ageTag: 'ALL',
    primaryColor: '#c2410c',
    secondaryColor: '#431407',
    accentColor: '#fde047',
    iconSvg: `
      <!-- Orange tree / Orange fruit with leaves -->
      <circle cx="0" cy="4" r="24" fill="#ea580c"/>
      <ellipse cx="-8" cy="-18" rx="10" ry="5" fill="#16a34a" transform="rotate(-20 -8 -18)"/>
      <ellipse cx="8" cy="-18" rx="10" ry="5" fill="#15803d" transform="rotate(20 8 -18)"/>
      <circle cx="-6" cy="0" r="3" fill="#fed7aa"/>
    `
  },
  {
    fileName: 'hieu-ve-trai-tim.svg',
    title: 'HIỂU VỀ TRÁI TIM',
    subtitle: 'Nghệ Thuật Sống Bình Yên',
    author: 'Thích Minh Niệm',
    category: 'Tâm Lý - Kỹ Năng',
    ageTag: 'ALL',
    primaryColor: '#065f46',
    secondaryColor: '#022c22',
    accentColor: '#f472b6',
    iconSvg: `
      <!-- Heart & Lotus petal -->
      <path d="M 0,20 C -24,4 -24,-14 0,-18 C 24,-14 24,4 0,20 Z" fill="#f43f5e" opacity="0.9"/>
      <circle cx="0" cy="-4" r="6" fill="#fef08a"/>
    `
  },
  {
    fileName: 'cha-giau-cha-ngheo.svg',
    title: 'CHA GIÀU CHA NGHÈO',
    subtitle: 'Dạy Con Làm Giàu Để Tự Do',
    author: 'Robert T. Kiyosaki',
    category: 'Kinh Tế - Tài Chính',
    ageTag: 'ALL',
    primaryColor: '#047857',
    secondaryColor: '#064e3b',
    accentColor: '#facc15',
    iconSvg: `
      <!-- Gold Coin & Growth chart -->
      <circle cx="0" cy="0" r="26" fill="#eab308" stroke="#fef08a" stroke-width="2"/>
      <text x="0" y="8" fill="#78350f" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="900" text-anchor="middle">$</text>
    `
  },
  {
    fileName: 'tam-ly-hoc-ve-tien.svg',
    title: 'TÂM LÝ HỌC VỀ TIỀN',
    subtitle: 'Bí Mật Thịnh Vượng & Hạnh Phúc',
    author: 'Morgan Housel',
    category: 'Kinh Tế - Tâm Lý',
    ageTag: 'ALL',
    primaryColor: '#1e3a8a',
    secondaryColor: '#0f172a',
    accentColor: '#10b981',
    iconSvg: `
      <!-- Brain & Dollar / Coin balance -->
      <circle cx="-10" cy="-6" r="14" fill="#3b82f6" opacity="0.8"/>
      <circle cx="10" cy="-6" r="14" fill="#10b981" opacity="0.8"/>
      <circle cx="0" cy="10" r="12" fill="#facc15"/>
      <text x="0" y="15" fill="#78350f" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="900" text-anchor="middle">$</text>
    `
  },
  {
    fileName: 'khong-gia-dinh.svg',
    title: 'KHÔNG GIA ĐÌNH',
    subtitle: 'Hành Trình Của Chú Bé Rémi',
    author: 'Hector Malot',
    category: 'Văn Học Thiếu Nhi',
    ageTag: 'KIDS',
    primaryColor: '#4338ca',
    secondaryColor: '#1e1b4b',
    accentColor: '#fbbf24',
    iconSvg: `
      <!-- Violin & Musical note -->
      <ellipse cx="0" cy="4" rx="16" ry="22" fill="#d97706" stroke="#b45309" stroke-width="2"/>
      <circle cx="0" cy="4" r="5" fill="#1e1b4b"/>
      <line x1="0" y1="-26" x2="0" y2="24" stroke="#ffffff" stroke-width="1.5"/>
    `
  },
  {
    fileName: 'luoc-su-thoi-gian.svg',
    title: 'LƯỢC SỬ THỜI GIAN',
    subtitle: 'Từ Vụ Nổ Big Bang Đến Lỗ Đen',
    author: 'Stephen Hawking',
    category: 'Khoa Học - Vũ Trụ',
    ageTag: 'ALL',
    primaryColor: '#312e81',
    secondaryColor: '#090d16',
    accentColor: '#a855f7',
    iconSvg: `
      <!-- Galaxy spiral / Cosmos clock -->
      <circle cx="0" cy="0" r="28" fill="none" stroke="#a855f7" stroke-width="2"/>
      <circle cx="0" cy="0" r="16" fill="#090d16" stroke="#c084fc" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="8" fill="#000000"/>
    `
  },
  {
    fileName: 'lap-trinh-vien-dac-luc.svg',
    title: 'THE PRAGMATIC PROGRAMMER',
    subtitle: 'Lập Trình Viên Đắc Lực',
    author: 'David Thomas & Andrew Hunt',
    category: 'Công Nghệ Thông Tin',
    ageTag: 'ALL',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    accentColor: '#10b981',
    iconSvg: `
      <!-- Code brackets </ > and gear -->
      <text x="-16" y="8" fill="#10b981" font-family="'Courier New', monospace" font-size="28" font-weight="900">&lt;</text>
      <text x="6" y="8" fill="#38bdf8" font-family="'Courier New', monospace" font-size="28" font-weight="900">&gt;</text>
      <circle cx="0" cy="0" r="24" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4"/>
    `
  }
];

let count = 0;
for (const b of booksToGenerate) {
  const svgContent = generateSvgCover(b);
  const filePath = path.join(coversDir, b.fileName);
  fs.writeFileSync(filePath, svgContent, 'utf8');
  count++;
}

console.log(`✅ Đã tạo thành công ${count} ảnh bìa sách vector SVG đứng 2:3 tỉ lệ chuẩn tại ${coversDir}`);
