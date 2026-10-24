const { dbAsync } = require('../config/db');

async function updateDb() {
  const result = await dbAsync.run("UPDATE books SET coverImage = REPLACE(coverImage, '.svg', '.jpg') WHERE coverImage LIKE '%.svg'");
  console.log('✅ Đã cập nhật thành công số sách:', result.changes);

  const sample = await dbAsync.all("SELECT id, title, category, coverImage FROM books ORDER BY id DESC LIMIT 10");
  console.log('10 sách mới nhất:', sample);
}

updateDb().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
