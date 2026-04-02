const { goals: { GoalNear, GoalXZ } } = require('mineflayer-pathfinder')
const { Movements } = require('mineflayer-pathfinder')

module.exports = function (bot) {
  let isHandlingEmergency = false
  let lastFoodCount = 0
  let movements = null

  bot.once('spawn', () => {
    if (bot.pathfinder) {
      movements = new Movements(bot)
      bot.pathfinder.setMovements(movements)
    }
  })

  let survivalInterval = null
  bot.once('spawn', () => {
    survivalInterval = setInterval(() => {
      checkSurvivalNeeds()
    }, 2000)
  })

  async function checkSurvivalNeeds() {
    try {
      if (bot.health < 5 && !isHandlingEmergency) {
        await handleLowHealth()
      }

      if (bot.food < 15) {
        await handleHunger()
      }

      const hostileMobs = getNearbyHostileMobs(15)
      if (hostileMobs.length > 0 && bot.health > 3) {
        await handleThreat(hostileMobs)
      }
    } catch (e) {
    }
  }

  async function handleLowHealth() {
    isHandlingEmergency = true
    try {
      bot.chat('⚠️ Здоровье критическое! Спасаюсь!')

      const beds = bot.findBlocks({
        matching: (block) => block.name.includes('bed'),
        maxDistance: 50,
        count: 1
      })

      if (beds.length > 0) {
        const bed = bot.blockAt(beds[0])
        await bot.pathfinder.goto(new GoalNear(bed.position.x, bed.position.y, bed.position.z, 1))
        await sleep(300)
        await bot.sleep(bed)
        await sleep(5000)
        bot.chat('Восстановился в кровати.')
      } else {
        await moveAwayFromDanger(20)
        bot.chat('Бегу к спасению!')
      }
    } catch (e) {
      console.error('Ошибка при обработке низкого здоровья:', e.message)
    } finally {
      isHandlingEmergency = false
    }
  }

  async function handleHunger() {
    try {
      const foodItems = [
        'cooked_beef', 'cooked_pork', 'cooked_chicken', 'cooked_mutton',
        'cooked_rabbit', 'cooked_cod', 'cooked_salmon',
        'bread', 'apple', 'baked_potato', 'cookie'
      ]

      const food = bot.inventory.items().find(item => foodItems.includes(item.name))

      if (food) {
        await bot.equip(food, 'hand')
        await sleep(100)
        await bot.consume()
        bot.chat(`Поел ${food.name}. Ммм!`)
      } else {
        bot.chat('Голоден, но еды нет. Время охотиться!')
        // Ищем животных для охоты
        const animals = Object.values(bot.entities).filter(entity =>
          ['cow', 'pig', 'chicken', 'sheep', 'rabbit'].includes(entity.name) &&
          entity.position.distanceTo(bot.entity.position) < 30
        )

        if (animals.length > 0) {
          const animal = animals[0]
          await bot.attack(animal)
        }
      }
    } catch (e) {
      console.error('Ошибка при обработке голода:', e.message)
    }
  }

  async function handleThreat(mobs) {
    try {
      const mob = mobs[0]
      const distance = mob.position.distanceTo(bot.entity.position)

      if (distance < 5) {
        // Враг близко - бежим или строим укрытие
        await moveAwayFromDanger(20)
        bot.chat('Враг близко! Спасаюсь!')
      } else {
        // Атакуем
        const { attack } = require('../attack/attack.js')
        if (attack) {
          attack(bot).startAttacking(mob.name)
        }
      }
    } catch (e) {
      console.error('Ошибка при обработке угрозы:', e.message)
    }
  }

  function getNearbyHostileMobs(distance = 20) {
    const hostileNames = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'slime']
    return Object.values(bot.entities).filter(entity =>
      hostileNames.includes(entity.name) &&
      entity.position.distanceTo(bot.entity.position) < distance
    )
  }

  async function moveAwayFromDanger(distance) {
    try {
      const pos = bot.entity.position
      const randomX = Math.random() * 2 - 1
      const randomZ = Math.random() * 2 - 1
      const magnitude = Math.sqrt(randomX * randomX + randomZ * randomZ)

      const targetX = pos.x + (randomX / magnitude) * distance
      const targetZ = pos.z + (randomZ / magnitude) * distance

      await bot.pathfinder.goto(new GoalXZ(targetX, targetZ))
    } catch (e) {
      console.error('Ошибка при бегстве:', e.message)
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return {
    checkSurvivalNeeds,
    getNearbyHostileMobs,
    getStatus: () => ({
      health: bot.health,
      food: bot.food,
      threats: getNearbyHostileMobs()
    })
  }
}
