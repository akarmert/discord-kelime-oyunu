// ============================================
// VERİTABANI YÖNETİMİ
// SQLite veritabanı işlemleri
// ============================================

const Database = require('better-sqlite3');
const path = require('path');

// Veritabanı dosyasının yolunu belirle (proje kök dizininde)
const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

// WAL (Write-Ahead Logging) modunu aktifleştir
// Bu mod performansı artırır ve eşzamanlı okuma/yazma işlemlerini iyileştirir
db.pragma('journal_mode = WAL');

// ============================================
// VERİTABANI ŞEMASI OLUŞTURMA
// ============================================

/**
 * Veritabanı tablolarını ve indekslerini oluşturur
 * İlk kurulumda veya tablo yoksa çalışır
 */
function initializeDatabase() {
  console.log('🔧 Veritabanı şeması oluşturuluyor...');

  // WORDS TABLOSU - Tüm Türkçe kelimeleri saklar
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Benzersiz kelime ID'si
      word TEXT NOT NULL UNIQUE,              -- Kelime (benzersiz)
      first_letter TEXT NOT NULL,             -- İlk harf (hızlı arama için)
      last_letter TEXT NOT NULL,              -- Son harf (oyun mantığı için)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Eklenme tarihi
    )
  `);

  // İndeksler - Sorgu performansını artırır
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_words_first_letter ON words(first_letter);
    CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
  `);
  
  // CHANNEL_CONFIG TABLOSU - Her sunucu için oyun kanalını saklar
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_config (
      guild_id TEXT PRIMARY KEY,      -- Discord sunucu ID'si
      channel_id TEXT NOT NULL,       -- Oyun kanalı ID'si
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Son güncelleme
    )
  `);

  // GAME_STATE TABLOSU - Her sunucu için aktif oyun durumunu saklar
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      guild_id TEXT PRIMARY KEY,      -- Discord sunucu ID'si
      is_active INTEGER DEFAULT 0,    -- Oyun aktif mi? (0=hayır, 1=evet)
      current_word TEXT,              -- Şu anki kelime
      last_letter TEXT,               -- Beklenen ilk harf
      started_at DATETIME,            -- Oyun başlangıç zamanı
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Son güncelleme
    )
  `);

  // USED_WORDS TABLOSU - Oyunda kullanılan kelimeleri saklar
  db.exec(`
    CREATE TABLE IF NOT EXISTS used_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Benzersiz kayıt ID'si
      guild_id TEXT NOT NULL,                -- Discord sunucu ID'si
      word TEXT NOT NULL,                    -- Kullanılan kelime
      user_id TEXT NOT NULL,                 -- Kelimeyi kullanan kullanıcı ID'si
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Kullanım zamanı
    )
  `);

  // Kullanılan kelimeler için indeksler
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_used_words_guild ON used_words(guild_id);
    CREATE INDEX IF NOT EXISTS idx_used_words_word ON used_words(guild_id, word);
  `);

  console.log('✅ Veritabanı şeması hazır');
}

// ============================================
// KELİME İŞLEMLERİ
// ============================================

/**
 * Veritabanına yeni kelime ekler
 * @param {string} word - Eklenecek kelime
 * @returns {boolean} - Başarılı ise true
 */
function insertWord(word) {
  const cleanWord = word.trim().toLowerCase();

  // Boş kelime kontrolü
  if (!cleanWord) return false;

  // İlk ve son harfi al
  const firstLetter = cleanWord.charAt(0);
  const lastLetter = cleanWord.charAt(cleanWord.length - 1);

  try {
    // INSERT OR IGNORE: Kelime zaten varsa hata vermez
    const stmt = db.prepare('INSERT OR IGNORE INTO words (word, first_letter, last_letter) VALUES (?, ?, ?)');
    stmt.run(cleanWord, firstLetter, lastLetter);
    return true;
  } catch (error) {
    console.error('Kelime eklenirken hata:', error);
    return false;
  }
}

/**
 * Kelimenin veritabanında olup olmadığını kontrol eder
 * @param {string} word - Kontrol edilecek kelime
 * @returns {boolean} - Kelime varsa true
 */
function wordExists(word) {
  const cleanWord = word.trim().toLowerCase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM words WHERE word = ?');
  const result = stmt.get(cleanWord);
  return result.count > 0;
}

/**
 * Belirli bir harfle başlayan rastgele kelime getirir
 * @param {string} letter - Aranan ilk harf
 * @returns {string|null} - Bulunan kelime veya null
 */
function getRandomWordStartingWith(letter) {
  const stmt = db.prepare('SELECT word FROM words WHERE first_letter = ? ORDER BY RANDOM() LIMIT 1');
  const result = stmt.get(letter.toLowerCase());
  return result ? result.word : null;
}

/**
 * Tamamen rastgele bir kelime getirir
 * @returns {string|null} - Rastgele kelime veya null
 */
function getRandomWord() {
  const stmt = db.prepare('SELECT word FROM words ORDER BY RANDOM() LIMIT 1');
  const result = stmt.get();
  return result ? result.word : null;
}

// ============================================
// KANAL AYARLARI
// ============================================

/**
 * Sunucu için oyun kanalını ayarlar
 * @param {string} guildId - Discord sunucu ID'si
 * @param {string} channelId - Kanal ID'si
 */
function setGameChannel(guildId, channelId) {
  const stmt = db.prepare(`
    INSERT INTO channel_config (guild_id, channel_id, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?, updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(guildId, channelId, channelId);
}

