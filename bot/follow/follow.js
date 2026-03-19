const { goals: { GoalFollow } } = require('mineflayer-pathfinder')

module.exports = function(bot) {
  let isFollowing = false
  let followTarget = null
  let followInterval = null

  function startFollowing(targetUsername) {
    followTarget = targetUsername
    isFollowing = true
    bot.chat(`Окей, я иду за ${targetUsername}!`)

    followInterval = setInterval(() => followPlayer(), 500)
  }

  function stopFollowing() {
    followTarget = null
    isFollowing = false
    clearInterval(followInterval)
    followInterval = null
    bot.pathfinder.stop()
    bot.chat('Я перестал следовать за кем‑то.')
  }

  function followPlayer() {
    if (!isFollowing || !followTarget) return

    const player = bot.players[followTarget]?.entity
    if (!player) {
      bot.chat(`${followTarget} не найден.`)
      stopFollowing()
      return
    }

    const { Movements } = require('mineflayer-pathfinder')
    const movements = new Movements(bot)
    bot.pathfinder.setMovements(movements)

    // GoalFollow(entity, дистанция) — держаться в 2 блоках от игрока
    bot.pathfinder.setGoal(new GoalFollow(player, 2), true)
  }

  return {
    startFollowing,
    stopFollowing,
    followPlayer
  }
}
