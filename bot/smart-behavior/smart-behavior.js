const { goals: { GoalNear, GoalXZ } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')
module.exports = function (bot, modules) {
  let movements = null
  let shouldStopAll = false  
  bot.once('spawn', () => {
    if (bot.pathfinder) {
      movements = new Movements(bot)
      bot.pathfinder.setMovements(movements)
    }
  })
  let currentGoal = null
  let goalStack = []
  let lastActionTime = 0
  const ACTION_COOLDOWN = 1000
  const GOALS = {
    SURVIVE: 1,      
    RESOURCE_GATHER: 2,  
    EXPLORE: 3,      
    BUILD: 4,        
    TRAVEL: 5        
  }
  let autonomousBehaviorInterval = null
  bot.once('spawn', () => {
    autonomousBehaviorInterval = setInterval(async () => {
      try {
        if (shouldStopAll) return  
        if (Date.now() - lastActionTime < ACTION_COOLDOWN) return
        await makeAutonomousDecision()
        lastActionTime = Date.now()
      } catch (e) {
        console.error('Ошибка в автономном поведении:', e.message)
      }
    }, ACTION_COOLDOWN + 2000)
  })
  async function makeAutonomousDecision() {
    const priority = calculatePriority()
    switch (priority.goal) {
      case GOALS.SURVIVE:
        await handleSurvivalGoal(priority)
        break
      case GOALS.RESOURCE_GATHER:
        await handleResourceGathering(priority)
        break
      case GOALS.EXPLORE:
        await handleExploration(priority)
        break
      default:
        await handleDefaultBehavior()
    }
  }
  function calculatePriority() {
    if (bot.health < 10) {
      return {
        goal: GOALS.SURVIVE,
        reason: 'low_health'
      }
    }
    if (bot.food < 10) {
      return {
        goal: GOALS.SURVIVE,
        reason: 'hungry'
      }
    }
    const hostiles = getHostileMobs(20)
    if (hostiles.length > 0) {
      return {
        goal: GOALS.SURVIVE,
        reason: 'hostile_mobs',
        mobs: hostiles
      }
    }
    const inventory = bot.inventory.items()
    if (inventory.length > 20) {
      return {
        goal: GOALS.RESOURCE_GATHER,
        reason: 'inventory_full'
      }
    }
    if (shouldGatherResources()) {
      return {
        goal: GOALS.RESOURCE_GATHER,
        reason: 'low_resources'
      }
    }
    return {
      goal: GOALS.EXPLORE,
      reason: 'bored'
    }
  }
  async function handleSurvivalGoal(priority) {
    if (priority.reason === 'low_health') {
      bot.chat('💔 Здоровье критическое!')
      const foods = bot.inventory.items().filter(item =>
        ['cooked_beef', 'cooked_pork', 'bread', 'apple', 'cooked_chicken'].includes(item.name)
      )
      if (foods.length > 0) {
        await bot.equip(foods[0], 'hand')
        await sleep(100)
        await bot.consume()
      }
    }
    if (priority.reason === 'hungry') {
      bot.chat('🍖 Пора поесть!')
      const foods = bot.inventory.items().filter(item =>
        ['cooked_beef', 'cooked_pork', 'bread', 'apple', 'cooked_chicken'].includes(item.name)
      )
      if (foods.length > 0) {
        await bot.equip(foods[0], 'hand')
        await sleep(100)
        await bot.consume()
      }
    }
    if (priority.reason === 'hostile_mobs' && priority.mobs) {
      const nearestMob = priority.mobs[0]
      bot.chat('👹 Враг! Атака!')
      const distance = nearestMob.position.distanceTo(bot.entity.position)
      if (distance > 10) {
        await moveAwayFrom(nearestMob.position, 20)
      } else {
        try {
          await bot.attack(nearestMob)
        } catch (e) {}
      }
    }
  }
  async function handleResourceGathering(priority) {
    bot.chat('⛏️ Собираю ресурсы!')
    const resourcesToGather = [
      { name: 'wood', maxDist: 40, count: 10 },
      { name: 'stone', maxDist: 50, count: 15 },
      { name: 'coal', maxDist: 60, count: 5 }
    ]
    for (const resource of resourcesToGather) {
      if (!shouldGatherResources(resource.name)) {
        continue
      }
      const blocks = bot.findBlocks({
        matching: (block) => findMatchingBlock(block, resource.name),
        maxDistance: resource.maxDist,
        count: resource.count
      })
      if (blocks.length > 0) {
        await gatherBlocks(blocks, resource.name)
        break 
      }
    }
  }
  async function handleExploration(priority) {
    bot.chat('🗺️ Исследую окрестности!')
    const moveX = Math.random() * 100 - 50
    const moveZ = Math.random() * 100 - 50
    try {
      await bot.pathfinder.goto(new GoalXZ(
        bot.entity.position.x + moveX,
        bot.entity.position.z + moveZ
      ))
    } catch (e) {
    }
  }
  async function handleDefaultBehavior() {
    const nearby = bot.findBlocks({
      matching: (block) => block.name === 'stone',
      maxDistance: 20,
      count: 1
    })
    if (nearby.length === 0) {
      const trees = bot.findBlocks({
        matching: (block) => block.name.includes('log'),
        maxDistance: 30,
        count: 1
      })
      if (trees.length > 0) {
        await gatherBlocks(trees, 'wood')
      }
    }
  }
  function shouldGatherResources(resourceType = null) {
    const inventory = bot.inventory.items()
    const resourceCounts = {
      'wood': inventory.filter(i => i.name.includes('log')).reduce((a, b) => a + b.count, 0),
      'stone': inventory.filter(i => i.name === 'cobblestone' || i.name === 'stone').reduce((a, b) => a + b.count, 0),
      'coal': inventory.filter(i => i.name === 'coal').reduce((a, b) => a + b.count, 0)
    }
    if (resourceType) {
      return (resourceCounts[resourceType] || 0) < 20
    }
    return Object.values(resourceCounts).some(count => count < 20)
  }
  function findMatchingBlock(block, resourceType) {
    const resourceMap = {
      'wood': (b) => b.name.includes('log'),
      'stone': (b) => b.name === 'stone' || b.name === 'cobblestone',
      'coal': (b) => b.name.includes('coal_ore')
    }
    const matcher = resourceMap[resourceType]
    return matcher ? matcher(block) : false
  }
  async function gatherBlocks(blockPositions, resourceType) {
    if (!blockPositions || blockPositions.length === 0) return
    const { Movements } = require('mineflayer-pathfinder')
    const movements = new Movements(bot)
    bot.pathfinder.setMovements(movements)
    for (const blockPos of blockPositions) {
      try {
        const block = bot.blockAt(blockPos)
        if (!block) continue
        await bot.pathfinder.goto(new GoalNear(block.position.x, block.position.y, block.position.z, 1))
        await bot.dig(block)
        await sleep(200)
      } catch (e) {
        console.error('Ошибка при добыче:', e.message)
      }
    }
  }
  function getHostileMobs(distance = 20) {
    const hostileNames = [
      'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider',
      'enderman', 'witch', 'slime', 'magma_cube', 'ghast'
    ]
    return Object.values(bot.entities)
      .filter(entity => hostileNames.includes(entity.name))
      .filter(entity => entity.position.distanceTo(bot.entity.position) < distance)
      .sort((a, b) => 
        a.position.distanceTo(bot.entity.position) - 
        b.position.distanceTo(bot.entity.position)
      )
  }
  async function moveAwayFrom(fromPosition, distance) {
    try {
      const pos = bot.entity.position
      const dx = pos.x - fromPosition.x
      const dz = pos.z - fromPosition.z
      const magnitude = Math.sqrt(dx * dx + dz * dz)
      const targetX = pos.x + (dx / magnitude) * distance
      const targetZ = pos.z + (dz / magnitude) * distance
      await bot.pathfinder.goto(new GoalXZ(targetX, targetZ))
    } catch (e) {
      console.error('Ошибка при движении:', e.message)
    }
  }
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  return {
    makeAutonomousDecision,
    calculatePriority,
    getHostileMobs,
    isAutonomousMode: () => true,
    stop: () => { shouldStopAll = true },  
    start: () => { shouldStopAll = false }  
  }
}
