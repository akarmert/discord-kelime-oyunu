// ============================================
// ZİNCİRKELİME ANA KOMUT DOSYASI
// /zincirkelime slash komutu ve alt komutları
// ============================================

// Discord.js modüllerini içe aktar
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Veritabanı fonksiyonlarını içe aktar
const {
  setGameChannel,    // Oyun kanalını ayarla
  getGameChannel,    // Oyun kanalını getir
  startGame,         // Oyunu başlat
  stopGame,          // Oyunu durdur
  getGameState,      // Oyun durumunu getir
  getRandomWord,     // Rastgele kelime getir
  getWordCount,      // Toplam kelime sayısı
} = require('../utils/database');

// Oyun mantığı fonksiyonlarını içe aktar
const { getGameStats } = require('../utils/gameLogic');

// ============================================
// SLASH KOMUT TANIMI
// ============================================

module.exports = {
  // Komut yapısını tanımla
  data: new SlashCommandBuilder()
    .setName('zincirkelime')
    .setDescription('Kelime zinciri oyunu komutları')

    // Alt komut: Kanal ayarlama
    .addSubcommand(subcommand =>
      subcommand
        .setName('kanaladi')
        .setDescription('Oyun kanalını ayarla (Sadece yöneticiler)')
        .addChannelOption(option =>
          option
            .setName('kanal')
            .setDescription('Oyunun oynanacağı kanal')
            .setRequired(true)
        )
    )

    // Alt komut: Oyunu başlat
    .addSubcommand(subcommand =>
      subcommand
        .setName('basla')
        .setDescription('Kelime zinciri oyununu başlat')
    )

    // Alt komut: Oyunu bitir
    .addSubcommand(subcommand =>
      subcommand
        .setName('bitir')
        .setDescription('Kelime zinciri oyununu bitir')
    )

    // Alt komut: İstatistikler
    .addSubcommand(subcommand =>
      subcommand
        .setName('istatistik')
        .setDescription('Oyun istatistiklerini göster')
    )

    // Alt komut: Bot bilgisi
    .addSubcommand(subcommand =>
      subcommand
        .setName('bilgi')
        .setDescription('Bot hakkında bilgi')
    ),

  // ============================================
  // KOMUT ÇALIŞTIRMA FONKSİYONU
  // ============================================

  /**
   * Komut çalıştırıldığında tetiklenir
   * @param {Interaction} interaction - Discord interaction objesi
   */
  async execute(interaction) {
    // Hangi alt komutun kullanıldığını al
    const subcommand = interaction.options.getSubcommand();

    try {
      // Alt komuta göre ilgili fonksiyonu çağır
      switch (subcommand) {
        case 'kanaladi':
          await handleSetChannel(interaction);
          break;
        case 'basla':
          await handleStartGame(interaction);
          break;
        case 'bitir':
          await handleStopGame(interaction);
          break;
        case 'istatistik':
          await handleStats(interaction);
          break;
        case 'bilgi':
          await handleInfo(interaction);
          break;
        default:
          await interaction.reply({ content: 'Bilinmeyen komut!', ephemeral: true });
      }
    } catch (error) {
      console.error('Komut çalıştırılırken hata:', error);

      // Hata mesajı hazırla
      const errorMessage = { content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true };

      // Eğer komut zaten yanıtlandıysa followUp kullan, değilse reply
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

// ============================================
// ALT KOMUT İŞLEYİCİLERİ
// ============================================

/**
 * KANAL AYARLAMA İŞLEYİCİSİ
 * /zincirkelime kanaladi komutu
 * Oyunun oynanacağı kanalı ayarlar (Sadece yöneticiler)
 */
async function handleSetChannel(interaction) {
  // Kullanıcının yönetici yetkisi olup olmadığını kontrol et
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!',
      ephemeral: true, // Sadece komutu kullanan görsün
    });
  }

  // Seçilen kanalı al
  const channel = interaction.options.getChannel('kanal');
  const guildId = interaction.guild.id;

  // Oyun kanalını veritabanına kaydet
  setGameChannel(guildId, channel.id);

  // Başarı mesajı gönder
  await interaction.reply({
    content: `✅ Oyun kanalı <#${channel.id}> olarak ayarlandı!`,
    ephemeral: false, // Herkes görsün
  });
}

/**
 * OYUN BAŞLATMA İŞLEYİCİSİ
 * /zincirkelime basla komutu
 * Kelime zinciri oyununu başlatır (Sadece yöneticiler)
 */
