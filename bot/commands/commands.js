module.exports = function (bot, {
  follower,
  miner,
  inv,
  attacker,
  sleeper,
  vehicle,
  gatherer,
  tunneler,
  vision,
  ai,
  survival,
  crafting,
  exploration,
  smartBehavior,
  memory,
  strategy
}) {
  function callIfFunction(obj, methodName, ...args) {
    if (!obj || typeof obj[methodName] !== 'function') return false
    obj[methodName](...args)
    return true
  }

  function handleDirectCommands(username, message) {
    const msg = message.toLowerCase().trim()
    let actualMessage = msg

    if (actualMessage === 'стой' || actualMessage === 'stop' || actualMessage === 'хватит') {
      bot.chat('🛑 Останавливаю все!')
      follower.stopFollowing()
      callIfFunction(miner, 'stopMiningTrees') || callIfFunction(miner, 'stop')
      callIfFunction(attacker, 'stopAttacking')
      callIfFunction(gatherer, 'stopGathering') || callIfFunction(gatherer, 'stop')
      callIfFunction(tunneler, 'stopTunneling') || callIfFunction(tunneler, 'stop')
      callIfFunction(strategy, 'setStrategy', 'survive')
      callIfFunction(smartBehavior, 'stop')
      return true
    }

    if (actualMessage.includes('помощь') || actualMessage.includes('help') || actualMessage.includes('команды')) {
      handleHelp()
      return true
    }

    if (actualMessage === 'статус' || actualMessage === 'status') {
      handleStatus()
      return true
    }

    if (actualMessage.includes('рубь') || actualMessage.includes('дерево') || actualMessage.includes('лес')) {
      bot.chat('🌳 Начинаю рубить деревья!')
      callIfFunction(gatherer, 'gather', 'wood')
      return true
    }

    if (actualMessage.includes('копай') || actualMessage.includes('камень') || actualMessage.includes('уголь')) {
      bot.chat('⛏️ Начинаю копать!')
      callIfFunction(gatherer, 'gather', 'stone')
      return true
    }

    if (actualMessage.includes('иди за') || actualMessage.includes('follow')) {
      bot.chat('👤 Иду за тобой!')
      follower.startFollowing(username)
      return true
    }

    if (actualMessage.includes('инвентарь') || actualMessage.includes('inventory')) {
      inv.showInventory()
      return true
    }

    return false
  }

  function shouldRespondToChat(message) {
    // Always respond to chat messages
    return true
  }

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return

    // Check if bot should respond based on player count
    if (!shouldRespondToChat(message)) {
      return
    }

    // Use message directly for AI processing
    let aiMessage = message

    const result = await Promise.race([
      ai.askAI(username, aiMessage),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 4000)
      )
    ]).catch(err => {
      console.error('AI ошибка:', err.message)
      bot.chat('🤖 Мозг чё-то глючит, повтори!')
      return null
    })

    if (!result) return

    if (result.reply) {
      bot.chat(String(result.reply).slice(0, 200))
    }

    if (result.intent === 'follow') {
      follower.startFollowing(username)
      return
    }

    if (result.intent === 'stop') {
      follower.stopFollowing()
      callIfFunction(miner, 'stopMiningTrees') || callIfFunction(miner, 'stopGathering')
      attacker.stopAttacking()
      gatherer.stopGathering()
      return
    }

    if (result.intent === 'mine_trees') {
      callIfFunction(miner, 'mineTrees') || callIfFunction(miner, 'gather', 'wood')
      return
    }

    if (result.intent === 'collect_items') {
      inv.collectItems()
      return
    }

    if (result.intent === 'show_inventory') {
      inv.showInventory()
      return
    }

    if (result.intent === 'drop_all') {
      inv.dropAll([
        'netherite_axe',
        'diamond_axe',
        'iron_axe',
        'netherite_sword',
        'diamond_sword',
        'iron_sword',
        'diamond_pickaxe',
        'iron_pickaxe',
        'netherite_pickaxe'
      ])
      return
    }

    if (result.intent === 'drop_item') {
      inv.dropItem(result.item, result.count || 1)
      return
    }

    if (result.intent === 'attack') {
      attacker.startAttacking(result.target || null)
      return
    }

    if (result.intent === 'sleep') {
      sleeper.sleepInBed()
      return
    }

    if (result.intent === 'wake') {
      sleeper.wakeUp()
      return
    }

    if (result.intent === 'enter_boat') {
      vehicle.enterBoat()
      return
    }

    if (result.intent === 'leave_vehicle') {
      vehicle.leaveVehicle()
      return
    }

    if (result.intent === 'gather') {
      gatherer.gather(result.target || 'stone')
      return
    }

    if (result.intent === 'start_tunnel') {
      tunneler.startTunneling()
      return
    }

    if (result.intent === 'stop_tunnel') {
      tunneler.stopTunneling()
      return
    }

    if (result.intent === 'describe_image') {
      try {
        const description = await vision.describeImage(result.target || undefined)
        if (description) {
          bot.chat(String(description).slice(0, 200))
        } else {
          bot.chat('Я ничего не смог разглядеть.')
        }
      } catch (err) {
        bot.chat('Не смог обработать изображение.')
      }
      return
    }

    if (result.intent === 'chat') {
      return
    }

    if (message.toLowerCase().includes('статус')) {
      handleStatus()
      return
    }

    if (message.toLowerCase().includes('помощь') || message.toLowerCase().includes('команды')) {
      handleHelp()
      return
    }

    if (message === 'копай тоннель') {
      tunneler.startTunneling()
      return
    }

    if (message === 'прекрати копать тоннель') {
      tunneler.stopTunneling()
      return
    }

    if (message === 'включи зрение') {
      vision.describeImage()
      return
    }
  })

  function handleStatus() {
    const status = survival.getStatus()
    bot.chat(`❤️ Здоровье: ${Math.ceil(status.health)}/20`)
    bot.chat(`🍖 Голод: ${status.food}/20`)
    bot.chat(`👹 Враги рядом: ${status.threats.length}`)
    
    const inventory = bot.inventory.items()
    bot.chat(`🎒 Инвентарь: ${inventory.length} видов предметов`)
  }

  function handleHelp() {
    const playerCount = Object.keys(bot.players).length
    if (playerCount > 2) {
      bot.chat('=== 👥 Много игроков! Используй /bot перед командой ===')
      bot.chat('/bot рубь - рубить деревья')
      bot.chat('/bot копай - копать')
      bot.chat('/bot иди за мной - следовать')
      bot.chat('/bot статус - статус')
    } else {
      bot.chat('=== 👤 Мы одни, отвечу на что угодно! ===')
      bot.chat('рубь - рубить деревья')
      bot.chat('копай - копать')
      bot.chat('иди за мной - следовать')
      bot.chat('статус - показать статус')
    }
  }
}
