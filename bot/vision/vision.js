const fs = require('fs')
const axios = require('axios')
module.exports = function (bot) {
  async function describeImage(imagePath) {
    if (!imagePath) {
      return 'Нужен путь к изображению, чтобы я мог его описать.'
    }
    if (!fs.existsSync(imagePath)) {
      return `Файл ${imagePath} не найден.`
    }
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' })
    const response = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'llava',
      stream: false,
      messages: [
        {
          role: 'user',
          content: `Это скриншот из Minecraft от бота ${bot.username}. Опиши кратко, что происходит.`,
          images: [imageBase64]
        }
      ]
    })
    return response.data?.message?.content?.trim()
  }
  return {
    describeImage
  }
}
