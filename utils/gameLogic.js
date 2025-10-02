const {
  getGameChannel,
  getGameState,
  wordExists,
  isWordUsed,
  updateCurrentWord,
  addUsedWord,
} = require('./database');

/**
 * Normalize Turkish characters for comparison
 */
function normalizeTurkish(text) {
  return text.toLowerCase().trim();
}

/**
 * Get the last letter of a word (handles Turkish characters)
 */
function getLastLetter(word) {
  const normalized = normalizeTurkish(word);
  return normalized.charAt(normalized.length - 1);
}

/**
 * Get the first letter of a word (handles Turkish characters)
 */
function getFirstLetter(word) {
  const normalized = normalizeTurkish(word);
  return normalized.charAt(0);
}

/**
 * Validate if a word is valid Turkish word
 */
function isValidTurkishWord(word) {
  const normalized = normalizeTurkish(word);
  
  // Must be at least 2 characters
  if (normalized.length < 2) {
    return false;
  }
  
  // Must contain only Turkish letters
  const turkishPattern = /^[a-zçğıiöşü]+$/;
  return turkishPattern.test(normalized);
}

/**
 * Handle incoming messages for word chain game
 */
async function handleMessage(message) {
  try {
    // Get guild ID
    const guildId = message.guild.id;
    
    // Check if this is the game channel
    const gameChannelId = getGameChannel(guildId);
    
    if (!gameChannelId || message.channel.id !== gameChannelId) {
      // Not the game channel, ignore
      return;
    }
    
    // Get game state
    const gameState = getGameState(guildId);
    
    if (!gameState || !gameState.is_active) {
      // Game is not active, ignore
      return;
    }
    
    // Get user's word
    const userWord = normalizeTurkish(message.content);
    
    // Validate word format
    if (!isValidTurkishWord(userWord)) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Geçersiz kelime formatı! Sadece Türkçe harfler kullanın.`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }
    
    // Check if word exists in database
    if (!wordExists(userWord)) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Bu kelime veritabanında bulunamadı!`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }
    
    // Check if word has been used before
    if (isWordUsed(guildId, userWord)) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Bu kelime daha önce kullanıldı!`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }
    
    // Check if word starts with the correct letter
    const expectedLetter = gameState.last_letter;
    const firstLetter = getFirstLetter(userWord);
    
    if (firstLetter !== expectedLetter) {
      await message.delete().catch(console.error);
      await message.channel.send(`❌ <@${message.author.id}> Kelime **${expectedLetter.toUpperCase()}** harfi ile başlamalı!`).then(msg => {
        setTimeout(() => msg.delete().catch(console.error), 3000);
      });
      return;
    }
    
    // Word is valid! React with checkmark
    await message.react('✅').catch(console.error);
    
    // Update game state
    updateCurrentWord(guildId, userWord);
    addUsedWord(guildId, userWord, message.author.id);
    
    // Get the last letter for next word
    const lastLetter = getLastLetter(userWord);
    
    // Send confirmation message
    await message.channel.send(`✅ **${userWord}** kelimesi kabul edildi! Sıradaki kelime **${lastLetter.toUpperCase()}** harfi ile başlamalı.`);
    
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

/**
 * Get game statistics for a guild
 */
function getGameStats(guildId) {
  const { db } = require('./database');
  
  const stmt = db.prepare(`
    SELECT COUNT(*) as word_count, COUNT(DISTINCT user_id) as player_count
    FROM used_words
    WHERE guild_id = ?
  `);
  
  return stmt.get(guildId);
}

/**
 * Get leaderboard for a guild
 */
function getLeaderboard(guildId, limit = 10) {
  const { db } = require('./database');
  
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

module.exports = {
  handleMessage,
  normalizeTurkish,
  getLastLetter,
  getFirstLetter,
  isValidTurkishWord,
  getGameStats,
  getLeaderboard,
};

