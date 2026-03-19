const { goals: { GoalNear } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')

module.exports = function(bot) {

  // ✅ Исправленный collectItems
  async function collectItems() {
    const entities = Object.values(bot.entities)
    const items = entities.filter(e => e.name === 'item')

    if (items.length === 0) {
      bot.chat('Рядом нет предметов.')
      return
    }

    bot.chat(`Вижу ${items.length} предмет(ов), собираю!`)

    const movements = new Movements(bot)
    bot.pathfinder.setMovements(movements)

    for (const item of items) {
      if (!item.isValid) continue

      try {
        await bot.pathfinder.goto(new GoalNear(
          item.position.x,
          item.position.y,
          item.position.z,
          1
        ))
        await sleep(300)
      } catch (e) {}
    }

    bot.chat('Готово!')
  }

  // Бросить конкретный предмет по названию
  async function dropItem(itemName, count = 1) {
    const item = bot.inventory.items().find(i => i.name === itemName)

    if (!item) {
      bot.chat(`У меня нет ${itemName}.`)
      return
    }

    try {
      await bot.toss(item.type, null, count)
      bot.chat(`Бросил ${count}x ${itemName}!`)
    } catch (e) {
      bot.chat(`Не удалось бросить ${itemName}.`)
    }
  }

  // Бросить всё из инвентаря (кроме топоров)
  async function dropAll(except = []) {
    const items = bot.inventory.items().filter(i => !except.includes(i.name))

    if (items.length === 0) {
      bot.chat('Инвентарь пуст.')
      return
    }

    bot.chat(`Выбрасываю ${items.length} видов предметов...`)

    for (const item of items) {
      try {
        await bot.toss(item.type, null, item.count)
        await sleep(200)
      } catch (e) {}
    }

    bot.chat('Готово, инвентарь очищен!')
  }

  // Показать инвентарь в чате
  function showInventory() {
    const items = bot.inventory.items()

    if (items.length === 0) {
      bot.chat('Мой инвентарь пуст.')
      return
    }

    const list = items.map(i => `${i.name} x${i.count}`).join(', ')
    bot.chat(`Инвентарь: ${list}`)
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return {
    collectItems,
    dropItem,
    dropAll,
    showInventory
  }
}
