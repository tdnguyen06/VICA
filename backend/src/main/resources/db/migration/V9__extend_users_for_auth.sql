-- Auth module (login, register, profile, email verification). Extends the users table created in V1.
-- All new columns are optional, so existing rows stay valid.
ALTER TABLE users ADD COLUMN phone VARCHAR(15);
ALTER TABLE users ADD COLUMN address VARCHAR(255);
ALTER TABLE users ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER'));
ALTER TABLE users ADD COLUMN date_of_birth DATE;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Phone is optional but, when given, belongs to one account only.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users(phone) WHERE phone IS NOT NULL;