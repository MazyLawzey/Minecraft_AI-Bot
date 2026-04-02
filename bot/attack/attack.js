const { goals: { GoalFollow } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')
const SWORD_PRIORITY = {
  netherite_sword: 5,
  diamond_sword: 4,
  iron_sword: 3,
  stone_sword: 2,
  golden_sword: 1,
  wooden_sword: 0
}
const HOSTILE_MOBS = [
  'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider',
  'enderman', 'witch', 'blaze', 'ghast', 'slime', 'magma_cube',
  'phantom', 'drowned', 'husk', 'stray', 'pillager', 'vindicator', 'evoker'
]
const ANIMALS = [
  'cow', 'pig', 'sheep', 'chicken', 'rabbit', 'horse', 'donkey',
  'mule', 'mooshroom', 'goat', 'camel', 'wolf', 'fox', 'cat',
  'ocelot', 'panda', 'llama', 'trader_llama', 'turtle', 'frog',
  'sniffer', 'parrot', 'bee'
]
module.exports = function (bot) {
  let isAttacking = false
  let attackTarget = null
  let attackInterval = null
  const movements = new Movements(bot)
  async function equipBestSword() {
    let bestSword = null
    let bestPriority = -1
    for (const item of bot.inventory.items()) {
      const priority = SWORD_PRIORITY[item.name]
      if (priority !== undefined && priority > bestPriority) {
        bestPriority = priority
        bestSword = item
      }
    }
    if (!bestSword) return false
    try {
      await bot.equip(bestSword, 'hand')
      return true
    } catch {
      return false
    }
  }
  function canAttackName(name) {
    return HOSTILE_MOBS.includes(name) || ANIMALS.includes(name)
  }
  function findTarget() {
    return bot.nearestEntity(entity => {
      if (!entity || entity === bot.entity) return false
      if (!entity.position || !entity.name) return false
      if (attackTarget) {
        return entity.name.toLowerCase() === attackTarget.toLowerCase()
      }
      return canAttackName(entity.name)
    })
  }
  async function startAttacking(mobName = null) {
    if (isAttacking) {
      bot.chat('Я уже атакую.')
      return
    }
    isAttacking = true
    attackTarget = mobName
    bot.pathfinder.setMovements(movements)
    const hasSword = await equipBestSword()
    bot.chat(hasSword ? 'Я взял лучший меч.' : 'Меча нет, атакую руками.')
    bot.chat(`Начинаю атаковать ${mobName || 'мобов и животных'}.`)
    attackInterval = setInterval(async () => {
      if (!isAttacking) return
      const target = findTarget()
      if (!target) return
      try {
        bot.pathfinder.setGoal(new GoalFollow(target, 1), true)
        const distance = bot.entity.position.distanceTo(target.position)
        if (distance <= 3.2) {
          await bot.lookAt(target.position.offset(0, target.height || 1, 0), true)
          bot.attack(target)
        }
      } catch {}
    }, 250)
  }
  function stopAttacking() {
    isAttacking = false
    attackTarget = null
    if (attackInterval) {
      clearInterval(attackInterval)
      attackInterval = null
    }
    bot.pathfinder.setGoal(null)
    bot.chat('Прекратил атаку.')
  }
  return {
    startAttacking,
    stopAttacking,
    stop: stopAttacking,  
    equipBestSword
  }
}
