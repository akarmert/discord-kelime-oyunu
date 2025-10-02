// ============================================
// MertinBotu - Türkçe Kelime Zinciri Oyunu
// Ana Başlatma Dosyası
// ============================================

// Ortam değişkenlerini yükle (.env dosyasından)
require('dotenv').config();

// Gerekli modülleri içe aktar
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Discord bot client'ı oluştur
// Intents: Bot'un hangi olayları dinleyeceğini belirler
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Sunucu bilgilerine erişim
    GatewayIntentBits.GuildMessages,    // Mesajları okuma
    GatewayIntentBits.MessageContent,   // Mesaj içeriğini okuma (önemli!)
  ],
});

// Komutları saklamak için koleksiyon oluştur
client.commands = new Collection();

// ============================================
// KOMUT YÜKLEME SİSTEMİ
// ============================================

// Commands klasöründen tüm komutları yükle
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  // .js uzantılı tüm dosyaları bul
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  // Her komut dosyasını yükle
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Komutun gerekli özelliklere sahip olup olmadığını kontrol et
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Komut yüklendi: ${command.data.name}`);
    } else {
      console.log(`⚠️ Uyarı: ${file} dosyasında "data" veya "execute" özelliği eksik.`);
    }
  }
}

// ============================================
// SLASH KOMUTLARINI DISCORD'A KAYDETME
// ============================================

/**
 * Slash komutlarını Discord API'ye kaydeder
 * Bu fonksiyon bot her başladığında çalışır
 */
async function registerCommands() {
  const commands = [];

  // Tüm komutları JSON formatına çevir
  for (const command of client.commands.values()) {
    commands.push(command.data.toJSON());
  }

  // Discord REST API client'ı oluştur
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

  try {
    console.log(`🔄 ${commands.length} slash komutu Discord'a kaydediliyor...`);

    // Komutları Discord'a gönder (global komutlar)
    const data = await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands },
    );

    console.log(`✅ ${data.length} slash komutu başarıyla kaydedildi!`);
  } catch (error) {
    console.error('❌ Komutlar kaydedilirken hata:', error);
  }
}

// ============================================
// BOT HAZIR OLDUĞUNDA ÇALIŞAN OLAY
// ============================================

/**
 * Bot Discord'a bağlandığında ve hazır olduğunda tetiklenir
 * Bu olay sadece bir kez çalışır
 */
client.once('ready', async () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
  console.log(`📊 ${client.guilds.cache.size} sunucuda hizmet veriliyor`);

  // Slash komutlarını Discord'a kaydet
  await registerCommands();
});

// ============================================
// SLASH KOMUT İŞLEYİCİSİ
// ============================================

/**
 * Kullanıcı bir slash komutu kullandığında tetiklenir
 * Örnek: /mertinbotu basla
 */
client.on('interactionCreate', async interaction => {
  // Sadece slash komutlarını işle (buton, menü vb. değil)
  if (!interaction.isChatInputCommand()) return;

  // Komutu koleksiyondan bul
  const command = client.commands.get(interaction.commandName);

  // Komut bulunamadıysa hata ver
  if (!command) {
    console.error(`❌ ${interaction.commandName} komutu bulunamadı.`);
    return;
  }

  try {
    // Komutu çalıştır
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Komut çalıştırılırken hata:', error);

    // Kullanıcıya hata mesajı göster
    const errorMessage = { content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true };

    // Eğer komut zaten yanıtlandıysa followUp kullan, değilse reply
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// ============================================
// MESAJ İŞLEYİCİSİ (OYUN MANTIĞI)
// ============================================

/**
 * Kullanıcı bir mesaj gönderdiğinde tetiklenir
 * Kelime zinciri oyunu için kullanılır
 */
client.on('messageCreate', async message => {
  // Bot mesajlarını yok say (sonsuz döngü önleme)
  if (message.author.bot) return;

  // Oyun mantığı modülünü içe aktar
  const gameLogic = require('./utils/gameLogic');

  // Mesajı oyun mantığına gönder (kelime kontrolü yapılacak)
  await gameLogic.handleMessage(message);
});

// ============================================
// EXPRESS.JS WEB SUNUCUSU
// ============================================

// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Public klasöründeki statik dosyaları sun (CSS, resim vb.)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// WEB SAYFALARI ROUTE'LARI
// ============================================

/**
 * Ana sayfa - Bot hakkında bilgi
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MertinBotu</title>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #5865F2; }
        a { color: #5865F2; text-decoration: none; margin: 0 10px; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🎮 MertinBotu</h1>
      <p>Türkçe Kelime Zinciri Oyunu Discord Botu</p>
      <p>
        <a href="/terms">Kullanım Şartları</a> |
        <a href="/privacy">Gizlilik Politikası</a>
      </p>
    </body>
    </html>
  `);
});

/**
 * Kullanım Şartları sayfası
 */
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

/**
 * Gizlilik Politikası sayfası
 */
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

/**
 * Sağlık kontrolü endpoint'i (Railway için)
 * Bot'un çalışıp çalışmadığını kontrol eder
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: client.user ? client.user.tag : 'offline'
  });
});

// ============================================
// SUNUCULARI BAŞLAT
// ============================================

/**
 * Express web sunucusunu başlat
 * Railway otomatik olarak PORT değişkenini sağlar
 */
app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu çalışıyor: Port ${PORT}`);
  console.log(`📄 Kullanım Şartları: http://localhost:${PORT}/terms`);
  console.log(`📄 Gizlilik Politikası: http://localhost:${PORT}/privacy`);
});

/**
 * Discord bot'u başlat
 * .env dosyasındaki BOT_TOKEN kullanılır
 */
client.login(process.env.BOT_TOKEN).catch(error => {
  console.error('❌ Discord\'a bağlanırken hata:', error);
  process.exit(1); // Hata durumunda uygulamayı kapat
});

// ============================================
// GÜVENLE KAPATMA (GRACEFUL SHUTDOWN)
// ============================================

/**
 * CTRL+C ile kapatıldığında temiz bir şekilde kapat
 * Bot bağlantısını düzgün şekilde sonlandırır
 */
process.on('SIGINT', () => {
  console.log('\n👋 Bot kapatılıyor...');
  client.destroy(); // Discord bağlantısını kes
  process.exit(0);  // Uygulamayı kapat
});

