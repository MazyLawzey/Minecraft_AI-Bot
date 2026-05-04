const axios = require('axios')
const fs = require('fs')
const path = require('path')

module.exports = function (bot) {
  const history = []
  const requestQueue = []
  let processingRequest = false
  const MAX_QUEUE_SIZE = 5

  function sanitizeMessage(msg) {
    // Удалить управляющие символы и заменить потенциально проблемные символы на безопасные
    return msg.replace(/[\x00-\x1F\x7F-\x9F]/g, '').replace(/[^\x00-\x7F\u0400-\u04FF\s\!\?\.\,\:\;\-\+\=\*\(\)\[\]\{\}]/g, '?');
  }

  // Load prompts from file
  let basicPrompt = ''
  try {
    const promptsPath = path.join(__dirname, 'prompts.txt')
    const content = fs.readFileSync(promptsPath, 'utf8')
    const basicMatch = content.match(/=== BASIC PROMPT.*?\n([\s\S]*?)(?===|$)/)
    basicPrompt = basicMatch ? basicMatch[1].trim() : ''
  } catch (err) {
    console.error('Не удалось загрузить prompts.txt:', err.message)
  }

  async function processQueue() {
    if (processingRequest || requestQueue.length === 0) return

    processingRequest = true
    const { username, message, resolve, reject } = requestQueue.shift()

    try {
      const result = await processAIRequest(username, message)
      resolve(result)
    } catch (error) {
      console.error('Ошибка в очереди:', error.message)
      reject(error)
    } finally {
      processingRequest = false
      if (requestQueue.length > 0) {
        setImmediate(() => processQueue())
      }
    }
  }

  async function askAI(username, message) {
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
      return {
        intent: 'chat',
        reply: 'Слишком много запросов! Подожди немного.',
        target: null,
        count: null,
        item: null
      }
    }

    return new Promise((resolve, reject) => {
      requestQueue.push({
        username,
        message,
        resolve,
        reject
      })

      processQueue()
    })
  }

  async function processAIRequest(username, message) {
    try {
      const systemPrompt = basicPrompt.replace('{USERNAME}', username)

      let prompt = systemPrompt + '\n\nИгрок: ' + message + '\nОтвет:'

      history.push({
        role: 'user',
        content: `${username}: ${message}`
      })

      const response = await axios.post('http://127.0.0.1:11434/api/generate', {
        model: 'gemma2',
        prompt: prompt,
        stream: false
      }, {
        timeout: 5000 // Reduced from 20s to 5s
      })

      let content = response.data?.response?.trim()

      if (!content) {
        return {
          intent: 'chat',
          reply: 'Думаю',
          target: null,
          count: null,
          item: null
        }
      }

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          return {
            intent: 'chat',
            reply: sanitizeMessage(content.slice(0, 100)),
            target: null,
            count: null,
            item: null
          }
        }
      }

      history.push({
        role: 'assistant',
        content: JSON.stringify(parsed)
      })

      return normalizeResponse(parsed)
    } catch (error) {
      console.error('AI ошибка:', error.message)

      if (error.response?.status === 404) {
        console.error('⚠️ Модель gemma3:12b не найдена! Установите её: ollama pull gemma3:12b')
      }

      return {
        intent: 'chat',
        reply: 'Мозг чё-то заглючил...',
        target: null,
        count: null,
        item: null
      }
    }
  }

  function normalizeResponse(data) {
    return {
      intent: data.intent || 'chat',
      reply: sanitizeMessage(data.reply || 'Ну да.'),
      target: data.target ?? null,
      count: typeof data.count === 'number' ? data.count : null,
      item: data.item ?? null
    }
  }

  return {
    askAI,
    getQueueSize: () => requestQueue.length
  }
}
