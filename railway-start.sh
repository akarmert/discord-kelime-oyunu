#!/bin/bash

echo "🚀 Starting MertinBotu on Railway..."
echo "📦 Node.js version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Check if database exists
if [ ! -f "data.sqlite" ]; then
    echo "📊 Database not found, setting up..."
    npm run setup-db
else
    echo "✅ Database already exists"
fi

echo "🤖 Starting bot..."
npm start

