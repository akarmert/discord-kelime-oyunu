# 🎮 ZincirKelime - Türkçe Kelime Zinciri Oyunu

Discord sunucularında Türkçe kelime zinciri oyunu oynatan bot.

**Yapımcı:** MeakReatss

## ✨ Özellikler

- 🎮 Kelime zinciri oyunu
- ✅ 2.5M+ Türkçe kelime veritabanı
- 🔄 Tekrar önleme sistemi
- 👥 Herkes oynayabilir, yöneticiler yönetir
- 📊 Oyun istatistikleri
- 🌐 Kullanım şartları ve gizlilik sayfaları
- ☁️ Railway.app deployment desteği

## 📖 Oyun Kuralları

1. **Yönetici** `/zincirkelime kanaladi` ile oyun kanalını ayarlar
2. **Yönetici** `/zincirkelime basla` ile oyunu başlatır (sadece oyun kanalında)
3. Bot rastgele bir Türkçe kelime gönderir
4. **Herkes** son harfle başlayan kelime yazar
5. Geçerli kelimeler ✅ alır
6. Geçersiz kelimeler silinir
7. **Yönetici** `/zincirkelime bitir` ile oyunu durdurur (sadece oyun kanalında)

## 🚀 Kurulum

### Gereksinimler

- **Node.js 18.0.0** veya üzeri
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### Yerel Geliştirme

1. **Projeyi klonlayın:**
```bash
git clone <repo-url>
cd discord-kelime-oyunu
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **`.env` dosyası oluşturun:**
```bash
cp .env.example .env
```

4. **Discord bot bilgilerinizi ekleyin:**
```env
BOT_TOKEN=discord_bot_token_buraya
APPLICATION_ID=discord_application_id_buraya
PORT=3000
```

5. **Veritabanını kurun:**
```bash
npm run setup-db
```

6. **(Opsiyonel) Eski veritabanını migrate edin:**
```bash
npm run migrate-db
```
> Not: Sadece eski versiyondan güncelleme yapıyorsanız gerekli

7. **Botu başlatın:**
```bash
npm start
```

## ☁️ Railway.app Deployment

### Adımlar

1. **Railway.app'te proje oluşturun:**
   - [Railway.app](https://railway.app) → "New Project" → "Deploy from GitHub repo"

2. **Repository'nizi bağlayın:**
   - GitHub repository'nizi seçin

3. **Environment Variables:**
   - Settings > Variables:
   ```
   BOT_TOKEN=discord_bot_token
   APPLICATION_ID=discord_application_id
   ```

4. **Deploy:**
   - Railway otomatik olarak Node.js 18 kullanacak
   - Veritabanı otomatik kurulacak
   - Bot başlatılacak

5. **Kontrol:**
   - Logs'da "✅ Bot aktif" mesajını görmelisiniz

## 📁 Proje Yapısı

```
discord-kelime-oyunu/
├── commands/
│   └── zincirkelime.js     # Slash komutlar
├── public/
│   ├── terms.html          # Kullanım şartları
│   └── privacy.html        # Gizlilik politikası
├── scripts/
│   └── setupDatabase.js    # Veritabanı kurulum
├── utils/
│   ├── database.js         # Veritabanı fonksiyonları
│   └── gameLogic.js        # Oyun mantığı
├── index.js                # Ana dosya
├── package.json            # Bağımlılıklar
├── .env                    # Ortam değişkenleri
├── .nvmrc                  # Node.js 18
└── README.md
```

## 🎯 Komutlar

| Komut | Yetki | Kanal | Açıklama |
|-------|-------|-------|----------|
| `/zincirkelime kanaladi` | Yönetici | Her kanal | Oyun kanalını ayarla |
| `/zincirkelime basla` | Yönetici | Oyun kanalı | Oyunu başlat |
| `/zincirkelime bitir` | Yönetici | Oyun kanalı | Oyunu durdur |
| `/zincirkelime istatistik` | Herkes | Oyun kanalı | İstatistikleri göster |
| `/zincirkelime bilgi` | Herkes | Oyun kanalı | Bot bilgisi |

## 🌐 Web Sayfaları

- `/terms` - Kullanım Şartları
- `/privacy` - Gizlilik Politikası

## 🛠️ Teknolojiler

- **Node.js 18** - Runtime
- **discord.js v14** - Discord bot framework
- **better-sqlite3** - SQLite veritabanı
- **Express.js** - Web sunucusu

## 👨‍💻 Yapımcı

**MeakReatss**

## 📄 Lisans

MIT
