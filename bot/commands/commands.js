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
      miner.stopMiningTrees()
      attacker.stopAttacking()
      gatherer.stopGathering()
      return
    }

    if (result.intent === 'mine_trees') {
      miner.mineTrees()
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
