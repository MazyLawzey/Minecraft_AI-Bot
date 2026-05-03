
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
Твоя задача: Вернуть JSON с правильным решением. ТОЛЬКО JSON.
Примеры:
{"intent":"chat","reply":"привет!","target":null,"count":null,"item":null}
{"intent":"mine_trees","reply":"рубим!","target":"wood","count":5,"item":null}
      `.trim()

      console.log('📤 Отправляю AI запрос...')
      history.push({
        role: 'user',
        content: `${username}: ${message}`
      })

      const startTime = Date.now()
      const response = await axios.post('http://127.0.0.1:11434/api/chat', {
        model: 'gemma2',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-14)
        ],
        options: {
          temperature: 0.5,
          num_predict: 80
        }
      }, {
        timeout: 180000
      })
      const elapsed = Date.now() - startTime
      console.log(`✅ AI ответил за ${elapsed}ms`)
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

      let parsed
      try {
        // Try direct JSON parse
        parsed = JSON.parse(content)
        console.log('✅ JSON распарсен напрямую')
      } catch (e) {
        console.log('❌ Прямой JSON не сработал, пробую извлечь...')
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1].trim())
            console.log('✅ JSON извлечен из markdown блока')
          } catch {
            // Try to find any JSON object in the response
            const objMatch = content.match(/\{[\s\S]*\}/)
            if (objMatch) {
              parsed = JSON.parse(objMatch[0])
              console.log('✅ JSON найден в тексте')
            } else {
              throw new Error('No JSON found')
            }
          }
        } else {
          // Try to find any JSON object in the response
          const objMatch = content.match(/\{[\s\S]*\}/)
          if (objMatch) {
            parsed = JSON.parse(objMatch[0])
            console.log('✅ JSON найден в тексте')
          } else {
            throw new Error('No JSON found')
          }
        }
      }
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
