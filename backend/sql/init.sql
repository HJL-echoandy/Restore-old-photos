-- 老照片修复小程序 数据库初始化脚本
-- 执行方式: mysql -u root -p photo_restore < init.sql

CREATE DATABASE IF NOT EXISTS photo_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE photo_restore;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE IF NOT EXISTS enhancements (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  original_key  VARCHAR(512) NOT NULL COMMENT 'OSS 原图 key',
  enhanced_key  VARCHAR(512) DEFAULT NULL COMMENT 'OSS 修复图 key',
  type          ENUM('normal','hd') NOT NULL DEFAULT 'normal',
  status        ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
  credits_used  INT UNSIGNED NOT NULL DEFAULT 1,
  error_msg     VARCHAR(512) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图片增强记录表';

CREATE TABLE IF NOT EXISTS orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  platform      ENUM('wechat','douyin') NOT NULL,
  pack_id       VARCHAR(32) NOT NULL,
  out_trade_no  VARCHAR(64) NOT NULL UNIQUE COMMENT '商户订单号',
  amount        DECIMAL(8,2) NOT NULL COMMENT '支付金额(元)',
  credits       INT UNSIGNED NOT NULL COMMENT '购买积分数',
  status        ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at       DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_out_trade_no (out_trade_no),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值订单表';
