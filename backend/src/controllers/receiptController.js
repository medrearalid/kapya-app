import { analyzeReceiptImage } from '../services/geminiService.js'

export const postAnalyzeReceipt = async (request, response, next) => {
  try {
    const { imageBase64 } = request.body ?? {}
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return response.status(400).json({
        success: false,
        error: 'Gecersiz istek govdesi. imageBase64 alani zorunludur.',
      })
    }

    const items = await analyzeReceiptImage({ imageBase64 })
    return response.status(200).json({
      success: true,
      data: items,
    })
  } catch (error) {
    next(error)
  }
}