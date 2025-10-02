const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { initializeDatabase, insertWord, getWordCount, db } = require('../utils/database');

console.log('🚀 Starting database setup...\n');

// Initialize database schema
initializeDatabase();

// Check if words already exist
const existingWordCount = getWordCount();

if (existingWordCount > 0) {
  console.log(`⚠️  Database already contains ${existingWordCount} words.`);
  console.log('Do you want to skip loading? (Words will not be duplicated anyway)');
  console.log('Continuing with import...\n');
}

// Path to CSV file
const csvPath = path.join(__dirname, '..', 'tr_wordlist.csv');

if (!fs.existsSync(csvPath)) {
  console.error('❌ Error: tr_wordlist.csv not found!');
  console.error(`Expected path: ${csvPath}`);
  process.exit(1);
}

console.log('📂 Reading CSV file...');
console.log(`📍 Path: ${csvPath}\n`);

let lineCount = 0;
let insertedCount = 0;
let skippedCount = 0;
let errorCount = 0;

// Create read stream
const fileStream = fs.createReadStream(csvPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

// Prepare batch insert for better performance
const insertStmt = db.prepare('INSERT OR IGNORE INTO words (word, first_letter, last_letter) VALUES (?, ?, ?)');

// Use transaction for much faster inserts
const insertMany = db.transaction((words) => {
  for (const word of words) {
    insertStmt.run(word.word, word.firstLetter, word.lastLetter);
  }
});

let batch = [];
const BATCH_SIZE = 1000;

// Process each line
rl.on('line', (line) => {
  lineCount++;
  
  // Skip header
  if (lineCount === 1) {
    console.log('📋 Header:', line);
    return;
  }
  
  // Parse CSV line (format: word,id)
  const parts = line.split(',');
  
  if (parts.length < 1) {
    errorCount++;
    return;
  }
  
  let word = parts[0].trim();
  
  // Remove quotes if present
  word = word.replace(/^['"]|['"]$/g, '');
  
  // Skip empty words
  if (!word) {
    skippedCount++;
    return;
  }
  
  // Convert to lowercase
  word = word.toLowerCase();
  
  // Skip words that are too short (less than 2 characters)
  if (word.length < 2) {
    skippedCount++;
    return;
  }
  
  // Skip words with non-Turkish characters (basic filter)
  // Allow Turkish letters: a-z, ç, ğ, ı, i, ö, ş, ü
  const turkishPattern = /^[a-zçğıiöşü]+$/;
  if (!turkishPattern.test(word)) {
    skippedCount++;
    return;
  }
  
  const firstLetter = word.charAt(0);
  const lastLetter = word.charAt(word.length - 1);
  
  batch.push({ word, firstLetter, lastLetter });
  
  // Insert batch when it reaches BATCH_SIZE
  if (batch.length >= BATCH_SIZE) {
    try {
      insertMany(batch);
      insertedCount += batch.length;
      batch = [];
      
      // Progress indicator
      if (lineCount % 10000 === 0) {
        console.log(`📊 Processed ${lineCount.toLocaleString()} lines, inserted ${insertedCount.toLocaleString()} words...`);
      }
    } catch (error) {
      console.error('❌ Error inserting batch:', error);
      errorCount += batch.length;
      batch = [];
    }
  }
});

// Handle end of file
rl.on('close', () => {
  // Insert remaining batch
  if (batch.length > 0) {
    try {
      insertMany(batch);
      insertedCount += batch.length;
    } catch (error) {
      console.error('❌ Error inserting final batch:', error);
      errorCount += batch.length;
    }
  }
  
  console.log('\n✅ Database setup complete!\n');
  console.log('📊 Statistics:');
  console.log(`   Total lines processed: ${lineCount.toLocaleString()}`);
  console.log(`   Words inserted: ${insertedCount.toLocaleString()}`);
  console.log(`   Words skipped: ${skippedCount.toLocaleString()}`);
  console.log(`   Errors: ${errorCount.toLocaleString()}`);
  
  const finalCount = getWordCount();
  console.log(`\n📚 Total words in database: ${finalCount.toLocaleString()}`);
  
  // Show some sample words
  console.log('\n🔤 Sample words from database:');
  const samples = db.prepare('SELECT word FROM words ORDER BY RANDOM() LIMIT 10').all();
  samples.forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.word}`);
  });
  
  console.log('\n🎉 Ready to use!');
  
  db.close();
  process.exit(0);
});

// Handle errors
rl.on('error', (error) => {
  console.error('❌ Error reading file:', error);
  process.exit(1);
});

