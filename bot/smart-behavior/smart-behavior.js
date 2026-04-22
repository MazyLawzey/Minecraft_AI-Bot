module.exports = function (bot, modules) {
  let movements = null
  let shouldStopAll = false  
  
  // DISABLED: Smart behavior is disabled - bot only responds to commands
  // bot.once('spawn', () => {
  //   if (bot.pathfinder) {
  //     movements = new Movements(bot)
  //     bot.pathfinder.setMovements(movements)
  //   }
  // })
  
  let currentGoal = null
  let goalStack = []
  let lastActionTime = 0
  const ACTION_COOLDOWN = 1000
  const GOALS = {
    SURVIVE: 1,      
    RESOURCE_GATHER: 2,  
    EXPLORE: 3,      
    BUILD: 4,        
    TRAVEL: 5        
  }
  
  // DISABLED: Autonomous behavior loop disabled
  // bot.once('spawn', () => {
  //   autonomousBehaviorInterval = setInterval(...)
  // })
  
  function stop() {
    shouldStopAll = true
  }

  return {
    stop: () => {},
    start: () => {},
    isAutonomousMode: () => false
  }
}
