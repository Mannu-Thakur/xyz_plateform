"""add connected platform columns

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-12 22:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'g7h8i9j0k1l2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('codeforces_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('gfg_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('leetcode_username', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('codeforces_username', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('gfg_username', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'gfg_username')
    op.drop_column('users', 'codeforces_username')
    op.drop_column('users', 'leetcode_username')
    op.drop_column('users', 'gfg_url')
    op.drop_column('users', 'codeforces_url')
