require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.log(`⚠️ Warning: ${file} is missing required "data" or "execute" property.`);
    }
  }
}

// Register slash commands
async function registerCommands() {
  const commands = [];
  
  for (const command of client.commands.values()) {
    commands.push(command.data.toJSON());
  }
  
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);
    
    const data = await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands },
    );
    
    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Register commands
  await registerCommands();
});

// Interaction handler (slash commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName} was found.`);
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Error executing command:', error);
    
    const errorMessage = { content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Message handler (for game logic)
client.on('messageCreate', async message => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Import game logic
  const gameLogic = require('./utils/gameLogic');
  
  // Handle word chain game
  await gameLogic.handleMessage(message);
});

// Express server for static pages
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
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
      <p>Turkish Word Chain Game Discord Bot</p>
      <p>
        <a href="/terms">Terms of Service</a> |
        <a href="/privacy">Privacy Policy</a>
      </p>
    </body>
    </html>
  `);
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: client.user ? client.user.tag : 'offline' });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
  console.log(`📄 Terms: http://localhost:${PORT}/terms`);
  console.log(`📄 Privacy: http://localhost:${PORT}/privacy`);
});

// Login to Discord
client.login(process.env.BOT_TOKEN).catch(error => {
  console.error('❌ Failed to login to Discord:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

