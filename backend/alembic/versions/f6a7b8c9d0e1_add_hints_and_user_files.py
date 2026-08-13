"""add_hints_and_user_files

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-11 07:22:00.000000
"""

from alembic import op

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add hints column to problems table
    op.execute("ALTER TABLE problems ADD COLUMN IF NOT EXISTS hints TEXT;")

    # 2. Create user_files table if not exists
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_files (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject VARCHAR(32) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            stored_path VARCHAR(1024) NOT NULL,
            content_type VARCHAR(255) NOT NULL,
            size_bytes INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_user_files_user_id ON user_files(user_id);
        CREATE INDEX IF NOT EXISTS ix_user_files_subject ON user_files(subject);
    """)


def downgrade() -> None:
    pass
