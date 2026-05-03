/**
 * 运行此脚本初始化数据库表结构
 * 执行: npm run db:init
 */
import { execute, getPool } from './db'

const SQL_USERS = `
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  platform      ENUM('wechat','douyin') NOT NULL,
  openid        VARCHAR(128) NOT NULL,
  nickname      VARCHAR(64) DEFAULT '',
  avatar        VARCHAR(512) DEFAULT '',
  credits       INT UNSIGNED NOT NULL DEFAULT 0,
  total_spent   DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_platform_openid (platform, openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`

const SQL_ENHANCEMENTS = `
CREATE TABLE IF NOT EXISTS enhancements (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  original_key  VARCHAR(512) NOT NULL COMMENT 'OSS original key',
  enhanced_key  VARCHAR(512) DEFAULT NULL COMMENT 'OSS enhanced key',
  type          ENUM('normal','hd') NOT NULL DEFAULT 'normal',
  status        ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
  credits_used  INT UNSIGNED NOT NULL DEFAULT 1,
  error_msg     VARCHAR(512) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`

const SQL_ORDERS = `
CREATE TABLE IF NOT EXISTS orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  platform      ENUM('wechat','douyin') NOT NULL,
  pack_id       VARCHAR(32) NOT NULL,
  out_trade_no  VARCHAR(64) NOT NULL UNIQUE,
  amount        DECIMAL(8,2) NOT NULL COMMENT '元',
  credits       INT UNSIGNED NOT NULL,
  status        ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at       DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_out_trade_no (out_trade_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`

async function init() {
  console.log('Initializing database...')
  await execute(SQL_USERS)
  console.log('  ✓ users')
  await execute(SQL_ENHANCEMENTS)
  console.log('  ✓ enhancements')
  await execute(SQL_ORDERS)
  console.log('  ✓ orders')
  console.log('Done.')
  await getPool().end()
}

init().catch((err) => {
  console.error(err)
  process.exit(1)
})
