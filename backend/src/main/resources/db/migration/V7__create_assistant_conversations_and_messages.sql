-- ==========================================================
-- Vietnam Cultural Atlas - Module 4: Assistant Schema Migration
-- Author: Member 4 (AI Orchestration & Assistant UX)
-- Version: V7
-- ==========================================================

CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    owner_type VARCHAR(20) NOT NULL,
    session_uuid UUID,
    guest_token_hash VARCHAR(64),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    current_province_slug VARCHAR(100),
    title VARCHAR(255) NOT NULL DEFAULT 'Khám phá văn hóa Việt Nam',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_conversations_owner_type CHECK (owner_type IN ('USER', 'GUEST')),
    CONSTRAINT chk_conversations_owner CHECK (
        (owner_type = 'USER' AND user_id IS NOT NULL AND session_uuid IS NULL AND guest_token_hash IS NULL) OR
        (owner_type = 'GUEST' AND user_id IS NULL AND session_uuid IS NOT NULL AND guest_token_hash IS NOT NULL)
    ),
    CONSTRAINT chk_conversations_guest_token_hash CHECK (guest_token_hash IS NULL OR guest_token_hash ~ '^[0-9a-fA-F]{64}$'),
    CONSTRAINT uk_conversations_session_uuid UNIQUE (session_uuid)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id) WHERE owner_type = 'USER';
CREATE INDEX IF NOT EXISTS idx_conversations_guest ON conversations(session_uuid, guest_token_hash) WHERE owner_type = 'GUEST';
CREATE INDEX IF NOT EXISTS idx_conversations_province ON conversations(current_province_slug);

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
    sequence_number INT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_messages_role CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
    CONSTRAINT chk_messages_seq_positive CHECK (sequence_number > 0),
    CONSTRAINT chk_messages_token_count CHECK (token_count >= 0),
    CONSTRAINT uk_messages_conversation_seq UNIQUE (conversation_id, sequence_number)
);
