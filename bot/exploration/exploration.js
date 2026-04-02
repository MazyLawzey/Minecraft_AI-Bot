
const { goals: { GoalXZ, GoalNear } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')
module.exports = function (bot) {
  let explorationMap = {}
  let lastExploreTime = 0
  const EXPLORE_INTERVAL = 30000 
  let movements = null
  bot.once('spawn', () => {
    if (bot.pathfinder) {
      movements = new Movements(bot)
      bot.pathfinder.setMovements(movements)
    }
  })
  async function explore() {
    if (Date.now() - lastExploreTime < EXPLORE_INTERVAL) return
    try {
      bot.chat('🌍 Исследую район...')
      const direction = getUnexploredDirection()
      const targetX = bot.entity.position.x + direction.x
      const targetZ = bot.entity.position.z + direction.z
      await bot.pathfinder.goto(new GoalXZ(targetX, targetZ))
      await lookForInterestingBlocks()
      lastExploreTime = Date.now()
    } catch (e) {
      console.error('Ошибка при исследовании:', e.message)
    }
  }
  function getUnexploredDirection() {
    const directions = [
      { x: 100, z: 0, angle: 0 },
      { x: 70, z: 70, angle: 45 },
      { x: 0, z: 100, angle: 90 },
      { x: -70, z: 70, angle: 135 },
      { x: -100, z: 0, angle: 180 },
      { x: -70, z: -70, angle: 225 },
      { x: 0, z: -100, angle: 270 },
      { x: 70, z: -70, angle: 315 }
    ]
    let bestDir = directions[0]
    let minVisits = Number.MAX_VALUE
    for (const dir of directions) {
      const key = `${Math.round(dir.angle / 45)}`
      const visits = explorationMap[key] || 0
      if (visits < minVisits) {
        minVisits = visits
        bestDir = dir
      }
    }
    const key = `${Math.round(bestDir.angle / 45)}`
    explorationMap[key] = (explorationMap[key] || 0) + 1
    return bestDir
  }
  async function lookForInterestingBlocks() {
    const interestingBlocks = [
      'diamond_ore', 'gold_ore', 'emerald_ore',
      'village', 'temple', 'dungeon', 'mineshaft',
      'lava', 'water'
    ]
    for (const blockType of interestingBlocks) {
      const blocks = bot.findBlocks({
        matching: (block) => block.name === blockType,
        maxDistance: 50,
        count: 1
      })
      if (blocks.length > 0) {
        bot.chat(`🔍 Нашёл ${blockType}!`)
        return
      }
    }
  }
  async function findNearestStructure() {
    const structures = ['village', 'desert_temple', 'jungle_temple', 'dungeon']
    for (const structure of structures) {
      const blocks = bot.findBlocks({
        matching: (block) => block.name.includes(structure),
        maxDistance: 200,
        count: 1
      })
      if (blocks.length > 0) {
        return {
          type: structure,
          position: bot.blockAt(blocks[0]).position
        }
      }
    }
    return null
  }
  return {
    explore,
    findNearestStructure,
    getExplorationStats: () => explorationMap
  }
}
