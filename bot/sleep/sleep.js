const { goals: { GoalNear } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')

module.exports = function (bot) {
  const movements = new Movements(bot)

  async function sleepInBed() {
    const bed = bot.findBlock({
      matching: block => bot.isABed(block),
      maxDistance: 32
    })

    if (!bed) {
      bot.chat('Кровать не найдена. Да и вообще, роскошь это.')
      return
    }

    try {
      bot.pathfinder.setMovements(movements)
      await bot.pathfinder.goto(new GoalNear(bed.position.x, bed.position.y, bed.position.z, 1))
      await bot.sleep(bed)
      bot.chat('Всё, я сплю. Не мешай моему цифровому отдыху.')
    } catch {
      bot.chat('Не смог лечь спать. Видимо, судьба против сна.')
    }
  }

  async function wakeUp() {
    try {
      await bot.wake()
      bot.chat('Проснулся. К сожалению.')
    } catch {
      bot.chat('Я и так не сплю, просто существую.')
    }
  }

  return {
    sleepInBed,
    wakeUp
  }
}
