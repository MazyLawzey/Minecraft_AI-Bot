const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
const dotenv = require('dotenv')

dotenv.config()

const bot = mineflayer.createBot({
  host: process.env.MC_HOST,
  port: parseInt(process.env.MC_PORT),
  username: process.env.MC_USERNAME,
  version: process.env.MC_VERSION
})

bot.loadPlugin(pathfinder)

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
  ai
})
