// ============================================
// VERİTABANI MİGRASYON SCRİPTİ
// allowed_role_id kolonunu kaldırır
// ============================================

const Database = require('better-sqlite3');
const path = require('path');

// Veritabanı dosyasının yolunu belirle
const dbPath = path.join(__dirname, '..', 'wordchain.db');

console.log('🔄 Veritabanı migrasyonu başlıyor...\n');
console.log(`📍 Veritabanı yolu: ${dbPath}\n`);

try {
  // Veritabanına bağlan
  const db = new Database(dbPath);

  // Mevcut tabloyu kontrol et
  const tableInfo = db.prepare("PRAGMA table_info(channel_config)").all();
  const hasAllowedRoleId = tableInfo.some(col => col.name === 'allowed_role_id');

  if (!hasAllowedRoleId) {
    console.log('✅ allowed_role_id kolonu zaten yok. Migrasyon gerekli değil.');
    db.close();
    process.exit(0);
  }

  console.log('📋 Mevcut tablo yapısı:');
  tableInfo.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });
  console.log('');

  // SQLite'da kolon silme işlemi için tabloyu yeniden oluşturmalıyız
  console.log('🔨 Yeni tablo yapısı oluşturuluyor...');

  // Transaction başlat
  db.exec('BEGIN TRANSACTION');

  try {
    // Yeni tablo oluştur (allowed_role_id olmadan)
    db.exec(`
      CREATE TABLE channel_config_new (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Verileri kopyala (allowed_role_id hariç)
    db.exec(`
      INSERT INTO channel_config_new (guild_id, channel_id, updated_at)
      SELECT guild_id, channel_id, updated_at
      FROM channel_config
    `);

    // Eski tabloyu sil
    db.exec('DROP TABLE channel_config');

    // Yeni tabloyu eski adıyla yeniden adlandır
    db.exec('ALTER TABLE channel_config_new RENAME TO channel_config');

    // Transaction'ı tamamla
    db.exec('COMMIT');

    console.log('✅ Migrasyon başarılı!\n');

    // Yeni tablo yapısını göster
    const newTableInfo = db.prepare("PRAGMA table_info(channel_config)").all();
    console.log('📋 Yeni tablo yapısı:');
    newTableInfo.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    console.log('');

    // Kayıt sayısını göster
    const count = db.prepare('SELECT COUNT(*) as count FROM channel_config').get();
    console.log(`📊 Korunan kayıt sayısı: ${count.count}`);

  } catch (error) {
    // Hata durumunda rollback
    db.exec('ROLLBACK');
    throw error;
  }

  db.close();
  console.log('\n🎉 Migrasyon tamamlandı!');

} catch (error) {
  console.error('❌ Migrasyon hatası:', error);
  process.exit(1);
}

