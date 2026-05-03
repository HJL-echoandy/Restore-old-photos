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

// 标准修复：去噪/去划痕/修复褪色，保持原始构图
const PROMPT_NORMAL = `You are an expert photo restoration AI.
Restore this old or damaged photo: remove noise, scratches, fading, stains and artifacts.
Enhance sharpness and clarity. Correct color balance naturally.
Keep the original composition, faces and scene completely faithful — do not alter or add content.`

// 超清修复：在标准基础上放大到高清，增强细节
const PROMPT_HD = `You are an expert photo restoration and super-resolution AI.
Restore this old or damaged photo to ultra-high-definition quality.
Remove all noise, scratches, fading, stains and compression artifacts.
Enhance fine details: facial features, hair, fabric textures, background edges.
Correct colors to vivid, natural tones. Output should look like a modern high-resolution photograph.
Maintain strict authenticity — do not alter, add or remove any person, object or scene element.`

export async function enhancePhoto(
  imageBuffer: Buffer,
  filename: string,
  type: EnhanceType = 'normal'
): Promise<Buffer> {
  const client = getClient()
  const prompt = type === 'hd' ? PROMPT_HD : PROMPT_NORMAL

  // cubence API 支持 2048x2048，比官方更大
  const size = type === 'hd' ? '2048x2048' : '1024x1024'

  const imageFile = await toFile(imageBuffer, filename, { type: 'image/jpeg' })

  const response = await client.images.edit({
    model: 'gpt-image-2',
    image: imageFile,
    prompt,
    n: 1,
    size: size as any,   // cubence 扩展了尺寸枚举
    response_format: 'b64_json',
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error('gpt-image-2 returned no image data')

  return Buffer.from(b64, 'base64')
}
