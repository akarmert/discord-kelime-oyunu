// ============================================
// KELİME ZİNCİRİ OYUN MANTIĞI
// Kullanıcı mesajlarını kontrol eder ve oyunu yönetir
// ============================================

// Veritabanı fonksiyonlarını içe aktar
const {
  getGameChannel,      // Oyun kanalını getir
  getGameState,        // Oyun durumunu getir
  wordExists,          // Kelime var mı kontrol et
  isWordUsed,          // Kelime kullanıldı mı kontrol et
  updateCurrentWord,   // Mevcut kelimeyi güncelle
  addUsedWord,         // Kullanılmış kelime ekle
} = require('./database');

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

/**
 * Türkçe karakterleri normalize eder (küçük harf + boşluk temizleme)
 * @param {string} text - Normalize edilecek metin
 * @returns {string} - Normalize edilmiş metin
 */
function normalizeTurkish(text) {
  return text.toLowerCase().trim();
}

/**
 * Kelimenin son harfini getirir
 * @param {string} word - Kelime
 * @returns {string} - Son harf
 */
function getLastLetter(word) {
  const normalized = normalizeTurkish(word);
  return normalized.charAt(normalized.length - 1);
}

/**
 * Kelimenin ilk harfini getirir
 * @param {string} word - Kelime
 * @returns {string} - İlk harf
 */
function getFirstLetter(word) {
  const normalized = normalizeTurkish(word);
  return normalized.charAt(0);
}

/**
 * Kelimenin geçerli bir Türkçe kelime olup olmadığını kontrol eder
 * @param {string} word - Kontrol edilecek kelime
 * @returns {boolean} - Geçerliyse true
 */
function isValidTurkishWord(word) {
  const normalized = normalizeTurkish(word);

  // En az 2 karakter olmalı
  if (normalized.length < 2) {
    return false;
  }

  // Sadece Türkçe harfler içermeli (a-z, ç, ğ, ı, i, ö, ş, ü)
  const turkishPattern = /^[a-zçğıiöşü]+$/;
  return turkishPattern.test(normalized);
}

// ============================================
// ANA MESAJ İŞLEYİCİSİ
// ============================================

/**
 * Kullanıcı mesajlarını işler ve kelime zinciri oyununu yönetir
 * @param {Message} message - Discord mesaj objesi
 */
async function handleMessage(message) {
  try {
    // Sunucu ID'sini al
    const guildId = message.guild.id;

    // Bu sunucunun oyun kanalını kontrol et
    const gameChannelId = getGameChannel(guildId);

    // Eğer oyun kanalı ayarlanmamışsa veya mesaj farklı kanaldan geldiyse, yok say
    if (!gameChannelId || message.channel.id !== gameChannelId) {
      return;
    }

    // Oyun durumunu kontrol et
    const gameState = getGameState(guildId);

    // Oyun aktif değilse, yok say
    if (!gameState || !gameState.is_active) {
      return;
    }

    // Kullanıcının gönderdiği kelimeyi al ve normalize et
    const userWord = normalizeTurkish(message.content);

    // ============================================
    // 1. KONTROL: KELİME FORMATI
    // ============================================

    // Kelimenin geçerli Türkçe karakterler içerip içermediğini kontrol et
    if (!isValidTurkishWord(userWord)) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Geçersiz kelime formatı! Sadece Türkçe harfler kullanın.`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000); // 3 saniye sonra sil
      });
      return;
    }
    
    // ============================================
    // 2. KONTROL: KELİME VERİTABANINDA VAR MI?
    // ============================================

    // Kelimenin veritabanında olup olmadığını kontrol et
    if (!wordExists(userWord)) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Bu kelime veritabanında bulunamadı!`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }

    // ============================================
    // 3. KONTROL: KELİME DAHA ÖNCE KULLANILDI MI?
    // ============================================

    // Kelimenin bu oyunda daha önce kullanılıp kullanılmadığını kontrol et
    if (isWordUsed(guildId, userWord)) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Bu kelime daha önce kullanıldı!`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }

    // ============================================
    // 4. KONTROL: KELİME DOĞRU HARFLE BAŞLIYOR MU?
    // ============================================

    // Beklenen ilk harfi al (önceki kelimenin son harfi)
    const expectedLetter = gameState.last_letter;
    const firstLetter = getFirstLetter(userWord);

    // İlk harf kontrolü
    if (firstLetter !== expectedLetter) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Kelime **${expectedLetter.toUpperCase()}** harfi ile başlamalı!`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }

    // ============================================
    // KELİME GEÇERLİ! ✅
    // ============================================

    // Mesaja onay emojisi ekle
    await message.react('✅').catch(console.error);

    // Oyun durumunu güncelle
    updateCurrentWord(guildId, userWord);
    addUsedWord(guildId, userWord, message.author.id);

    // Sıradaki kelime için gereken harfi hesapla
    const lastLetter = getLastLetter(userWord);

    // Onay mesajı gönder
    await message.channel.send(`✅ **${userWord}** kelimesi kabul edildi! Sıradaki kelime **${lastLetter.toUpperCase()}** harfi ile başlamalı.`);

  } catch (error) {
    console.error('Mesaj işlenirken hata:', error);
  }
}

// ============================================
// İSTATİSTİK FONKSİYONLARI
// ============================================

/**
 * Sunucu için oyun istatistiklerini getirir
 * @param {string} guildId - Discord sunucu ID'si
 * @returns {Object} - İstatistik objesi (word_count, player_count)
 */
function getGameStats(guildId) {
  const { db } = require('./database');

  // Toplam kelime sayısı ve benzersiz oyuncu sayısını hesapla
  const stmt = db.prepare(`
    SELECT COUNT(*) as word_count, COUNT(DISTINCT user_id) as player_count
    FROM used_words
    WHERE guild_id = ?
  `);

  return stmt.get(guildId);
}

/**
 * Sunucu için lider tablosunu getirir
 * @param {string} guildId - Discord sunucu ID'si
 * @param {number} limit - Kaç kişi gösterilecek (varsayılan: 10)
 * @returns {Array} - Lider tablosu dizisi
 */
function getLeaderboard(guildId, limit = 10) {
  const { db } = require('./database');

  // Kullanıcıları kelime sayısına göre sırala
  const stmt = db.prepare(`
    SELECT user_id, COUNT(*) as word_count
    FROM used_words
    WHERE guild_id = ?
    GROUP BY user_id
    ORDER BY word_count DESC
    LIMIT ?
  `);

  return stmt.all(guildId, limit);
}

// ============================================
// MODÜL EXPORT
// ============================================

// Tüm fonksiyonları dışa aktar
module.exports = {
  handleMessage,          // Ana mesaj işleyici
  normalizeTurkish,       // Türkçe normalize
  getLastLetter,          // Son harfi al
  getFirstLetter,         // İlk harfi al
  isValidTurkishWord,     // Geçerli Türkçe kelime mi kontrol et
  getGameStats,           // Oyun istatistikleri
  getLeaderboard,         // Lider tablosu
};

