const TelegramBot = require('node-telegram-bot-api')

module.exports = function (bot, ai) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram не настроен. Установите TELEGRAM_TOKEN и TELEGRAM_CHAT_ID в .env')
    return {
      sendMessage: () => {},
      isReady: false
    }
  }

  const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })
  let isConnected = false

  // Обработка входящих сообщений от Telegram
  telegramBot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text

    console.log(`📱 Telegram [${msg.from.first_name}]: ${text}`)

    // Только принимаем сообщения из нашего чата
    if (chatId !== parseInt(TELEGRAM_CHAT_ID)) {
      telegramBot.sendMessage(chatId, '❌ Вы не авторизованы для управления этим ботом.')
      return
    }

    // Предварительно сообщаем что получили
    await telegramBot.sendMessage(chatId, '⏳ Обрабатываю...')

    try {
      // Команды бота
      if (text.startsWith('/')) {
        handleCommand(text, chatId)
        return
      }

      // Отправляем сообщение в Minecraft чат если бот онлайн
      if (bot && bot.players) {
        try {
          bot.chat(`💬 Telegram [${msg.from.first_name}]: ${text}`)
        } catch (err) {
          console.error('Ошибка отправки сообщения в MC:', err.message)
        }
      }

      // Обрабатываем через AI если есть
      if (ai) {
        const response = await ai.askAI(msg.from.first_name, text)
        if (response) {
          // Ответ уже просто текст, не JSON
          await telegramBot.sendMessage(chatId, response)
        }
      }
    } catch (err) {
      console.error('Ошибка обработки сообщения Telegram:', err.message)
      await telegramBot.sendMessage(chatId, '❌ Ошибка обработки сообщения')
    }
  })

  // Обработка ошибок Telegram бота
  telegramBot.on('error', (error) => {
    console.error('Ошибка Telegram:', error)
  })

  telegramBot.on('polling_error', (error) => {
    console.error('Ошибка polling Telegram:', error)
  })

  // Когда Telegram подключился
  telegramBot.getMe().then((me) => {
    isConnected = true
    console.log('✅ Telegram бот подключен: @' + me.username)
    sendToTelegram(`🤖 Minecraft бот запущен! Готов к командам.`)
  }).catch(err => {
    console.error('❌ Ошибка подключения к Telegram:', err.message)
  })

  // Обработка команд
  function handleCommand(text, chatId) {
    const args = text.split(' ')
    const command = args[0].toLowerCase()

    switch (command) {
      case '/help':
      case '/помощь':
        sendHelp(chatId)
        break

      case '/status':
      case '/статус':
        sendStatus(chatId)
        break

      case '/inventory':
      case '/инвентарь':
        sendInventory(chatId)
        break

      case '/position':
      case '/позиция':
        sendPosition(chatId)
        break

      case '/stop':
      case '/стоп':
        telegramBot.sendMessage(chatId, '⚠️ Остановка бота по команде Telegram...')
        bot.quit()
        break

      default:
        telegramBot.sendMessage(chatId, `❓ Неизвестная команда: ${command}\nНапиши /help для списка команд`)
    }
  }

  // Отправка справки
  function sendHelp(chatId) {
    const help = `
📖 **КОМАНДЫ БОТА:**

💬 **Обычное сообщение** - отправить в чат Minecraft
  
🎮 **Команды:**
/status - показать статус бота
/inventory - показать инвентарь
/position - показать координаты
/help - эта справка
/stop - остановить бота

📝 Просто напиши сообщение и бот отправит его в Minecraft чат!
    `
    telegramBot.sendMessage(chatId, help, { parse_mode: 'Markdown' })
  }

  // Отправка статуса
  function sendStatus(chatId) {
    if (!bot || !bot.entity) {
      telegramBot.sendMessage(chatId, '❌ Бот не подключен к серверу')
      return
    }

    const status = `
✅ **СТАТУС БОТА:**

👤 **Ник:** ${bot.username}
❤️ **HP:** ${Math.round(bot.health)} / ${Math.round(bot.entity.maxHealth)}
🍖 **Голод:** ${Math.round(bot.food)} / 20
🏠 **Размер мира:** ${bot.world ? 'Загружен' : 'Загружается'}
📊 **Пинг:** ${bot.player.ping}ms
    `
    telegramBot.sendMessage(chatId, status, { parse_mode: 'Markdown' })
  }

  // Отправка инвентаря
  function sendInventory(chatId) {
    if (!bot || !bot.inventory) {
      telegramBot.sendMessage(chatId, '❌ Инвентарь не доступен')
      return
    }

    const items = bot.inventory.slots
      .filter(item => item)
      .map((item, idx) => `${idx + 1}. ${item.name} x${item.count}`)
      .join('\n')

    const inventory = `
📦 **ИНВЕНТАРЬ:**

${items || 'Инвентарь пуст'}
    `
    telegramBot.sendMessage(chatId, inventory)
  }

  // Отправка позиции
  function sendPosition(chatId) {
    if (!bot || !bot.entity) {
      telegramBot.sendMessage(chatId, '❌ Позиция не определена')
      return
    }

    const pos = bot.entity.position
    const position = `
🗺️ **ПОЗИЦИЯ:**

📍 X: ${Math.round(pos.x * 100) / 100}
📍 Y: ${Math.round(pos.y * 100) / 100}
📍 Z: ${Math.round(pos.z * 100) / 100}

🧭 Измерение: ${bot.game.dimension || 'unknown'}
    `
    telegramBot.sendMessage(chatId, position, { parse_mode: 'Markdown' })
  }



  // Публичный API
  return {
    // Отправить сообщение в Telegram
    sendMessage: async function (text) {
      if (!isConnected) return false

      try {
        await telegramBot.sendMessage(TELEGRAM_CHAT_ID, text)
        return true
      } catch (err) {
        console.error('Ошибка отправки сообщения в Telegram:', err.message)
        return false
      }
    },

    // Отправить alert
    sendAlert: async function (text, severity = 'info') {
      if (!isConnected) return false

      const emoji = {
        'critical': '🔴',
        'warning': '🟡',
        'info': '🔵',
        'success': '🟢'
      }[severity] || '🔵'

      try {
        await telegramBot.sendMessage(TELEGRAM_CHAT_ID, `${emoji} ${text}`)
        return true
      } catch (err) {
        console.error('Ошибка отправки alert в Telegram:', err.message)
        return false
      }
    },

    // Отправить позицию и скриншот статуса
    sendStatusUpdate: async function () {
      if (!bot || !bot.entity) return false

      try {
        const pos = bot.entity.position
        const update = `
📊 **ОБНОВЛЕНИЕ СТАТУСА:**

❤️ HP: ${Math.round(bot.health)} / 20
🍖 Голод: ${Math.round(bot.food)} / 20
📍 Позиция: [${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}]
⏰ ${new Date().toLocaleTimeString('ru-RU')}
        `
        await telegramBot.sendMessage(TELEGRAM_CHAT_ID, update, { parse_mode: 'Markdown' })
        return true
      } catch (err) {
        console.error('Ошибка отправки статуса:', err.message)
        return false
      }
    },

    isReady: isConnected,
    bot: telegramBot
  }
}

// Быстрая функция для отправки сообщения
function sendToTelegram(text) {
  // Просто логируем для инициализации
  console.log('💬 ' + text)
}