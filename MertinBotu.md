You are an expert full-stack developer.  
Generate a complete Node.js Discord bot project with the following requirements:

1. Bot Details:
   - Bot name: "MertinBotu"
   - Use discord.js v14+
   - Use slash commands (/) instead of prefix commands
   - The bot should stay online 24/7 when deployed on Railway.app
   - Include proper project structure with index.js (entry point) and commands folder.

2. Game Logic (Turkish Word Chain Game):
   - When the bot is invited to a server, the admin can choose a channel where the game will run. `/mertinbotu kanaladi`
   - The game starts with the slash command: `/mertinbotu basla`
   - Once started, the bot randomly selects and sends a Turkish word from its database.
   - The user must reply with a new word starting with the **last letter** of the bot’s word.
   - If the word is valid:
       - The bot reacts with a ✅ emoji.
   - If the word is invalid:
       - The bot deletes the user’s message.
   - To stop the game, there is a slash command: `/mertinbotu bitir`
   - Previously used words should not be allowed again.
   
3. Deployment:
   - Create a `Procfile` or `start` script suitable for Railway.app deployment.
   - Provide a `package.json` with necessary dependencies and scripts.
   
4. Database:
   - Use SQLite (via better-sqlite3 or sequelize) for persistent storage.
   - Database file should be included in the project root as `data.sqlite`.
   - Store: Turkish word list, used words history, and game state (active/inactive).
   - Use tr_wordlist.csv file when creating database
   
5. Static Pages:
   - Add two static HTML pages served with Express.js:
     - `/terms` → Terms of Service
     - `/privacy` → Privacy Policy
   - Place HTML files in a `public` folder.
   - Express.js should serve these files when accessed.

6. Best Practices:
   - Use dotenv for environment variables (BOT_TOKEN, etc.)
   - Clear README.md with setup & Railway deployment instructions.
   - Modular and clean code with comments.

Output:
- A full project folder structure
- Example code for index.js, one slash command file (e.g. /mertinbotu), and the word chain game logic
- Example Express.js server for static pages
- Example Terms of Service and Privacy Policy HTML placeholders
