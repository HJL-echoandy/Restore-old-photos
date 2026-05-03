import { queryOne, execute } from '../utils/db'
import { v4 as uuid } from 'uuid'

export interface Order {
  id: number
  user_id: number
  platform: 'wechat' | 'douyin'
  pack_id: string
  out_trade_no: string
  amount: number
  credits: number
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at: string | null
  created_at: string
}

export function generateOutTradeNo(): string {
  return `PR${Date.now()}${uuid().replace(/-/g, '').slice(0, 8)}`
}

export async function createOrder(
  userId: number,
  platform: 'wechat' | 'douyin',
  packId: string,
  amount: number,
  credits: number
): Promise<Order> {
  const outTradeNo = generateOutTradeNo()
  const result = await execute(
    'INSERT INTO orders (user_id, platform, pack_id, out_trade_no, amount, credits) VALUES (?,?,?,?,?,?)',
    [userId, platform, packId, outTradeNo, amount, credits]
  )
  return (await queryOne<Order>('SELECT * FROM orders WHERE id=?', [result.insertId]))!
}

export async function getOrderByOutTradeNo(outTradeNo: string): Promise<Order | null> {
  return queryOne<Order>('SELECT * FROM orders WHERE out_trade_no=?', [outTradeNo])
}

export async function markOrderPaid(outTradeNo: string): Promise<Order | null> {
  await execute(
    "UPDATE orders SET status='paid', paid_at=NOW() WHERE out_trade_no=? AND status='pending'",
    [outTradeNo]
  )
  return getOrderByOutTradeNo(outTradeNo)
}
