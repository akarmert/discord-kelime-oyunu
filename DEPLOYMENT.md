# 🚀 Railway.app Deployment Guide

## Ön Hazırlık

### 1. Discord Bot Oluşturma

1. [Discord Developer Portal](https://discord.com/developers/applications) adresine gidin
2. "New Application" butonuna tıklayın
3. Bot'a bir isim verin (örn: MertinBotu)
4. "Bot" sekmesine gidin
5. "Add Bot" butonuna tıklayın
6. **Token'ı kopyalayın** (Reset Token ile yeni token alabilirsiniz)
7. **Privileged Gateway Intents** bölümünden şunları aktif edin:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT (opsiyonel)
8. "OAuth2" > "General" sekmesinden **Application ID**'yi kopyalayın

### 2. Bot'u Sunucuya Davet Etme

1. "OAuth2" > "URL Generator" sekmesine gidin
2. **Scopes** bölümünden:
   - ✅ `bot`
   - ✅ `applications.commands`
3. **Bot Permissions** bölümünden:
   - ✅ Send Messages
   - ✅ Read Messages/View Channels
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Manage Messages (mesaj silme için)
   - ✅ Use Slash Commands
4. Oluşan URL'yi kopyalayıp tarayıcıda açın
5. Bot'u sunucunuza davet edin

## Railway.app Deployment

### Adım 1: Railway Hesabı Oluşturma

1. [Railway.app](https://railway.app) adresine gidin
2. GitHub hesabınızla giriş yapın
3. Ücretsiz plan ile başlayabilirsiniz ($5 ücretsiz kredi)

### Adım 2: Projeyi GitHub'a Yükleme

```bash
# Git repository oluşturun (henüz yoksa)
git init
git add .
git commit -m "Initial commit: MertinBotu Discord bot"

# GitHub'a push edin
git remote add origin https://github.com/KULLANICI_ADINIZ/discord-kelime-oyunu.git
git branch -M main
git push -u origin main
```

### Adım 3: Railway'de Proje Oluşturma

1. Railway dashboard'da **"New Project"** butonuna tıklayın
2. **"Deploy from GitHub repo"** seçeneğini seçin
3. Repository'nizi seçin (discord-kelime-oyunu)
4. Railway otomatik olarak projeyi algılayacak

### Adım 4: Environment Variables Ekleme

1. Railway dashboard'da projenize tıklayın
2. **"Variables"** sekmesine gidin
3. Şu değişkenleri ekleyin:

```
BOT_TOKEN=your_discord_bot_token_here
APPLICATION_ID=your_discord_application_id_here
NODE_ENV=production
```

**Önemli:** Token'ı ve Application ID'yi Discord Developer Portal'dan aldığınız değerlerle değiştirin.

### Adım 5: Deploy İşlemini Başlatma

1. Variables eklendikten sonra Railway otomatik olarak deploy edecek
2. **"Deployments"** sekmesinden ilerlemeyi izleyin
3. Build logs'da şunları göreceksiniz:
   ```
   📦 Node.js version: v18.x.x
   📊 Database setup...
   ✅ Database setup complete!
   🤖 Starting bot...
   ✅ Bot is online as MertinBotu#1234
   ```

### Adım 6: Domain Ekleme (Opsiyonel)

1. **"Settings"** sekmesine gidin
2. **"Networking"** bölümünden **"Generate Domain"** butonuna tıklayın
3. Oluşan domain ile `/terms` ve `/privacy` sayfalarına erişebilirsiniz

## Sorun Giderme

### ❌ ReadableStream is not defined

**Sebep:** Node.js versiyonu 18'den düşük

**Çözüm:**
- `nixpacks.toml` dosyasının repository'de olduğundan emin olun
- Railway'de projeyi yeniden deploy edin
- Logs'da Node.js versiyonunu kontrol edin: `node --version`

### ❌ Invalid Token

**Sebep:** BOT_TOKEN yanlış veya eksik

**Çözüm:**
- Discord Developer Portal'dan yeni token alın
- Railway Variables'da BOT_TOKEN'ı güncelleyin
- Projeyi yeniden deploy edin

### ❌ Missing Access

**Sebep:** Bot'un gerekli izinleri yok

**Çözüm:**
- Discord Developer Portal > Bot > Privileged Gateway Intents
- MESSAGE CONTENT INTENT'i aktif edin
- Bot'u sunucudan çıkarıp yeniden davet edin

### ❌ Database Error

**Sebep:** CSV dosyası bulunamadı veya yüklenemedi

**Çözüm:**
- `tr_wordlist.csv` dosyasının repository'de olduğundan emin olun
- Build logs'da "Database setup complete" mesajını kontrol edin
- Gerekirse Railway'de projeyi yeniden deploy edin

### ⚠️ Bot Offline

**Kontrol Listesi:**
1. ✅ BOT_TOKEN doğru mu?
2. ✅ APPLICATION_ID doğru mu?
3. ✅ Discord Developer Portal'da bot aktif mi?
4. ✅ MESSAGE CONTENT INTENT aktif mi?
5. ✅ Railway logs'da hata var mı?

## Kullanım

Bot deploy edildikten sonra:

1. Discord sunucunuzda `/mertinbotu bilgi` yazarak bot'un çalıştığını kontrol edin
2. Admin olarak `/mertinbotu kanaladi #kanal-adı` ile oyun kanalını ayarlayın
3. `/mertinbotu basla` ile oyunu başlatın
4. Kelime zinciri oyununu oynayın!

## Maliyet

Railway.app ücretsiz planı:
- ✅ $5 ücretsiz kredi (aylık)
- ✅ 500 saat çalışma süresi
- ✅ 1GB RAM
- ✅ 1GB Disk

Bu bot için yeterlidir. Kredi biterse aylık ~$5 ödeme yapabilirsiniz.

## Güncelleme

Kod değişikliği yaptığınızda:

```bash
git add .
git commit -m "Update: açıklama"
git push
```

Railway otomatik olarak yeni versiyonu deploy edecektir.

## Destek

Sorun yaşarsanız:
1. Railway logs'ları kontrol edin
2. Discord Developer Portal ayarlarını kontrol edin
3. GitHub Issues'da sorun bildirin

---

**Başarılar! 🎉**

