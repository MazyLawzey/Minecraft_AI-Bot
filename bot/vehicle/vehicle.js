const { goals: { GoalNear } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')

module.exports = function (bot) {
  const movements = new Movements(bot)

  function findNearestBoat() {
    return bot.nearestEntity(entity => {
      if (!entity || !entity.name) return false
      return entity.name === 'boat' || entity.name === 'chest_boat'
    })
  }

  async function enterBoat() {
    const boat = findNearestBoat()

    if (!boat) {
      bot.chat('Лодки рядом нет. Придётся тонуть по старинке.')
      return
    }

    try {
      bot.pathfinder.setMovements(movements)
      await bot.pathfinder.goto(new GoalNear(boat.position.x, boat.position.y, boat.position.z, 1))
      await bot.mount(boat)
      bot.chat('Сел в лодку. Моряк из меня, конечно, сомнительный.')
    } catch {
      bot.chat('Не смог сесть в лодку. Очень унизительно.')
    }
  }

  async function leaveVehicle() {
    try {
      await bot.dismount()
      bot.chat('Вылез. Наземная жизнь снова зовёт.')
    } catch {
      bot.chat('Мне не из чего вылезать. Всё как в жизни.')
    }
  }

  return {
    enterBoat,
    leaveVehicle
  }
}
