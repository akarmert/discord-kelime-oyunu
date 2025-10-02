const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  setGameChannel,
  getGameChannel,
  startGame,
  stopGame,
  getGameState,
  getRandomWord,
  getWordCount,
} = require('../utils/database');
const { getGameStats } = require('../utils/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mertinbotu')
    .setDescription('Kelime zinciri oyunu komutları')
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('basla')
        .setDescription('Kelime zinciri oyununu başlat')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bitir')
        .setDescription('Kelime zinciri oyununu bitir')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('istatistik')
        .setDescription('Oyun istatistiklerini göster')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bilgi')
        .setDescription('Bot hakkında bilgi')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
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
      console.error('Error executing command:', error);
      
      const errorMessage = { content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

/**
 * Handle setting the game channel
 */
async function handleSetChannel(interaction) {
  // Check if user has administrator permission
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!',
      ephemeral: true,
    });
  }

  const channel = interaction.options.getChannel('kanal');
  const guildId = interaction.guild.id;

  // Set the game channel
  setGameChannel(guildId, channel.id);

  await interaction.reply({
    content: `✅ Oyun kanalı <#${channel.id}> olarak ayarlandı!`,
    ephemeral: false,
  });
}

/**
 * Handle starting the game
 */
async function handleStartGame(interaction) {
  const guildId = interaction.guild.id;

  // Check if game channel is set
  const gameChannelId = getGameChannel(guildId);

  if (!gameChannelId) {
    return await interaction.reply({
      content: '❌ Önce oyun kanalını ayarlamalısınız! `/mertinbotu kanaladi` komutunu kullanın.',
      ephemeral: true,
    });
  }

  // Check if game is already active
  const gameState = getGameState(guildId);

  if (gameState && gameState.is_active) {
    return await interaction.reply({
      content: '❌ Oyun zaten aktif! Bitirmek için `/mertinbotu bitir` komutunu kullanın.',
      ephemeral: true,
    });
  }

  // Get a random word to start
  const initialWord = getRandomWord();

  if (!initialWord) {
    return await interaction.reply({
      content: '❌ Veritabanında kelime bulunamadı! Lütfen önce veritabanını kurun.',
      ephemeral: true,
    });
  }

  // Start the game
  startGame(guildId, initialWord);

  // Get the last letter
  const lastLetter = initialWord.charAt(initialWord.length - 1);

  // Send message to game channel
  const gameChannel = await interaction.client.channels.fetch(gameChannelId);

  await gameChannel.send({
    content: `🎮 **Kelime Zinciri Oyunu Başladı!**\n\n` +
      `İlk kelime: **${initialWord}**\n` +
      `Sıradaki kelime **${lastLetter.toUpperCase()}** harfi ile başlamalı!\n\n` +
      `📝 Kurallar:\n` +
      `• Kelimeler son harfle başlamalı\n` +
      `• Daha önce kullanılmış kelimeler tekrar kullanılamaz\n` +
      `• Sadece Türkçe kelimeler geçerlidir\n\n` +
      `Oyunu bitirmek için: \`/mertinbotu bitir\``,
  });

  await interaction.reply({
    content: `✅ Oyun <#${gameChannelId}> kanalında başlatıldı!`,
    ephemeral: true,
  });
}

/**
 * Handle stopping the game
 */
async function handleStopGame(interaction) {
  const guildId = interaction.guild.id;

  // Check if game is active
  const gameState = getGameState(guildId);

  if (!gameState || !gameState.is_active) {
    return await interaction.reply({
      content: '❌ Aktif bir oyun bulunamadı!',
      ephemeral: true,
    });
  }

  // Get stats before stopping
  const stats = getGameStats(guildId);

  // Stop the game
  stopGame(guildId);

  // Get game channel
  const gameChannelId = getGameChannel(guildId);
  const gameChannel = await interaction.client.channels.fetch(gameChannelId);

  await gameChannel.send({
    content: `🏁 **Oyun Bitti!**\n\n` +
      `📊 İstatistikler:\n` +
      `• Toplam kelime: ${stats.word_count}\n` +
      `• Oyuncu sayısı: ${stats.player_count}\n\n` +
      `Yeni oyun başlatmak için: \`/mertinbotu basla\``,
  });

  await interaction.reply({
    content: '✅ Oyun durduruldu!',
    ephemeral: true,
  });
}

/**
 * Handle showing statistics
 */
async function handleStats(interaction) {
  const guildId = interaction.guild.id;

  // Get game state
  const gameState = getGameState(guildId);

  if (!gameState) {
    return await interaction.reply({
      content: '❌ Bu sunucuda henüz oyun oynanmamış!',
      ephemeral: true,
    });
  }

  // Get stats
  const stats = getGameStats(guildId);

  // Get word count from database
  const totalWords = getWordCount();

  const embed = {
    color: 0x5865F2,
    title: '📊 Oyun İstatistikleri',
    fields: [
      {
        name: '🎮 Oyun Durumu',
        value: gameState.is_active ? '✅ Aktif' : '❌ Pasif',
        inline: true,
      },
      {
        name: '📝 Mevcut Kelime',
        value: gameState.current_word || 'Yok',
        inline: true,
      },
      {
        name: '🔤 Beklenen Harf',
        value: gameState.last_letter ? gameState.last_letter.toUpperCase() : 'Yok',
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
    timestamp: new Date().toISOString(),
    footer: {
      text: 'MertinBotu',
    },
  };

  await interaction.reply({ embeds: [embed], ephemeral: false });
}

/**
 * Handle showing bot info
 */
async function handleInfo(interaction) {
  const totalWords = getWordCount();

  const embed = {
    color: 0x5865F2,
    title: '🤖 MertinBotu',
    description: 'Türkçe kelime zinciri oyunu botu',
    fields: [
      {
        name: '📚 Veritabanı',
        value: `${totalWords.toLocaleString()} Türkçe kelime`,
        inline: false,
      },
      {
        name: '🎮 Komutlar',
        value: '`/mertinbotu kanaladi` - Oyun kanalını ayarla\n' +
          '`/mertinbotu basla` - Oyunu başlat\n' +
          '`/mertinbotu bitir` - Oyunu bitir\n' +
          '`/mertinbotu istatistik` - İstatistikleri göster\n' +
          '`/mertinbotu bilgi` - Bot bilgisi',
        inline: false,
      },
      {
        name: '📖 Nasıl Oynanır?',
        value: '1. Yönetici oyun kanalını ayarlar\n' +
          '2. Oyun başlatılır\n' +
          '3. Bot bir kelime söyler\n' +
          '4. Siz son harfle başlayan kelime yazarsınız\n' +
          '5. Geçerli kelimeler ✅ alır, geçersizler silinir',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'MertinBotu • discord.js v14',
    },
  };

  await interaction.reply({ embeds: [embed], ephemeral: false });
}

