import { createClient, RedisClientType } from 'redis'
import { config } from '../config'

let client: RedisClientType

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    }) as RedisClientType

    client.on('error', (err) => console.error('[Redis] error:', err))
    await client.connect()
    console.log('[Redis] connected')
  }
  return client
}

export async function redisGet(key: string): Promise<string | null> {
  const r = await getRedis()
  return r.get(key)
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const r = await getRedis()
  if (ttlSeconds) {
    await r.setEx(key, ttlSeconds, value)
  } else {
    await r.set(key, value)
  }
}

export async function redisDel(key: string): Promise<void> {
  const r = await getRedis()
  await r.del(key)
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number> {
  const r = await getRedis()
  const val = await r.incr(key)
  if (ttlSeconds && val === 1) {
    await r.expire(key, ttlSeconds)
  }
  return val
}
