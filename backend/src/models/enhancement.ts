import { query, queryOne, execute } from '../utils/db'

export interface Enhancement {
  id: number
  user_id: number
  original_key: string
  enhanced_key: string | null
  type: 'normal' | 'hd'
  status: 'pending' | 'processing' | 'done' | 'failed'
  credits_used: number
  error_msg: string | null
  created_at: string
}

export async function createEnhancement(
  userId: number,
  originalKey: string,
  type: 'normal' | 'hd',
  creditsUsed: number
): Promise<number> {
  const result = await execute(
    'INSERT INTO enhancements (user_id, original_key, type, credits_used, status) VALUES (?,?,?,?,?)',
    [userId, originalKey, type, creditsUsed, 'pending']
  )
  return result.insertId
}

export async function updateEnhancementDone(id: number, enhancedKey: string): Promise<void> {
  await execute(
    "UPDATE enhancements SET status='done', enhanced_key=? WHERE id=?",
    [enhancedKey, id]
  )
}

export async function updateEnhancementFailed(id: number, errorMsg: string): Promise<void> {
  await execute(
    "UPDATE enhancements SET status='failed', error_msg=? WHERE id=?",
    [errorMsg, id]
  )
}

export async function updateEnhancementProcessing(id: number): Promise<void> {
  await execute("UPDATE enhancements SET status='processing' WHERE id=?", [id])
}

export async function getEnhancementById(id: number): Promise<Enhancement | null> {
  return queryOne<Enhancement>('SELECT * FROM enhancements WHERE id=?', [id])
}

export async function listEnhancements(
  userId: number,
  page = 1,
  pageSize = 20
): Promise<Enhancement[]> {
  const offset = (page - 1) * pageSize
  return query<Enhancement>(
    'SELECT * FROM enhancements WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset]
  )
}
