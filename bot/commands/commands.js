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

    if (msg === 'стой' || msg === 'stop' || msg === 'хватит') {
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

    if (msg.includes('помощь') || msg.includes('help') || msg.includes('команды')) {
      handleHelp()
      return true
    }

    if (msg === 'статус' || msg === 'status') {
      handleStatus()
      return true
    }

    if (msg.includes('рубь') || msg.includes('дерево') || msg.includes('лес')) {
      bot.chat('🌳 Начинаю рубить деревья!')
      callIfFunction(gatherer, 'gather', 'wood')
      return true
    }

    if (msg.includes('копай') || msg.includes('камень') || msg.includes('уголь')) {
      bot.chat('⛏️ Начинаю копать!')
      callIfFunction(gatherer, 'gather', 'stone')
      return true
    }

    if (msg.includes('иди за') || msg.includes('follow')) {
      bot.chat('👤 Иду за тобой!')
      follower.startFollowing(username)
      return true
    }

    if (msg.includes('инвентарь') || msg.includes('inventory')) {
      inv.showInventory()
      return true
    }

    return false
  }

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return

    if (handleDirectCommands(username, message)) {
      return
    }
    const result = await Promise.race([
      ai.askAI(username, message),
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
    bot.chat('=== Я умею: ===')
    bot.chat('⬜ Идти за тобой: "иди за мной"')
    bot.chat('⛏️ Копать: "копай" + ресурс')
    bot.chat('🌳 Рубить деревья: "рубь деревья"')
    bot.chat('🗡️ Атаковать: "атакуй" + враг')
    bot.chat('🛏️ Спать: "спи"')
    bot.chat('🗺️ Исследовать: "исследуй"')
    bot.chat('📊 Все команды требуют руководства!')
  }
}