async function handleStartGame(interaction) {
  const guildId = interaction.guild.id;

  // Kullanıcının yönetici yetkisi olup olmadığını kontrol et
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!',
      ephemeral: true,
    });
  }

  // Oyun kanalının ayarlanıp ayarlanmadığını kontrol et
  const gameChannelId = getGameChannel(guildId);

  if (!gameChannelId) {
    return await interaction.reply({
      content: '❌ Önce oyun kanalını ayarlamalısınız! `/zincirkelime kanaladi` komutunu kullanın.',
      ephemeral: true,
    });
  }

  // Komutun oyun kanalında kullanılıp kullanılmadığını kontrol et
  if (interaction.channelId !== gameChannelId) {
    return await interaction.reply({
      content: `❌ Bu komutu sadece oyun kanalında (<#${gameChannelId}>) kullanabilirsiniz!`,
      ephemeral: true,
    });
  }

  // Oyunun zaten aktif olup olmadığını kontrol et
  const gameState = getGameState(guildId);

  if (gameState && gameState.is_active) {
    return await interaction.reply({
      content: '❌ Oyun zaten aktif! Bitirmek için `/zincirkelime bitir` komutunu kullanın.',
      ephemeral: true,
    });
  }

  // Veritabanından rastgele bir başlangıç kelimesi al
  const initialWord = getRandomWord();

  if (!initialWord) {
    return await interaction.reply({
      content: '❌ Veritabanında kelime bulunamadı! Lütfen önce veritabanını kurun.',
      ephemeral: true,
    });
  }

  // Oyunu başlat (veritabanına kaydet)
  startGame(guildId, initialWord);

  // Başlangıç kelimesinin son harfini al (sıradaki kelime için)
  const lastLetter = initialWord.charAt(initialWord.length - 1);

  // Oyun kanalını getir
  const gameChannel = await interaction.client.channels.fetch(gameChannelId);

  // Oyun kanalına başlangıç mesajı gönder
  await gameChannel.send({
    content: `🎮 **Kelime Zinciri Oyunu Başladı!**\n\n` +
      `İlk kelime: **${initialWord}**\n` +
      `Sıradaki kelime **${lastLetter.toLocaleUpperCase('tr-TR')}** harfi ile başlamalı!\n\n` +
      `📝 Kurallar:\n` +
      `• Kelimeler son harfle başlamalı\n` +
      `• Daha önce kullanılmış kelimeler tekrar kullanılamaz\n` +
      `• Sadece Türkçe kelimeler geçerlidir\n\n` +
      `Oyunu bitirmek için: \`/zincirkelime bitir\``,
  });

  // Komutu kullanan kişiye onay mesajı gönder
  await interaction.reply({
    content: `✅ Oyun <#${gameChannelId}> kanalında başlatıldı!`,
    ephemeral: true,
  });
}

/**
 * OYUN DURDURMA İŞLEYİCİSİ
 * /zincirkelime bitir komutu
 * Aktif oyunu durdurur ve istatistikleri gösterir (Sadece yöneticiler)
 */
async function handleStopGame(interaction) {
  const guildId = interaction.guild.id;

  // Kullanıcının yönetici yetkisi olup olmadığını kontrol et
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!',
      ephemeral: true,
    });
  }

  // Oyun kanalının ayarlanıp ayarlanmadığını kontrol et
  const gameChannelId = getGameChannel(guildId);

  if (!gameChannelId) {
    return await interaction.reply({
      content: '❌ Oyun kanalı ayarlanmamış!',
      ephemeral: true,
    });
  }

  // Komutun oyun kanalında kullanılıp kullanılmadığını kontrol et
  if (interaction.channelId !== gameChannelId) {
    return await interaction.reply({
      content: `❌ Bu komutu sadece oyun kanalında (<#${gameChannelId}>) kullanabilirsiniz!`,
      ephemeral: true,
    });
  }

  // Oyunun aktif olup olmadığını kontrol et
  const gameState = getGameState(guildId);

  if (!gameState || !gameState.is_active) {
    return await interaction.reply({
      content: '❌ Aktif bir oyun bulunamadı!',
      ephemeral: true,
    });
  }

  // Oyunu durdurmadan önce istatistikleri al
  const stats = getGameStats(guildId);

  // Oyunu durdur (veritabanında is_active = 0 yap)
  stopGame(guildId);

  // Oyun kanalını getir
  const gameChannel = await interaction.client.channels.fetch(gameChannelId);

  // Oyun kanalına bitiş mesajı ve istatistikleri gönder
  await gameChannel.send({
    content: `🏁 **Oyun Bitti!**\n\n` +
      `📊 İstatistikler:\n` +
      `• Toplam kelime: ${stats.word_count}\n` +
      `• Oyuncu sayısı: ${stats.player_count}\n\n` +
      `Yeni oyun başlatmak için: \`/zincirkelime basla\``,
  });

  // Komutu kullanan kişiye onay mesajı gönder
  await interaction.reply({
    content: '✅ Oyun durduruldu!',
    ephemeral: true,
  });
}

/**
 * İSTATİSTİK GÖSTERME İŞLEYİCİSİ
 * /zincirkelime istatistik komutu
 * Oyun istatistiklerini embed olarak gösterir (Sadece oyun kanalında)
 */
