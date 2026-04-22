const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
const dotenv = require('dotenv')

dotenv.config()

let bot = null
let connectionAttempts = 0
const MAX_RETRY_ATTEMPTS = 0 // Infinite retries

function createBot() {
  bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT),
    username: process.env.MC_USERNAME,
    version: process.env.MC_VERSION
  })

  bot.loadPlugin(pathfinder)

  // Handle connection errors
  bot.on('error', (err) => {
    console.error('Ошибка подключения:', err.message)
    console.log('Повторная попытка через 5 секунд...')
    setTimeout(() => {
      connectionAttempts++
      createBot()
    }, 5000)
  })

  bot.on('end', () => {
    console.log('Соединение разорвано. Переподключение через 5 секунд...')
    setTimeout(() => {
      connectionAttempts++
      createBot()
    }, 5000)
  })

  bot.once('spawn', () => {
    console.log('✅ Бот подключен! Слушаю команды.')
    console.log('Используй /bot [команда] или просто команду если ты один.')
    connectionAttempts = 0
    initializeModules()
  })
}

function initializeModules() {
  const modules = require('./bot/modules/index.js')

  const follower = modules.follow(bot)
  const miner = modules.mine(bot)
  const inv = modules.inventory(bot)
  const attacker = modules.attack(bot)
  const sleeper = modules.sleep(bot)
  const vehicle = modules.vehicle(bot)
  const gatherer = modules.gather(bot)
  const tunneler = modules.tunnel(bot)
  const vision = modules.vision(bot)
  const ai = modules.ai(bot)
  const survival = modules.survival(bot)
  const crafting = modules.crafting(bot)
  const exploration = modules.exploration(bot)
  const memory = modules.memory(bot)
  const strategy = modules.strategy(bot, { 
    follower, miner, inv, attacker, sleeper, vehicle, gatherer, tunneler, vision, survival, crafting, exploration, memory
  })

  modules.speech(bot)
  modules.commands(bot, {
    follower,
    miner,
    inv,
    attacker,
    sleeper,
    vehicle,
    gatherer,
    tunneler,
    vision,
    ai,
    survival,
    crafting,
    exploration,
    memory,
    strategy
  })
}

createBot()
