"""add_user_oauth_profile_columns

Revision ID: e5f6a7b8c9d0
Revises: 689f2dbf6ac7
Create Date: 2026-08-11 07:15:00.000000
"""

from alembic import op

revision = 'e5f6a7b8c9d0'
down_revision = '689f2dbf6ac7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS leetcode_url VARCHAR(512);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url VARCHAR(512);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(512);")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(512);")
    op.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;")
    op.execute("ALTER TABLE problems ADD COLUMN IF NOT EXISTS comparison_mode VARCHAR(50) DEFAULT 'strict';")


def downgrade() -> None:
    pass
