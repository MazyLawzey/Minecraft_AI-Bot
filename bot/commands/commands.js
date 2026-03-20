module.exports = function (bot, {
  follower,
  miner,
  inv,
  attacker,
  sleeper,
  vehicle,
  gatherer,
  tunneler,
  vision,
  ai
}) {
  function callIfFunction(obj, methodName, ...args) {
    if (!obj || typeof obj[methodName] !== 'function') return false
    obj[methodName](...args)
    return true
  }

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return

    const result = await ai.askAI(username, message)
    if (!result) return

    if (result.reply) {
      bot.chat(String(result.reply).slice(0, 200))
    }

    if (result.intent === 'follow') {
      follower.startFollowing(username)
      return
    }

    if (result.intent === 'stop') {
      follower.stopFollowing()
      callIfFunction(miner, 'stopMiningTrees') || callIfFunction(miner, 'stopGathering')
      attacker.stopAttacking()
      gatherer.stopGathering()
      return
    }

    if (result.intent === 'mine_trees') {
      callIfFunction(miner, 'mineTrees') || callIfFunction(miner, 'gather', 'wood')
      return
    }

    if (result.intent === 'collect_items') {
      inv.collectItems()
      return
    }

    if (result.intent === 'show_inventory') {
      inv.showInventory()
      return
    }

    if (result.intent === 'drop_all') {
      inv.dropAll([
        'netherite_axe',
        'diamond_axe',
        'iron_axe',
        'netherite_sword',
        'diamond_sword',
        'iron_sword',
        'diamond_pickaxe',
        'iron_pickaxe',
        'netherite_pickaxe'
      ])
      return
    }

    if (result.intent === 'drop_item') {
      inv.dropItem(result.item, result.count || 1)
      return
    }

    if (result.intent === 'attack') {
      attacker.startAttacking(result.target || null)
      return
    }

    if (result.intent === 'sleep') {
      sleeper.sleepInBed()
      return
    }

    if (result.intent === 'wake') {
      sleeper.wakeUp()
      return
    }

    if (result.intent === 'enter_boat') {
      vehicle.enterBoat()
      return
    }

    if (result.intent === 'leave_vehicle') {
      vehicle.leaveVehicle()
      return
    }

    if (result.intent === 'gather') {
      gatherer.gather(result.target || 'stone')
      return
    }

    if (result.intent === 'start_tunnel') {
      tunneler.startTunneling()
      return
    }

    if (result.intent === 'stop_tunnel') {
      tunneler.stopTunneling()
      return
    }

    if (result.intent === 'describe_image') {
      try {
        const description = await vision.describeImage(result.target || undefined)
        if (description) {
          bot.chat(String(description).slice(0, 200))
        } else {
          bot.chat('Я ничего не смог разглядеть.')
        }
      } catch (err) {
        bot.chat('Не смог обработать изображение.')
      }
      return
    }

    if (result.intent === 'chat') {
      return
    }

    if (message === 'копай тоннель') {
        tunneler.startTunneling()
        return
    }

    if (message === 'прекрати копать тоннель') {
        tunneler.stopTunneling()
        return
    }


    if (message === 'включи зрение') {
        vision.describeImage()
        return
    }

    if (message === 'выключи зрение') {
        vision.describeImage()
        return
    }
  })
}
