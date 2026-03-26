"""initial_schema

Revision ID: a67c9965f46a
Revises: 
Create Date: 2026-03-26 23:58:04.181204

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a67c9965f46a'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('subscription_status', sa.String(), nullable=False, server_default='free'),
        sa.Column('referral_code', sa.String(), nullable=False),
        sa.Column('referred_by', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('prediction_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('accuracy_pct', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('referral_code'),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_referral_code', 'users', ['referral_code'])

    op.create_table(
        'leagues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('country', sa.String(), nullable=False),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'fixtures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('league_id', sa.Integer(), sa.ForeignKey('leagues.id'), nullable=False),
        sa.Column('home_team_id', sa.Integer(), nullable=False),
        sa.Column('home_team_name', sa.String(), nullable=False),
        sa.Column('home_team_logo', sa.String(), nullable=True),
        sa.Column('away_team_id', sa.Integer(), nullable=False),
        sa.Column('away_team_name', sa.String(), nullable=False),
        sa.Column('away_team_logo', sa.String(), nullable=True),
        sa.Column('kickoff', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(), nullable=True, server_default='scheduled'),
        sa.Column('home_score', sa.Integer(), nullable=True),
        sa.Column('away_score', sa.Integer(), nullable=True),
        sa.Column('season', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_fixtures_kickoff', 'fixtures', ['kickoff'])
    op.create_index('idx_fixtures_league', 'fixtures', ['league_id'])
    op.create_index('idx_fixtures_status', 'fixtures', ['status'])

    op.create_table(
        'predictions',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('fixture_id', sa.Integer(), sa.ForeignKey('fixtures.id'), nullable=False),
        sa.Column('home_win_pct', sa.Float(), nullable=False),
        sa.Column('draw_pct', sa.Float(), nullable=False),
        sa.Column('away_win_pct', sa.Float(), nullable=False),
        sa.Column('over25_pct', sa.Float(), nullable=False),
        sa.Column('btts_pct', sa.Float(), nullable=False),
        sa.Column('best_pick', sa.String(), nullable=False),
        sa.Column('confidence', sa.String(), nullable=False),
        sa.Column('is_locked', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('prediction_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('actual_result', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fixture_id'),
    )
    op.create_index('idx_predictions_fixture', 'predictions', ['fixture_id'])

    op.create_table(
        'packages',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('picks_count', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(), nullable=True, server_default='KES'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'user_packages',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('remaining_picks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_user_packages_user', 'user_packages', ['user_id'])

    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True, server_default='pending'),
        sa.Column('reference', sa.String(), nullable=False),
        sa.Column('package_id', sa.Integer(), sa.ForeignKey('packages.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference'),
    )
    op.create_index('idx_transactions_user', 'transactions', ['user_id'])
    op.create_index('idx_transactions_reference', 'transactions', ['reference'])

    op.create_table(
        'referral_earnings',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('referred_user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('subscription_amount', sa.Float(), nullable=False),
        sa.Column('commission_rate', sa.Float(), nullable=True, server_default='0.30'),
        sa.Column('status', sa.String(), nullable=True, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_earnings_user', 'referral_earnings', ['user_id'])
    op.create_index('idx_earnings_status', 'referral_earnings', ['status'])


def downgrade() -> None:
    op.drop_table('referral_earnings')
    op.drop_table('transactions')
    op.drop_table('user_packages')
    op.drop_table('packages')
    op.drop_table('predictions')
    op.drop_table('fixtures')
    op.drop_table('leagues')
    op.drop_table('users')
