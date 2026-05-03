import { query, queryOne, execute } from '../utils/db'
import { config } from '../config'

export interface User {
  id: number
  platform: 'wechat' | 'douyin'
  openid: string
  nickname: string
  avatar: string
  credits: number
  total_spent: number
  created_at: string
}

export async function findOrCreateUser(
  platform: 'wechat' | 'douyin',
  openid: string,
  nickname = '',
  avatar = ''
): Promise<User> {
  let user = await queryOne<User>(
    'SELECT * FROM users WHERE platform=? AND openid=?',
    [platform, openid]
  )

  if (!user) {
    const result = await execute(
      'INSERT INTO users (platform, openid, nickname, avatar, credits) VALUES (?,?,?,?,?)',
      [platform, openid, nickname, avatar, config.credits.freeOnRegister]
    )
    user = await queryOne<User>('SELECT * FROM users WHERE id=?', [result.insertId])
  }

  return user!
}

export async function getUserById(id: number): Promise<User | null> {
  return queryOne<User>('SELECT * FROM users WHERE id=?', [id])
}

export async function deductCredits(userId: number, amount: number): Promise<boolean> {
  const result = await execute(
    'UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?',
    [amount, userId, amount]
  )
  return result.affectedRows > 0
}

export async function addCredits(userId: number, amount: number): Promise<void> {
  await execute('UPDATE users SET credits = credits + ? WHERE id = ?', [amount, userId])
}

export async function addTotalSpent(userId: number, amount: number): Promise<void> {
  await execute('UPDATE users SET total_spent = total_spent + ? WHERE id = ?', [amount, userId])
}
