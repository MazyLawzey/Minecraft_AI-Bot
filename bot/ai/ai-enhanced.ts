import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIModule {
  askAI: (username: string, message: string) => Promise<string>
  setAutonomousMode: (mode: boolean) => void
  isAutonomous: () => boolean
}

function createAIModule(bot: any): AIModule {
  const history: Message[] = []
  let isBusy = false
  let autonomousMode = true

  async function askAI(username: string, message: string): Promise<string> {
    if (isBusy) {
      return 'Подожди. Я сейчас занят.'
    }
    
    isBusy = true
    try {
      const systemPrompt = `
Ты — умный Minecraft бот по имени ${bot.username}.
Ты отвечаешь только на русском языке и очень кратко (1-2 предложения).
Отвечай ТОЛЬКО текстом, без JSON!
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
          num_predict: 100
        }
      }, {
        timeout: 180000
      })
      
      const elapsed = Date.now() - startTime
      console.log(`✅ AI ответил за ${elapsed}ms`)
      
      let content = response.data?.message?.content?.trim()
      
      if (!content) {
        content = 'Мысль была, но умерла по дороге.'
      }

      // Очистить ответ от markdown форматирования если оно есть
      content = content
        .replace(/```[\s\S]*?```/g, '') // Удалить code blocks
        .replace(/\*\*/g, '')           // Удалить жирный текст
        .replace(/\*/g, '')             // Удалить курсив
        .trim()

      history.push({
        role: 'assistant',
        content
      })

      return content
    } catch (error: any) {
      console.error('AI Error:', error.message)
      return 'Локальный мозг опять завис.'
    } finally {
      isBusy = false
    }
  }

  function setAutonomousMode(mode: boolean): void {
    autonomousMode = mode
  }

  return {
    askAI,
    setAutonomousMode,
    isAutonomous: () => autonomousMode
  }
}

module.exports = createAIModule