/**
 * Sunucunun oyun kanalını getirir
 * @param {string} guildId - Discord sunucu ID'si
 * @returns {string|null} - Kanal ID'si veya null
 */
function getGameChannel(guildId) {
  const stmt = db.prepare('SELECT channel_id FROM channel_config WHERE guild_id = ?');
  const result = stmt.get(guildId);
  return result ? result.channel_id : null;
}

// ============================================
// OYUN DURUMU YÖNETİMİ
// ============================================

/**
 * Sunucu için oyunu başlatır
 * @param {string} guildId - Discord sunucu ID'si
 * @param {string} initialWord - Başlangıç kelimesi
 */
function startGame(guildId, initialWord) {
  const lastLetter = initialWord.charAt(initialWord.length - 1);

  // Oyun durumunu oluştur veya güncelle
  const stmt = db.prepare(`
    INSERT INTO game_state (guild_id, is_active, current_word, last_letter, started_at, updated_at)
    VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET
      is_active = 1,
      current_word = ?,
      last_letter = ?,
      started_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(guildId, initialWord, lastLetter, initialWord, lastLetter);

  // Önceki oyundan kalan kullanılmış kelimeleri temizle
  const clearStmt = db.prepare('DELETE FROM used_words WHERE guild_id = ?');
  clearStmt.run(guildId);

  // Başlangıç kelimesini kullanılmış kelimeler listesine ekle
  addUsedWord(guildId, initialWord, 'bot');
}

/**
 * Sunucu için oyunu durdurur
 * @param {string} guildId - Discord sunucu ID'si
 */
function stopGame(guildId) {
  const stmt = db.prepare(`
    UPDATE game_state
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);
  stmt.run(guildId);
}

/**
 * Sunucunun oyun durumunu getirir
 * @param {string} guildId - Discord sunucu ID'si
 * @returns {Object|null} - Oyun durumu veya null
 */
function getGameState(guildId) {
  const stmt = db.prepare('SELECT * FROM game_state WHERE guild_id = ?');
  return stmt.get(guildId);
}

/**
 * Oyundaki mevcut kelimeyi günceller
 * @param {string} guildId - Discord sunucu ID'si
 * @param {string} word - Yeni kelime
 */
function updateCurrentWord(guildId, word) {
  const lastLetter = word.charAt(word.length - 1);

  const stmt = db.prepare(`
    UPDATE game_state
    SET current_word = ?, last_letter = ?, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ?
  `);

  stmt.run(word, lastLetter, guildId);
}

// ============================================
// KULLANILMIŞ KELİME YÖNETİMİ
// ============================================

/**
 * Kullanılmış kelime listesine ekler
 * @param {string} guildId - Discord sunucu ID'si
 * @param {string} word - Kullanılan kelime
 * @param {string} userId - Kullanıcı ID'si
 */
function addUsedWord(guildId, word, userId) {
  const stmt = db.prepare('INSERT INTO used_words (guild_id, word, user_id) VALUES (?, ?, ?)');
  stmt.run(guildId, word.toLowerCase(), userId);
}

/**
 * Kelimenin daha önce kullanılıp kullanılmadığını kontrol eder
 * @param {string} guildId - Discord sunucu ID'si
 * @param {string} word - Kontrol edilecek kelime
 * @returns {boolean} - Kullanıldıysa true
 */
function isWordUsed(guildId, word) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM used_words WHERE guild_id = ? AND word = ?');
  const result = stmt.get(guildId, word.toLowerCase());
  return result.count > 0;
}

// ============================================
// İSTATİSTİK FONKSİYONLARI
// ============================================

/**
 * Veritabanındaki toplam kelime sayısını getirir
 * @returns {number} - Toplam kelime sayısı
 */
function getWordCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM words');
  const result = stmt.get();
  return result.count;
}

// ============================================
// MODÜL EXPORT
// ============================================

// Tüm fonksiyonları dışa aktar
module.exports = {
  db,                          // Veritabanı nesnesi
  initializeDatabase,          // Veritabanı şeması oluştur
  insertWord,                  // Kelime ekle
  wordExists,                  // Kelime var mı kontrol et
  getRandomWord,               // Rastgele kelime getir
  getRandomWordStartingWith,   // Belirli harfle başlayan rastgele kelime
  setGameChannel,              // Oyun kanalını ayarla
  getGameChannel,              // Oyun kanalını getir
  startGame,                   // Oyunu başlat
  stopGame,                    // Oyunu durdur
  getGameState,                // Oyun durumunu getir
  updateCurrentWord,           // Mevcut kelimeyi güncelle
  addUsedWord,                 // Kullanılmış kelime ekle
  isWordUsed,                  // Kelime kullanıldı mı kontrol et
  getWordCount,                // Toplam kelime sayısı
};

