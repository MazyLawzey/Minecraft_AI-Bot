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
  let isMoving = false // Prevent simultaneous pathfinding
  const movements = new Movements(bot)
  async function collectNearbyDrops(maxDistance = 8) {
    if (isMoving) return // Don't collect if currently moving
    
    const items = Object.values(bot.entities)
      .filter(entity => {
        if (!entity || entity.name !== 'item' || !entity.position || !entity.isValid) return false
        return bot.entity.position.distanceTo(entity.position) <= maxDistance
      })
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))
    
    for (const item of items) {
      if (!isGathering || !item.isValid || isMoving) break
      try {
        isMoving = true
        await bot.pathfinder.goto(new GoalNear(
          item.position.x,
          item.position.y,
          item.position.z,
          1
        ))
        await sleep(250)
      } catch (err) {
        // Ignore errors
      } finally {
        isMoving = false
      }
    }
  }
  async function equipBestPickaxe() {
    const pickaxes = bot.inventory.items().filter(item => item.name in PICKAXE_PRIORITY)
    if (pickaxes.length === 0) {
      return false
    }
    pickaxes.sort((a, b) => PICKAXE_PRIORITY[b.name] - PICKAXE_PRIORITY[a.name])
    const bestPickaxe = pickaxes[0]
    try {
      await bot.equip(bestPickaxe, 'hand')
      await sleep(100)
      if (bot.heldItem && bot.heldItem.name === bestPickaxe.name) {
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }
  async function equipBestAxe() {
    const axes = bot.inventory.items().filter(item => item.name in AXE_PRIORITY)
    if (axes.length === 0) {
      return false
    }
    axes.sort((a, b) => AXE_PRIORITY[b.name] - AXE_PRIORITY[a.name])
    const bestAxe = axes[0]
    try {
      await bot.equip(bestAxe, 'hand')
      await sleep(100)
      if (bot.heldItem && bot.heldItem.name === bestAxe.name) {
        return true
      }
      return false
    } catch (err) {
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
    let blocksDestroyed = 0
    
    while (isGathering) {
      const targetBlock = bot.findBlock({
        matching: block => RESOURCE_GROUPS[resourceName].includes(block.name),
        maxDistance: 48
      })
      if (!targetBlock) {
        bot.chat(`${resourceName} рядом не найден.`)
        break
      }
      
      if (!await equipBestTool(resourceName)) {
        await sleep(500)
        continue
      }
      
      try {
        isMoving = true
        await bot.pathfinder.goto(new GoalNear(
          targetBlock.position.x,
          targetBlock.position.y,
          targetBlock.position.z,
          1
        ))
        isMoving = false
        
        // Dig the block
        await bot.dig(targetBlock)
        blocksDestroyed++
        await sleep(200)
        
        // Collect drops only if not too many blocks destroyed (don't spam)
        if (blocksDestroyed % 5 === 0) {
          await collectNearbyDrops(8)
        }
      } catch (err) {
        isMoving = false
        // Silently ignore errors and retry
        await sleep(300)
      }
      await sleep(100)
    }
    
    isGathering = false
    isMoving = false
    await sleep(500)
    await collectNearbyDrops(6)
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
    stop: stopGathering,  
    equipBestPickaxe,
    equipBestAxe,
    collectNearbyDrops
  }
}
