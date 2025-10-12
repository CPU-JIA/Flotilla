-- 初始化数据库脚本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于全文搜索

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建数据库用户（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'devplatform') THEN
    CREATE USER devplatform WITH PASSWORD 'devplatform123';
  END IF;
END
$$;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE cloud_dev_platform TO devplatform;

-- 输出初始化完成信息
SELECT 'Database initialized successfully!' AS status;
