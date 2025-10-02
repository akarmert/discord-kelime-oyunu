# MertinBotu - Turkish Word Chain Game Discord Bot

A Discord bot that plays Turkish word chain game (kelime zinciri) with users.

## Features

- 🎮 Turkish word chain game
- ✅ Word validation from database
- 🔄 Prevents word repetition
- 📊 SQLite database with 2.5M+ Turkish words
- 🌐 Express.js server for Terms & Privacy pages
- ☁️ Railway.app deployment ready

## Game Rules

1. Admin sets the game channel using `/mertinbotu kanaladi`
2. Start the game with `/mertinbotu basla`
3. Bot sends a random Turkish word
4. Users reply with a word starting with the **last letter** of the previous word
5. Valid words get ✅ reaction
6. Invalid words are deleted
7. Stop the game with `/mertinbotu bitir`

## Setup Instructions

### Prerequisites

- Node.js 16.0.0 or higher
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd discord-kelime-oyunu
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Discord bot credentials:
```
BOT_TOKEN=your_discord_bot_token_here
APPLICATION_ID=your_application_id_here
PORT=3000
```

5. Setup the database (load words from CSV):
```bash
npm run setup-db
```

6. Start the bot:
```bash
npm start
```

## Railway.app Deployment

1. Create a new project on [Railway.app](https://railway.app)

2. Connect your GitHub repository

3. Add environment variables in Railway dashboard:
   - `BOT_TOKEN`: Your Discord bot token
   - `APPLICATION_ID`: Your Discord application ID

4. Railway will automatically:
   - Install dependencies
   - Run the setup script
   - Start the bot

5. The bot will stay online 24/7

## Project Structure

```
discord-kelime-oyunu/
├── commands/
│   └── mertinbotu.js       # Main slash command
├── public/
│   ├── terms.html          # Terms of Service
│   └── privacy.html        # Privacy Policy
├── scripts/
│   └── setupDatabase.js    # Database initialization
├── utils/
│   ├── database.js         # Database helper functions
│   └── gameLogic.js        # Game logic functions
├── index.js                # Main entry point
├── package.json
├── .env.example
├── .gitignore
├── Procfile                # Railway deployment
└── README.md
```

## Commands

- `/mertinbotu kanaladi` - Set the game channel (Admin only)
- `/mertinbotu basla` - Start the word chain game
- `/mertinbotu bitir` - Stop the game

## Static Pages

- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

## Technologies Used

- **discord.js v14** - Discord bot framework
- **better-sqlite3** - SQLite database
- **Express.js** - Web server for static pages
- **dotenv** - Environment variable management

## License

MIT
