module.exports = function (bot, modules) {
  let currentStrategy = 'survive'
  let strategySwitchTime = Date.now()
  const STRATEGY_DURATION = 60000 
  const strategies = {
    'survive': handleSurvival,
    'gather': handleGatherStrategy,
    'explore': handleExploreStrategy,
    'build': handleBuildStrategy,
    'hunt': handleHuntStrategy
  }
  let strategyInterval = null
  bot.once('spawn', () => {
    strategyInterval = setInterval(() => {
      updateStrategy()
    }, 5000)
  })
  async function updateStrategy() {
    try {
      if (Date.now() - strategySwitchTime > STRATEGY_DURATION) {
        currentStrategy = selectBestStrategy()
        strategySwitchTime = Date.now()
      }
      const strategyHandler = strategies[currentStrategy]
      if (strategyHandler) {
        await strategyHandler()
      }
    } catch (e) {
      console.error('Strategy error:', e.message)
    }
  }
  function selectBestStrategy() {
    if (bot.health < 10) return 'survive'
    if (bot.food < 10) return 'hunt'
    const inventory = bot.inventory.items()
    const resourceCount = inventory.length
    if (resourceCount > 30) return 'survive' 
    if (resourceCount < 15) return 'gather'
    if (Math.random() < 0.3) return 'explore'
    return 'gather'
  }
  async function handleSurvival() {
    console.log('📊 Strategy: Survival')
    if (bot.health < 5) {
      bot.chat('⚠️ Критическое здоровье! Спасаюсь!')
    }
    if (bot.food < 5) {
      const foods = bot.inventory.items().filter(i => 
        ['cooked_beef', 'cooked_pork', 'bread', 'apple'].includes(i.name)
      )
      if (foods.length > 0) {
        await bot.equip(foods[0], 'hand')
        await sleep(100)
        await bot.consume()
        bot.chat('Перекусил!')
      }
    }
  }
  async function handleGatherStrategy() {
    console.log('🔨 Strategy: Gather Resources')
    const resourcesByPriority = [
      { name: 'wood', search: (b) => b.name.includes('log'), count: 20 },
      { name: 'stone', search: (b) => b.name === 'stone', count: 30 },
      { name: 'coal', search: (b) => b.name.includes('coal_ore'), count: 10 }
    ]
    for (const resource of resourcesByPriority) {
      const currentCount = bot.inventory.items()
        .filter(i => i.name === resource.name)
        .reduce((a, b) => a + b.count, 0)
      if (currentCount < resource.count) {
        bot.chat(`🔨 Ищу ${resource.name}...`)
        break
      }
    }
  }
  async function handleExploreStrategy() {
    console.log('🗺️ Strategy: Explore')
    bot.chat('🌍 Исследую дальше!')
    const direction = Math.random() * Math.PI * 2
    const distance = 50
    const targetX = bot.entity.position.x + Math.cos(direction) * distance
    const targetZ = bot.entity.position.z + Math.sin(direction) * distance
  }
  async function handleBuildStrategy() {
    console.log('🏗️ Strategy: Build')
    bot.chat('🏗️ Пора строить!')
  }
  async function handleHuntStrategy() {
    console.log('🐄 Strategy: Hunt for Food')
    bot.chat('🐄 Охота на еду!')
    const animals = Object.values(bot.entities).filter(e =>
      ['cow', 'pig', 'chicken', 'sheep'].includes(e.name)
    )
    if (animals.length > 0) {
      const animal = animals[0]
      bot.chat(`Нашёл ${animal.name}!`)
    }
  }
  function getResourceStatus() {
    const inventory = bot.inventory.items()
    return {
      total: inventory.length,
      full: inventory.length > 35,
      empty: inventory.length === 0,
      slots: inventory
    }
  }
  function getStatus() {
    return {
      strategy: currentStrategy,
      health: bot.health,
      food: bot.food,
      position: {
        x: Math.round(bot.entity.position.x),
        y: Math.round(bot.entity.position.y),
        z: Math.round(bot.entity.position.z)
      },
      inventory: getResourceStatus()
    }
  }
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  return {
    updateStrategy,
    selectBestStrategy,
    getStatus,
    getCurrentStrategy: () => currentStrategy,
    setStrategy: (s) => { currentStrategy = s; strategySwitchTime = Date.now() }
  }
}
