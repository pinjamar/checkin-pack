import { GoogleGenerativeAI } from '@google/generative-ai'

export function getGeminiModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export async function generateContent(apiKey: string, prompt: string): Promise<string> {
  try {
    const model = getGeminiModel(apiKey)
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error: any) {
    console.error('Gemini API error:', error.message)
    throw new Error('AI generation failed. Please try again.')
  }
}
