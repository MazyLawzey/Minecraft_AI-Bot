module.exports = function(bot) {
  bot.once('spawn', function() {
    bot.chat(`Привет, я ${bot.username}!`)
  })
}
