-- Updated extensions and types to align with LiteLLM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Custom types aligned with LiteLLM patterns
CREATE TYPE connection_status AS ENUM ('active', 'inactive', 'error', 'testing');
CREATE TYPE activity_type AS ENUM ('created', 'updated', 'deleted', 'tested', 'used', 'failed', 'api_call', 'connection_test');
CREATE TYPE provider_type AS ENUM ('openai', 'anthropic', 'azure', 'aws', 'google', 'huggingface', 'cohere', 'replicate', 'custom');
CREATE TYPE connection_type AS ENUM ('api_key', 'oauth', 'service_account', 'custom');