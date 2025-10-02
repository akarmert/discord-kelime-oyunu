// ============================================
// VERİTABANI KURULUM SCRİPTİ
// CSV dosyasından kelimeleri okuyup veritabanına yükler
// ============================================

// Gerekli modülleri içe aktar
const fs = require('fs');           // Dosya işlemleri
const path = require('path');       // Dosya yolu işlemleri
const readline = require('readline'); // Satır satır okuma

// Veritabanı fonksiyonlarını içe aktar
const { initializeDatabase, getWordCount, db } = require('../utils/database');

console.log('🚀 Veritabanı kurulumu başlıyor...\n');

// ============================================
// VERİTABANI ŞEMASINI OLUŞTUR
// ============================================

// Tabloları oluştur (yoksa)
initializeDatabase();

// ============================================
// MEVCUT KELİME KONTROLÜ
// ============================================

// Veritabanında zaten kelime var mı kontrol et
const existingWordCount = getWordCount();

if (existingWordCount > 0) {
  console.log(`⚠️  Veritabanında zaten ${existingWordCount} kelime var.`);
  console.log('Yüklemeye devam ediliyor... (Tekrar eden kelimeler otomatik atlanacak)\n');
}

// ============================================
// CSV DOSYASI KONTROLÜ
// ============================================

// CSV dosyasının yolunu belirle
const csvPath = path.join(__dirname, '..', 'tr_wordlist.csv');

// Dosya var mı kontrol et
if (!fs.existsSync(csvPath)) {
  console.error('❌ Hata: tr_wordlist.csv dosyası bulunamadı!');
  console.error(`Beklenen yol: ${csvPath}`);
  process.exit(1); // Hata ile çık
}

console.log('📂 CSV dosyası okunuyor...');
console.log(`📍 Yol: ${csvPath}\n`);

// ============================================
// SAYAÇLAR
// ============================================

let lineCount = 0;      // Okunan satır sayısı
let insertedCount = 0;  // Eklenen kelime sayısı
let skippedCount = 0;   // Atlanan kelime sayısı
let errorCount = 0;     // Hata sayısı

// ============================================
// DOSYA OKUMA AKIŞI
// ============================================

// Dosyayı satır satır okumak için stream oluştur
const fileStream = fs.createReadStream(csvPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity // Windows/Unix satır sonları için
});

// ============================================
// TOPLU EKLEME (BATCH INSERT)
// ============================================

// Prepared statement oluştur (SQL injection koruması + performans)
const insertStmt = db.prepare('INSERT OR IGNORE INTO words (word, first_letter, last_letter) VALUES (?, ?, ?)');

// Transaction kullan (çok daha hızlı)
// 1000 kelimeyi tek seferde ekler
const insertMany = db.transaction((words) => {
  for (const word of words) {
    insertStmt.run(word.word, word.firstLetter, word.lastLetter);
  }
});

// Batch (toplu ekleme) dizisi
let batch = [];
const BATCH_SIZE = 1000; // Her seferde 1000 kelime ekle

// ============================================
// SATIR SATIR İŞLEME
// ============================================

// Her satır okunduğunda çalışır
rl.on('line', (line) => {
  lineCount++;

  // İlk satırı atla (başlık satırı: word,id)
  if (lineCount === 1) {
    console.log('📋 Başlık satırı:', line);
    return;
  }

  // CSV satırını parse et (format: word,id)
  const parts = line.split(',');

  // Geçersiz satır kontrolü
  if (parts.length < 1) {
    errorCount++;
    return;
  }

  // Kelimeyi al ve temizle
  let word = parts[0].trim();

  // Tırnak işaretlerini kaldır (varsa)
  word = word.replace(/^['"]|['"]$/g, '');

  // Boş kelime kontrolü
  if (!word) {
    skippedCount++;
    return;
  }

  // Küçük harfe çevir
  word = word.toLowerCase();

  // Çok kısa kelimeleri atla (2 karakterden az)
  if (word.length < 2) {
    skippedCount++;
    return;
  }

  // Türkçe olmayan karakterleri içeren kelimeleri atla
  // İzin verilen: a-z, ç, ğ, ı, i, ö, ş, ü
  const turkishPattern = /^[a-zçğıiöşü]+$/;
  if (!turkishPattern.test(word)) {
    skippedCount++;
    return;
  }

  // İlk ve son harfi hesapla
  const firstLetter = word.charAt(0);
  const lastLetter = word.charAt(word.length - 1);

  // Batch dizisine ekle
  batch.push({ word, firstLetter, lastLetter });

  // Batch dolduğunda veritabanına ekle
  if (batch.length >= BATCH_SIZE) {
    try {
      insertMany(batch); // Transaction ile toplu ekleme
      insertedCount += batch.length;
      batch = []; // Batch'i temizle

      // İlerleme göstergesi (her 10.000 satırda bir)
      if (lineCount % 10000 === 0) {
        console.log(`📊 ${lineCount.toLocaleString()} satır işlendi, ${insertedCount.toLocaleString()} kelime eklendi...`);
      }
    } catch (error) {
      console.error('❌ Batch eklenirken hata:', error);
      errorCount += batch.length;
      batch = [];
    }
  }
});

// ============================================
// DOSYA OKUMA BİTİŞİ
// ============================================

// Dosya tamamen okunduğunda çalışır
rl.on('close', () => {
  // Kalan batch'i ekle (son kelimeler)
  if (batch.length > 0) {
    try {
      insertMany(batch);
      insertedCount += batch.length;
    } catch (error) {
      console.error('❌ Son batch eklenirken hata:', error);
      errorCount += batch.length;
    }
  }

  // ============================================
  // SONUÇ RAPORU
  // ============================================

  console.log('\n✅ Veritabanı kurulumu tamamlandı!\n');
  console.log('📊 İstatistikler:');
  console.log(`   İşlenen satır: ${lineCount.toLocaleString()}`);
  console.log(`   Eklenen kelime: ${insertedCount.toLocaleString()}`);
  console.log(`   Atlanan kelime: ${skippedCount.toLocaleString()}`);
  console.log(`   Hata sayısı: ${errorCount.toLocaleString()}`);

  // Veritabanındaki toplam kelime sayısını göster
  const finalCount = getWordCount();
  console.log(`\n📚 Veritabanındaki toplam kelime: ${finalCount.toLocaleString()}`);

  // Örnek kelimeler göster
  console.log('\n🔤 Veritabanından örnek kelimeler:');
  const samples = db.prepare('SELECT word FROM words ORDER BY RANDOM() LIMIT 10').all();
  samples.forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.word}`);
  });

  console.log('\n🎉 Kullanıma hazır!');

  // Veritabanı bağlantısını kapat
  db.close();
  process.exit(0); // Başarıyla çık
});

// ============================================
// HATA YÖNETİMİ
// ============================================

// Dosya okuma hatası olursa çalışır
rl.on('error', (error) => {
  console.error('❌ Dosya okunurken hata:', error);
  process.exit(1); // Hata ile çık
});

