module.exports = function (bot) {
  let isTunneling = false

  const PICKAXE_PRIORITY = {
    netherite_pickaxe: 5,
    diamond_pickaxe: 4,
    iron_pickaxe: 3,
    stone_pickaxe: 2,
    golden_pickaxe: 1,
    wooden_pickaxe: 0
  }

  async function equipBestPickaxe() {
    const pickaxes = bot.inventory.items().filter(item => item.name in PICKAXE_PRIORITY)

    if (pickaxes.length === 0) {
      bot.chat('У меня нет кирки. Шахтёр мечты.')
      return false
    }

    pickaxes.sort((a, b) => PICKAXE_PRIORITY[b.name] - PICKAXE_PRIORITY[a.name])
    const bestPickaxe = pickaxes[0]

    try {
      await bot.equip(bestPickaxe, 'hand')
      await sleep(150)
      return bot.heldItem && bot.heldItem.name === bestPickaxe.name
    } catch {
      bot.chat('Не смог взять кирку.')
      return false
    }
  }

  function getForwardBlocks() {
    const pos = bot.entity.position
    const yaw = bot.entity.yaw

    let dx = 0
    let dz = 0

    if (yaw >= -Math.PI / 4 && yaw < Math.PI / 4) {
      dz = 1
    } else if (yaw >= Math.PI / 4 && yaw < 3 * Math.PI / 4) {
      dx = -1
    } else if (yaw >= -3 * Math.PI / 4 && yaw < -Math.PI / 4) {
      dx = 1
    } else {
      dz = -1
    }

    const baseX = Math.floor(pos.x) + dx
    const baseY = Math.floor(pos.y)
    const baseZ = Math.floor(pos.z) + dz

    return {
      feet: bot.blockAt(bot.entity.position.offset(dx, 0, dz)),
      head: bot.blockAt(bot.entity.position.offset(dx, 1, dz)),
      floor: bot.blockAt(bot.entity.position.offset(dx, -1, dz)),
      dx,
      dz,
      baseX,
      baseY,
      baseZ
    }
  }

  async function digBlock(block) {
    if (!block || block.type === 0) return
    try {
      await bot.dig(block)
      await sleep(200)
    } catch {}
  }

  async function moveForwardOneBlock(dx, dz) {
    bot.setControlState('forward', true)
    await sleep(450)
    bot.setControlState('forward', false)

    // если чуть застрял — небольшая коррекция
    const pos = bot.entity.position
    const targetX = Math.floor(pos.x + dx)
    const targetZ = Math.floor(pos.z + dz)

    await sleep(100)
  }

  async function collectNearbyDrops() {
    const items = Object.values(bot.entities)
      .filter(entity => entity && entity.name === 'item' && entity.position)
      .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))

    for (const item of items) {
      if (!item.isValid) continue

      try {
        await bot.lookAt(item.position, true)
        bot.setControlState('forward', true)
        await sleep(300)
        bot.setControlState('forward', false)
      } catch {}
    }
  }

  async function startTunneling() {
    if (isTunneling) {
      bot.chat('Я уже копаю тоннель. Не так быстро, архитектор.')
      return
    }

    isTunneling = true
    bot.chat('Начинаю копать тоннель вперёд. Если что, это был твой план.')

    while (isTunneling) {
      const hasPickaxe = await equipBestPickaxe()
      if (!hasPickaxe) {
        bot.chat('Без кирки тоннель как-то не вдохновляет.')
        break
      }

      const { feet, head, floor, dx, dz } = getForwardBlocks()

      // Не копаем опору под собой, но проверяем чтобы впереди был пол
      if (!floor || floor.type === 0) {
        bot.chat('Впереди нет пола. Падать я сегодня не хочу.')
        break
      }

      // Копаем 2 блока высотой
      if (head && head.type !== 0) {
        await digBlock(head)
      }

      if (feet && feet.type !== 0) {
        await digBlock(feet)
      }

      // После расчистки идём вперёд
      const nextFeet = bot.blockAt(bot.entity.position.offset(dx, 0, dz))
      const nextHead = bot.blockAt(bot.entity.position.offset(dx, 1, dz))

      if (
        nextFeet && nextFeet.type === 0 &&
        nextHead && nextHead.type === 0
      ) {
        await moveForwardOneBlock(dx, dz)
        await collectNearbyDrops()
      } else {
        await sleep(200)
      }

      await sleep(150)
    }

    isTunneling = false
    bot.setControlState('forward', false)
    bot.chat('Тоннель больше не копаю.')
  }

  function stopTunneling() {
    isTunneling = false
    bot.stopDigging()
    bot.setControlState('forward', false)
    bot.chat('Ладно, тоннель отменяется.')
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return {
    startTunneling,
    stopTunneling
  }
}
