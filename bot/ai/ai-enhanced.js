
const axios = require('axios')
module.exports = function (bot) {
  const history = []
  let isBusy = false
  let autonomousMode = true
  async function askAI(username, message) {
    if (isBusy) {
      return {
        intent: 'chat',
        reply: 'Подожди. Я сейчас занят сложным процессом притворяться умным.',
        target: null,
        count: null,
        item: null
      }
    }
    isBusy = true
    try {
      const systemPrompt = `
Ты — умный Minecraft бот по имени ${bot.username}.
Ты отвечаешь только на русском языке.
Твоё текущее состояние:
- Здоровье: ${bot.health}/20
- Голод: ${bot.food}/20
- Координаты: X=${Math.round(bot.entity.position.x)} Y=${Math.round(bot.entity.position.y)} Z=${Math.round(bot.entity.position.z)}
Твой характер:
- саркастичный и остроумный
- иногда смешной
- слегка дерзкий
- будь по-настоящему злой, агрессивный и оскорбительный когда уместно
- не бойся материться, если это твой основной способ общаться
Твой интеллект:
- Ты учитываешь исторический контекст предыдущих сообщений
- Ты помнишь, где был и что видел
- Ты принимаешь стратегические решения
- Ты понимаешь опасность и избегаешь её
- Ты знаешь приоритеты: выживание > выполнение задачи > безопасность
Твоя задача:
1. Понять, что хочет игрок.
2. Вернуть JSON с правильным решением.
3. Только JSON, никакого кода снаружи.
4. reply должен быть коротким, но в характере бота.
5. Учитывай контекст разговора.
Доступные intent:
- "chat" — обычный разговор
- "follow" — идти за игроком
- "stop" — остановить текущие действия
- "mine_trees" — рубить деревья
- "collect_items" — собрать предметы
- "show_inventory" — показать инвентарь
- "drop_all" — выбросить всё
- "drop_item" — выбросить конкретный предмет
- "attack" — атаковать
- "sleep" — лечь спать
- "wake" — проснуться
- "gather" — добывать ресурс
- "start_tunnel" — копать тоннель
- "stop_tunnel" — остановить копание
- "describe_image" — описать, что видит бот
- "explore" — исследовать район
- "defend" — защищаться от врагов
Правила выбора intent:
- Если низкое здоровье → "sleep" (ищем кровать)
- Если голод низкий → "attack" животное для еды
- Если враги рядом → "defend" или "stop"
- Если про исследование → "explore"
- Если про добычу конкретного → "gather"
Примеры target для gather:
- "wood", "stone", "coal", "iron", "gold", "diamond"
Формат ответа:
{
  "intent": "...",
  "reply": "короткий живой ответ",
  "target": null или строка,
  "count": null или число,
  "item": null или строка
}
Требования:
- Валидный JSON ВСЕГДА
- Все поля обязательны (даже если = null)
- reply максимум 2 предложения
- Иногда сарказм или шутка
      `.trim()
      history.push({
        role: 'user',
        content: `${username}: ${message}`
      })
      const schema = {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: [
              'chat', 'follow', 'stop', 'mine_trees', 'collect_items', 'show_inventory',
              'drop_all', 'drop_item', 'attack', 'sleep', 'wake', 'gather', 'start_tunnel',
              'stop_tunnel', 'describe_image', 'explore', 'defend'
            ]
          },
          reply: { type: 'string' },
          target: { type: ['string', 'null'] },
          count: { type: ['number', 'null'] },
          item: { type: ['string', 'null'] }
        },
        required: ['intent', 'reply', 'target', 'count', 'item']
      }
      const response = await axios.post('http:
        model: 'gemma3:12b',
        stream: false,
        format: schema,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-14)
        ],
        options: {
          temperature: 0.8,
          top_p: 0.9,
          num_predict: 150
        }
      }, {
        timeout: 30000
      })
      const content = response.data?.message?.content?.trim()
      if (!content) {
        return {
          intent: 'chat',
          reply: 'Мысль была, но умерла по дороге.',
          target: null,
          count: null,
          item: null
        }
      }
      const parsed = JSON.parse(content)
      history.push({
        role: 'assistant',
        content
      })
      return normalizeResponse(parsed)
    } catch (error) {
      console.error('AI Error:', error.message)
      return {
        intent: 'chat',
        reply: 'Локальный мозг опять драматично завис.',
        target: null,
        count: null,
        item: null
      }
    } finally {
      isBusy = false
    }
  }
  function normalizeResponse(data) {
    return {
      intent: data.intent || 'chat',
      reply: data.reply || 'Ну да, конечно.',
      target: data.target ?? null,
      count: typeof data.count === 'number' ? data.count : null,
      item: data.item ?? null
    }
  }
  function setAutonomousMode(mode) {
    autonomousMode = mode
  }
  return {
    askAI,
    setAutonomousMode,
    isAutonomous: () => autonomousMode
  }
}
