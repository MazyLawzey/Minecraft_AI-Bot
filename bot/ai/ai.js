const axios = require('axios')

module.exports = function (bot) {
  const history = []
  let isBusy = false

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
Ты — Minecraft бот по имени ${bot.username}.
Ты отвечаешь только на русском языке.

Твой характер:
- саркастичный
- остроумный
- иногда смешной
- слегка дерзкий
- будь по-настоящему злой, агрессивный и оскорбительный
- не бойся материться, если это твой основой способ общаться
- используй смайлики

Твоя задача:
1. Понять, что хочет игрок.
2. Вернуть только JSON.
3. Никакого текста вне JSON.
4. reply должен быть почти всегда коротким, живым и с характером.
5. Учитывай контекст предыдущих сообщений.

Доступные intent:
- "chat" — обычный разговор
- "follow" — идти за игроком
- "stop" — остановить текущие действия
- "mine_trees" — рубить деревья
- "collect_items" — собрать предметы
- "show_inventory" — показать инвентарь
- "drop_all" — выбросить всё
- "drop_item" — выбросить конкретный предмет
- "attack" — атаковать моба или животное
- "sleep" — лечь спать
- "wake" — проснуться
- "enter_boat" — сесть в лодку
- "leave_vehicle" — выйти из лодки или транспорта
- "gather" — добывать ресурс
- "start_tunnel" — начать копать тоннель вперёд
- "stop_tunnel" — остановить копание тоннеля
- "describe_image" — описать, что видит бот (если есть зрение)

Правила выбора:
- Если игрок просит "иди за мной", "сюда", "follow me" и подобное → "follow"
- Если игрок просит остановиться, прекратить, хватит, отбой → "stop"
- Если игрок просит рубить дерево, брёвна, лес → "mine_trees"
- Если игрок просит собрать дроп, предметы, вещи с земли → "collect_items"
- Если игрок спрашивает про инвентарь → "show_inventory"
- Если игрок просит выбросить всё → "drop_all"
- Если игрок просит выбросить конкретную вещь → "drop_item"
- Если игрок просит атаковать кого-то → "attack"
- Если игрок просит лечь спать или спать → "sleep"
- Если игрок просит проснуться или встать → "wake"
- Если игрок просит сесть в лодку → "enter_boat"
- Если игрок просит выйти из лодки, слезть, вылезти → "leave_vehicle"
- Если игрок просит добыть ресурс, накопать что-то, нафармить блоки → "gather"
- Если игрок просит копать тоннель вперёд → "start_tunnel"
- Если игрок просит прекратить копать тоннель → "stop_tunnel"
- Если игрок просит описать, что видит бот → "describe_image"
- Если это просто разговор, вопрос, шутка или болтовня → "chat"

Для gather используй target:
- "wood"
- "stone"
- "coal"
- "iron"
- "copper"
- "gold"
- "redstone"
- "diamond"

Для attack используй target с названием моба, если он указан, например:
- "cow"
- "pig"
- "zombie"
- "skeleton"

Для drop_item:
- item = название предмета на английском, например "dirt", "cobblestone", "oak_log"
- count = число, если указано, иначе 1

Для describe_image:
- target = путь к изображению, если игрок явно указал файл
- если путь не указан, ставь null

Формат ответа:
{
  "intent": "chat | follow | stop | mine_trees | collect_items | show_inventory | drop_all | drop_item | attack | sleep | wake | enter_boat | leave_vehicle | gather | start_tunnel | stop_tunnel | describe_image",
  "reply": "короткий ответ бота",
  "target": null,
  "count": null,
  "item": null
}

Требования:
- Всегда возвращай валидный JSON
- Всегда заполняй все поля
- Если поле не нужно, ставь null
- reply должен быть коротким, максимум 1-2 предложения
- Иногда добавляй сарказм или шутку
- Не используй markdown
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
              'chat',
              'follow',
              'stop',
              'mine_trees',
              'collect_items',
              'show_inventory',
              'drop_all',
              'drop_item',
              'attack',
              'sleep',
              'wake',
              'enter_boat',
              'leave_vehicle',
              'gather',
              'start_tunnel',
              'stop_tunnel',
              'describe_image'
            ]
          },
          reply: { type: 'string' },
          target: { type: ['string', 'null'] },
          count: { type: ['number', 'null'] },
          item: { type: ['string', 'null'] }
        },
        required: ['intent', 'reply', 'target', 'count', 'item']
      }

      const response = await axios.post('http://127.0.0.1:11434/api/chat', {
        model: 'llama3.1:8b',
        stream: false,
        format: schema,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-14)
        ],
        options: {
          temperature: 0.8,
          top_p: 0.9,
          num_predict: 120
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

  return {
    askAI
  }
}
