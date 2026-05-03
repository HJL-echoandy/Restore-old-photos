import OpenAI, { toFile } from 'openai'
import { config } from '../config'

let openaiClient: OpenAI

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    })
  }
  return openaiClient
}

export type EnhanceType = 'normal' | 'hd'

const PROMPT_NORMAL = `You are an expert photo restoration and enhancement AI.
Restore this old or damaged photo to a clean, modern, high-quality version.
Remove noise, scratches, fading, and artifacts. Enhance sharpness and details.
Keep the original composition, people, and scene faithful to the original.`

const PROMPT_HD = `You are an expert photo restoration and super-resolution AI.
Restore and enhance this old or damaged photo to ultra-high-definition 4K quality.
Remove all noise, scratches, fading, and compression artifacts.
Enhance fine details: facial features, textures, edges.
Correct colors to natural, vivid tones.
Maintain authenticity — do not alter faces or scene content.`

export async function enhancePhoto(
  imageBuffer: Buffer,
  filename: string,
  type: EnhanceType = 'normal'
): Promise<Buffer> {
  const client = getClient()
  const prompt = type === 'hd' ? PROMPT_HD : PROMPT_NORMAL

  const imageFile = await toFile(imageBuffer, filename, { type: 'image/jpeg' })

  const response = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt,
    n: 1,
    size: type === 'hd' ? '1024x1536' : '1024x1024',
    response_format: 'b64_json',
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI returned no image data')

  return Buffer.from(b64, 'base64')
}
