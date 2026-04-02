#!/bin/bash
# QUICK START GUIDE FOR MINECRAFT AI BOT 2.0

echo "==================================="
echo "Minecraft AI Bot 2.0 - Быстрый старт"
echo "==================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Скачайте с: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js установлен"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "⚠️ Ollama не запущена!"
    echo "Убедитесь что Ollama запущена: ollama serve"
    echo "И модель скачана: ollama pull llama3.1:8b"
fi

# Install dependencies
echo ""
echo "📦 Устанавливаю зависимости..."
npm install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Создаю .env файл..."
    cat > .env << EOF
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=SmartBot
MC_VERSION=1.20.4
EOF
    echo "✅ Файл .env создан"
    echo "   Отредактируйте его перед запуском!"
fi

echo ""
echo "🚀 Готово к запуску!"
echo ""
echo "Запустите сервер Minecraft и введите:"
echo "   node bot.js"
echo ""
echo "Затем в чате сервера:"
echo "   /say иди за мной    (бот начнёт следовать)"
echo "   /say рубь деревья   (бот начнёт рубить)"
echo "   /say статус         (показать статус бота)"
echo ""
