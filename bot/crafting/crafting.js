const recipes = {
  'wooden_pickaxe': ['wooden_planks', 'wooden_planks', 'wooden_planks', 'stick', 'stick'],
  'stone_pickaxe': ['cobblestone', 'cobblestone', 'cobblestone', 'stick', 'stick'],
  'iron_pickaxe': ['iron_ingot', 'iron_ingot', 'iron_ingot', 'stick', 'stick'],
  'wooden_axe': ['wooden_planks', 'wooden_planks', 'stick', 'stick'],
  'stone_axe': ['cobblestone', 'cobblestone', 'stick', 'stick'],
  'iron_axe': ['iron_ingot', 'iron_ingot', 'stick', 'stick'],
  'chest': ['wooden_planks', 'wooden_planks', 'wooden_planks', 'wooden_planks', 'wooden_planks', 'wooden_planks', 'wooden_planks', 'wooden_planks'],
  'crafting_table': ['wooden_planks', 'wooden_planks', 'wooden_planks', 'wooden_planks'],
  'furnace': ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone'],
  'wooden_planks': ['oak_log'],
  'sticks': ['wooden_planks', 'wooden_planks']
}
module.exports = function (bot) {
  async function craftItem(itemName, amount = 1) {
    try {
      const recipe = recipes[itemName]
      if (!recipe) {
        bot.chat(`Не знаю как крафтить ${itemName}`)
        return false
      }
      const hasAll = recipe.every(component => 
        bot.inventory.items().some(item => item.name === component)
      )
      if (!hasAll) {
        const missing = recipe.filter(component =>
          !bot.inventory.items().some(item => item.name === component)
        )
        bot.chat(`Не хватает для крафта: ${missing.join(', ')}`)
        return false
      }
      const craftingInvs = bot.containers.windows.filter(w => 
        w.type === 'minecraft:crafting_table' || w.type === 'minecraft:inventory'
      )
      if (craftingInvs.length === 0) {
        bot.chat('Нет рабочего стола для крафта')
        return false
      }
      bot.chat(`Крафчу ${itemName}...`)
      return true
    } catch (e) {
      console.error('Ошибка при крафте:', e.message)
      return false
    }
  }
  async function ensureToolExists(toolType) {
    const toolMap = {
      'pickaxe': ['netherite_pickaxe', 'diamond_pickaxe', 'iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'],
      'axe': ['netherite_axe', 'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe'],
      'sword': ['netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword']
    }
    const tools = toolMap[toolType] || []
    const hasTool = bot.inventory.items().some(item => tools.includes(item.name))
    if (hasTool) {
      return true
    }
    for (const tool of tools.reverse()) {
      if (await craftItem(tool)) {
        return true
      }
    }
    return false
  }
  async function ensureResourceExists(resource, minCount = 10) {
    const current = bot.inventory.items().find(item => item.name === resource)
    const currentCount = current ? current.count : 0
    if (currentCount >= minCount) {
      return true
    }
    const blocks = bot.findBlocks({
      matching: (block) => block.name === resource,
      maxDistance: 50,
      count: minCount - currentCount
    })
    if (blocks.length > 0) {
      bot.chat(`Нужен ещё ${minCount - currentCount}x ${resource}`)
      return false 
    }
    return currentCount >= minCount
  }
  return {
    craftItem,
    ensureToolExists,
    ensureResourceExists
  }
}
