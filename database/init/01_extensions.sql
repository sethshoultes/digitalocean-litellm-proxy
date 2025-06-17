-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE connection_status AS ENUM ('active', 'inactive', 'error', 'testing');
CREATE TYPE user_role AS ENUM ('PROXY_ADMIN', 'ORG_ADMIN', 'INTERNAL_USER', 'CUSTOMER', 'TEAM_ADMIN');
CREATE TYPE activity_type AS ENUM ('created', 'updated', 'deleted', 'tested', 'used', 'failed');
CREATE TYPE provider_type AS ENUM ('openai', 'anthropic', 'azure', 'aws', 'google', 'huggingface', 'cohere', 'replicate', 'custom');