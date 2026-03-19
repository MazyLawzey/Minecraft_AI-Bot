const { goals: { GoalNear } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')

const PICKAXE_PRIORITY = {
  netherite_pickaxe: 5,
  diamond_pickaxe: 4,
  iron_pickaxe: 3,
  stone_pickaxe: 2,
  golden_pickaxe: 1,
  wooden_pickaxe: 0
}

const AXE_PRIORITY = {
  netherite_axe: 5,
  diamond_axe: 4,
  iron_axe: 3,
  stone_axe: 2,
  golden_axe: 1,
  wooden_axe: 0
}

const RESOURCE_GROUPS = {
  wood: [
    'oak_log', 'birch_log', 'spruce_log', 'jungle_log',
    'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'
  ],
  stone: ['stone', 'cobblestone'],
  coal: ['coal_ore', 'deepslate_coal_ore'],
  iron: ['iron_ore', 'deepslate_iron_ore'],
  copper: ['copper_ore', 'deepslate_copper_ore'],
  gold: ['gold_ore', 'deepslate_gold_ore'],
  redstone: ['redstone_ore', 'deepslate_redstone_ore'],
  diamond: ['diamond_ore', 'deepslate_diamond_ore']
}

module.exports = function (bot) {
  let isGathering = false
  const movements = new Movements(bot)

  async function equipBestPickaxe() {
    const pickaxes = bot.inventory.items().filter(item => item.name in PICKAXE_PRIORITY)

    if (pickaxes.length === 0) {
      bot.chat('У меня нет кирки. Гениально.')
      return false
    }

    pickaxes.sort((a, b) => PICKAXE_PRIORITY[b.name] - PICKAXE_PRIORITY[a.name])
    const bestPickaxe = pickaxes[0]

    try {
      await bot.equip(bestPickaxe, 'hand')
      await sleep(150)

      if (bot.heldItem && bot.heldItem.name === bestPickaxe.name) {
        return true
      }

      bot.chat('Кирку взять не получилось. Очень вовремя.')
      return false
    } catch (err) {
      bot.chat(`Не смог взять кирку: ${err.message}`)
      return false
    }
  }

  async function equipBestAxe() {
    const axes = bot.inventory.items().filter(item => item.name in AXE_PRIORITY)

    if (axes.length === 0) {
      bot.chat('У меня нет топора. Какая неожиданность.')
      return false
    }

    axes.sort((a, b) => AXE_PRIORITY[b.name] - AXE_PRIORITY[a.name])
    const bestAxe = axes[0]

    try {
      await bot.equip(bestAxe, 'hand')
      await sleep(150)

      if (bot.heldItem && bot.heldItem.name === bestAxe.name) {
        return true
      }

      bot.chat('Топор взять не получилось.')
      return false
    } catch (err) {
      bot.chat(`Не смог взять топор: ${err.message}`)
      return false
    }
  }

  async function equipBestTool(resourceName) {
    if (resourceName === 'wood') {
      return await equipBestAxe()
    }
    return await equipBestPickaxe()
  }

  function isUnsafeToDig(block) {
    if (!block || !block.position) return true

    const botPos = bot.entity.position
    const botX = Math.floor(botPos.x)
    const botY = Math.floor(botPos.y)
    const botZ = Math.floor(botPos.z)

    const blockX = Math.floor(block.position.x)
    const blockY = Math.floor(block.position.y)
    const blockZ = Math.floor(block.position.z)

    // Нельзя ломать блок прямо под ногами
    if (blockX === botX && blockZ === botZ && blockY === botY - 1) {
      return true
    }

    // Нельзя ломать блок, в котором стоит бот
    if (blockX === botX && blockY === botY && blockZ === botZ) {
      return true
    }

    return false
  }

  async function collectNearbyDrops() {
    const items = Object.values(bot.entities)
      .filter(entity => entity && entity.name === 'item' && entity.position)
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))

    for (const item of items) {
      if (!item.isValid) continue

      try {
        await bot.pathfinder.goto(new GoalNear(
          item.position.x,
          item.position.y,
          item.position.z,
          1
        ))
        await sleep(250)
      } catch {}
    }
  }

  async function gather(resourceName) {
    if (!RESOURCE_GROUPS[resourceName]) {
      bot.chat(`Я не знаю ресурс ${resourceName}.`)
      return
    }

    if (isGathering) {
      bot.chat('Я уже что-то копаю. Не клонируюсь пока что.')
      return
    }

    isGathering = true
    bot.pathfinder.setMovements(movements)
    bot.chat(`Начинаю добывать ${resourceName}. Ну конечно, опять я.`)

    while (isGathering) {
      const targetBlock = bot.findBlock({
        matching: block => {
          if (!block || !block.position || !block.name) return false
          if (!RESOURCE_GROUPS[resourceName].includes(block.name)) return false
          if (isUnsafeToDig(block)) return false
          return true
        },
        maxDistance: 6
      })

      if (!targetBlock) {
        bot.chat(`${resourceName} рядом нет или копать его небезопасно.`)
        break
      }

      await equipBestTool(resourceName)

      try {
        const distance = bot.entity.position.distanceTo(targetBlock.position)

        if (distance > 2) {
          await bot.pathfinder.goto(new GoalNear(
            targetBlock.position.x,
            targetBlock.position.y,
            targetBlock.position.z,
            1
          ))
        }

        if (!isGathering) break
        if (isUnsafeToDig(targetBlock)) {
          await sleep(200)
          continue
        }

        await bot.lookAt(targetBlock.position.offset(0.5, 0.5, 0.5), true)
        await bot.dig(targetBlock)
        await sleep(400)
        await collectNearbyDrops()
      } catch (err) {
        await sleep(400)
      }

      await sleep(200)
    }

    isGathering = false
    bot.chat('Добычу прекратил.')
  }

  function stopGathering() {
    isGathering = false
    bot.stopDigging()
    bot.pathfinder.setGoal(null)
    bot.chat('Всё, больше не копаю.')
  }

  return {
    gather,
    stopGathering,
    equipBestPickaxe,
    equipBestAxe,
    collectNearbyDrops
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
