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
  wood: ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'],
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
      bot.chat('У меня нет кирки. Отличный план: копать лицом.')
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

      bot.chat('Я вроде попытался взять кирку, но реальность против.')
      return false
    } catch (err) {
      bot.chat(`Не смог взять кирку: ${err.message}`)
      return false
    }
  }

  async function equipBestAxe() {
    const axes = bot.inventory.items().filter(item => item.name in AXE_PRIORITY)

    if (axes.length === 0) {
      bot.chat('У меня нет топора. Буду грызть дерево морально.')
      return false
    }

    axes.sort((a, b) => AXE_PRIORITY[b.name] - AXE_PRIORITY[a.name])
    const bestAxe = axes[0]

    try {
      await bot.equip(bestAxe, 'hand')
      await sleep(150)

      if (bot.heldItem && bot.heldItem.name === bestAxe.name) {
        bot.chat(`Взял ${bestAxe.name.replace(/_/g, ' ')}.`)
        return true
      }

      bot.chat('Топор выбрать не получилось. Поразительно.')
      return false
    } catch (err) {
      bot.chat(`Не смог взять топор: ${err.message}`)
      return false
    }
  }

  async function equipBestTool(resourceName) {
    if (resourceName === 'wood') {
      return equipBestAxe()
    }
    return equipBestPickaxe()
  }

  async function gather(resourceName) {
    if (!RESOURCE_GROUPS[resourceName]) {
      bot.chat(`Я не знаю ресурс ${resourceName}.`)
      return
    }

    isGathering = true
    bot.pathfinder.setMovements(movements)
    bot.chat(`Начинаю добывать ${resourceName}.`)

    while (isGathering) {
      const targetBlock = bot.findBlock({
        matching: block => RESOURCE_GROUPS[resourceName].includes(block.name),
        maxDistance: 48
      })

      if (!targetBlock) {
        bot.chat(`${resourceName} рядом не найден.`)
        break
      }

      await equipBestTool(resourceName)

      try {
        await bot.pathfinder.goto(new GoalNear(
          targetBlock.position.x,
          targetBlock.position.y,
          targetBlock.position.z,
          1
        ))

        await bot.dig(targetBlock)
      } catch (err) {
        await sleep(500)
      }

      await sleep(300)
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

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return {
    gather,
    stopGathering,
    equipBestPickaxe,
    equipBestAxe
  }
}
