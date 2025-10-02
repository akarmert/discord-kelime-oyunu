const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initializeDatabase() {
  console.log('🔧 Initializing database schema...');
  
  // Words table - stores all Turkish words
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      first_letter TEXT NOT NULL,
      last_letter TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_words_first_letter ON words(first_letter);
    CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
  `);
  
  // Channel configuration table - stores which channel is used for the game in each guild
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Game state table - stores active game state for each guild
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      guild_id TEXT PRIMARY KEY,
      is_active INTEGER DEFAULT 0,
      current_word TEXT,
      last_letter TEXT,
      started_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Used words table - stores words used in current game session
  db.exec(`
    CREATE TABLE IF NOT EXISTS used_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      word TEXT NOT NULL,
      user_id TEXT NOT NULL,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create index for used words
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_used_words_guild ON used_words(guild_id);
    CREATE INDEX IF NOT EXISTS idx_used_words_word ON used_words(guild_id, word);
  `);
  
  console.log('✅ Database schema initialized');
}

/**
 * Insert a word into the database
 */
function insertWord(word) {
  const cleanWord = word.trim().toLowerCase();
  
  if (!cleanWord) return false;
  
  const firstLetter = cleanWord.charAt(0);
  const lastLetter = cleanWord.charAt(cleanWord.length - 1);
  
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO words (word, first_letter, last_letter) VALUES (?, ?, ?)');
    stmt.run(cleanWord, firstLetter, lastLetter);
    return true;
  } catch (error) {
    console.error('Error inserting word:', error);
    return false;
  }
}

/**
 * Check if a word exists in the database
 */
function wordExists(word) {
  const cleanWord = word.trim().toLowerCase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM words WHERE word = ?');
  const result = stmt.get(cleanWord);
  return result.count > 0;
}

/**
 * Get a random word starting with a specific letter
 */
function getRandomWordStartingWith(letter) {
  const stmt = db.prepare('SELECT word FROM words WHERE first_letter = ? ORDER BY RANDOM() LIMIT 1');
  const result = stmt.get(letter.toLowerCase());
  return result ? result.word : null;
}

/**
 * Get a completely random word
 */
function getRandomWord() {
  const stmt = db.prepare('SELECT word FROM words ORDER BY RANDOM() LIMIT 1');
  const result = stmt.get();
  return result ? result.word : null;
}

/**
 * Set game channel for a guild
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
 * Get game channel for a guild
 */
function getGameChannel(guildId) {
  const stmt = db.prepare('SELECT channel_id FROM channel_config WHERE guild_id = ?');
  const result = stmt.get(guildId);
  return result ? result.channel_id : null;
}

/**
 * Start a game for a guild
 */
function startGame(guildId, initialWord) {
  const lastLetter = initialWord.charAt(initialWord.length - 1);
  
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
  
  // Clear used words for this guild
  const clearStmt = db.prepare('DELETE FROM used_words WHERE guild_id = ?');
  clearStmt.run(guildId);
  
  // Add initial word to used words
  addUsedWord(guildId, initialWord, 'bot');
}

/**
 * Stop a game for a guild
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
 * Get game state for a guild
 */
function getGameState(guildId) {
  const stmt = db.prepare('SELECT * FROM game_state WHERE guild_id = ?');
  return stmt.get(guildId);
}

/**
 * Update current word in game
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

/**
 * Add a used word
 */
function addUsedWord(guildId, word, userId) {
  const stmt = db.prepare('INSERT INTO used_words (guild_id, word, user_id) VALUES (?, ?, ?)');
  stmt.run(guildId, word.toLowerCase(), userId);
}

/**
 * Check if a word has been used in current game
 */
function isWordUsed(guildId, word) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM used_words WHERE guild_id = ? AND word = ?');
  const result = stmt.get(guildId, word.toLowerCase());
  return result.count > 0;
}

/**
 * Get total word count
 */
function getWordCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM words');
  const result = stmt.get();
  return result.count;
}

module.exports = {
  db,
  initializeDatabase,
  insertWord,
  wordExists,
  getRandomWord,
  getRandomWordStartingWith,
  setGameChannel,
  getGameChannel,
  startGame,
  stopGame,
  getGameState,
  updateCurrentWord,
  addUsedWord,
  isWordUsed,
  getWordCount,
};