async function handleStats(interaction) {
  const guildId = interaction.guild.id;

  // Oyun kanalının ayarlanıp ayarlanmadığını kontrol et
  const gameChannelId = getGameChannel(guildId);

  if (!gameChannelId) {
    return await interaction.reply({
      content: '❌ Oyun kanalı ayarlanmamış!',
      ephemeral: true,
    });
  }

  // Komutun oyun kanalında kullanılıp kullanılmadığını kontrol et
  if (interaction.channelId !== gameChannelId) {
    return await interaction.reply({
      content: `❌ Bu komutu sadece oyun kanalında (<#${gameChannelId}>) kullanabilirsiniz!`,
      ephemeral: true,
    });
  }

  // Oyun durumunu kontrol et
  const gameState = getGameState(guildId);

  if (!gameState) {
    return await interaction.reply({
      content: '❌ Bu sunucuda henüz oyun oynanmamış!',
      ephemeral: true,
    });
  }

  // Oyun istatistiklerini al
  const stats = getGameStats(guildId);

  // Veritabanındaki toplam kelime sayısını al
  const totalWords = getWordCount();

  // Embed (zengin mesaj) oluştur
  const embed = {
    color: 0x5865F2, // Discord mor rengi
    title: '📊 Oyun İstatistikleri',
    fields: [
      {
        name: '🎮 Oyun Durumu',
        value: gameState.is_active ? '✅ Aktif' : '❌ Pasif',
        inline: true, // Yan yana göster
      },
      {
        name: '📝 Mevcut Kelime',
        value: gameState.current_word || 'Yok',
        inline: true,
      },
      {
        name: '🔤 Beklenen Harf',
        value: gameState.last_letter ? gameState.last_letter.toLocaleUpperCase('tr-TR') : 'Yok',
        inline: true,
      },
      {
        name: '📚 Kullanılan Kelime',
        value: stats.word_count.toString(),
        inline: true,
      },
      {
        name: '👥 Oyuncu Sayısı',
        value: stats.player_count.toString(),
        inline: true,
      },
      {
        name: '💾 Veritabanı',
        value: `${totalWords.toLocaleString()} kelime`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(), // Zaman damgası
    footer: {
      text: 'ZincirKelime',
    },
  };

  // Embed'i gönder (herkes görsün)
  await interaction.reply({ embeds: [embed], ephemeral: false });
}

/**
 * BOT BİLGİSİ GÖSTERME İŞLEYİCİSİ
 * /zincirkelime bilgi komutu
 * Bot hakkında genel bilgileri gösterir (Sadece oyun kanalında)
 */
async function handleInfo(interaction) {
  const guildId = interaction.guild.id;

  // Oyun kanalının ayarlanıp ayarlanmadığını kontrol et
  const gameChannelId = getGameChannel(guildId);

  if (!gameChannelId) {
    return await interaction.reply({
      content: '❌ Oyun kanalı ayarlanmamış!',
      ephemeral: true,
    });
  }

  // Komutun oyun kanalında kullanılıp kullanılmadığını kontrol et
  if (interaction.channelId !== gameChannelId) {
    return await interaction.reply({
      content: `❌ Bu komutu sadece oyun kanalında (<#${gameChannelId}>) kullanabilirsiniz!`,
      ephemeral: true,
    });
  }

  // Veritabanındaki toplam kelime sayısını al
  const totalWords = getWordCount();

  // Bilgi embed'i oluştur
  const embed = {
    color: 0x5865F2, // Discord mor rengi
    title: '🤖 ZincirKelime',
    description: 'Türkçe kelime zinciri oyunu botu',
    fields: [
      {
        name: '👨‍💻 Yapımcı',
        value: '**MeakReatss**',
        inline: true,
      },
      {
        name: '📚 Veritabanı',
        value: `${totalWords.toLocaleString()} Türkçe kelime`,
        inline: true,
      },
      {
        name: '⚙️ Teknoloji',
        value: 'Node.js 18 • discord.js v14',
        inline: true,
      },
      {
        name: '🎮 Komutlar',
        value: '`/zincirkelime kanaladi` - Oyun kanalını ayarla (Yönetici)\n' +
          '`/zincirkelime basla` - Oyunu başlat (Yönetici)\n' +
          '`/zincirkelime bitir` - Oyunu bitir (Yönetici)\n' +
          '`/zincirkelime istatistik` - İstatistikleri göster\n' +
          '`/zincirkelime bilgi` - Bot bilgisi',
        inline: false,
      },
      {
        name: '📖 Nasıl Oynanır?',
        value: '1. Yönetici oyun kanalını ayarlar\n' +
          '2. Yönetici oyunu başlatır\n' +
          '3. Bot bir kelime söyler\n' +
          '4. Herkes son harfle başlayan kelime yazar\n' +
          '5. Geçerli kelimeler ✅ alır, geçersizler silinir\n' +
          '6. Yönetici oyunu bitirir',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(), // Zaman damgası
    footer: {
      text: 'Yapımcı: MeakReatss',
    },
  };

  // Embed'i gönder (herkes görsün)
  await interaction.reply({ embeds: [embed], ephemeral: false });
}

