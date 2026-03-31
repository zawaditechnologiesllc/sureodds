"""add_missing_tables_and_columns

Revision ID: b2f4c8e1d3a7
Revises: a67c9965f46a
Create Date: 2026-03-31

Adds tables and columns that were created via Base.metadata.create_all() but were
never tracked in Alembic. This migration is fully idempotent — every operation
checks for existence before acting so re-running it is safe.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision: str = 'b2f4c8e1d3a7'
down_revision: Union[str, None] = 'a67c9965f46a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    cols = [c["name"] for c in inspect(bind).get_columns(table)]
    return column in cols


def upgrade() -> None:
    # ── packages: add missing columns ────────────────────────────────────────
    if _table_exists('packages'):
        if not _column_exists('packages', 'package_type'):
            op.add_column('packages', sa.Column('package_type', sa.String(), nullable=True, server_default='credits'))
        if not _column_exists('packages', 'duration_days'):
            op.add_column('packages', sa.Column('duration_days', sa.Integer(), nullable=True))
        if not _column_exists('packages', 'description'):
            op.add_column('packages', sa.Column('description', sa.Text(), nullable=True))
        if not _column_exists('packages', 'features'):
            op.add_column('packages', sa.Column('features', sa.Text(), nullable=True))

    # ── user_vip_access ───────────────────────────────────────────────────────
    if not _table_exists('user_vip_access'):
        op.create_table(
            'user_vip_access',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('package_id', sa.Integer(), sa.ForeignKey('packages.id'), nullable=True),
            sa.Column('starts_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('reference', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_user_vip_access_user', 'user_vip_access', ['user_id'])

    # ── bundles ───────────────────────────────────────────────────────────────
    if not _table_exists('bundles'):
        op.create_table(
            'bundles',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('total_odds', sa.Float(), nullable=False),
            sa.Column('picks', sa.Text(), nullable=False),
            sa.Column('tier', sa.String(), nullable=False),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('currency', sa.String(), nullable=True, server_default='USD'),
            sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_bundles_tier', 'bundles', ['tier'])
        op.create_index('idx_bundles_is_active', 'bundles', ['is_active'])

    # ── bundle_purchases ──────────────────────────────────────────────────────
    if not _table_exists('bundle_purchases'):
        op.create_table(
            'bundle_purchases',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('bundle_id', sa.String(), sa.ForeignKey('bundles.id'), nullable=False),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('reference', sa.String(), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('status', sa.String(), nullable=True, server_default='pending'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('reference'),
        )
        op.create_index('idx_bundle_purchases_bundle', 'bundle_purchases', ['bundle_id'])
        op.create_index('idx_bundle_purchases_user', 'bundle_purchases', ['user_id'])

    # ── partner_applications ──────────────────────────────────────────────────
    if not _table_exists('partner_applications'):
        op.create_table(
            'partner_applications',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('email', sa.String(), nullable=False),
            sa.Column('platform', sa.String(), nullable=False),
            sa.Column('handle', sa.String(), nullable=False),
            sa.Column('followers', sa.String(), nullable=False),
            sa.Column('website', sa.String(), nullable=True),
            sa.Column('why', sa.Text(), nullable=False),
            sa.Column('status', sa.String(), nullable=True, server_default='pending'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_partner_applications_email', 'partner_applications', ['email'])
        op.create_index('idx_partner_applications_status', 'partner_applications', ['status'])

    # ── partner_payout_settings ───────────────────────────────────────────────
    if not _table_exists('partner_payout_settings'):
        op.create_table(
            'partner_payout_settings',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('method', sa.String(), nullable=False, server_default='usdt'),
            sa.Column('usdt_address', sa.String(), nullable=True),
            sa.Column('bank_name', sa.String(), nullable=True),
            sa.Column('bank_account_number', sa.String(), nullable=True),
            sa.Column('bank_account_name', sa.String(), nullable=True),
            sa.Column('bank_swift', sa.String(), nullable=True),
            sa.Column('bank_country', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id'),
        )
        op.create_index('idx_payout_settings_user', 'partner_payout_settings', ['user_id'])

    # ── referral_clicks ───────────────────────────────────────────────────────
    if not _table_exists('referral_clicks'):
        op.create_table(
            'referral_clicks',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('referral_code', sa.String(), nullable=False),
            sa.Column('ip_hash', sa.String(), nullable=True),
            sa.Column('converted', sa.Boolean(), nullable=True, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_referral_clicks_code', 'referral_clicks', ['referral_code'])

    # ── notifications ─────────────────────────────────────────────────────────
    if not _table_exists('notifications'):
        op.create_table(
            'notifications',
            sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('target', sa.String(), nullable=False, server_default='all'),
            sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id'),
        )


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('referral_clicks')
    op.drop_table('partner_payout_settings')
    op.drop_table('partner_applications')
    op.drop_table('bundle_purchases')
    op.drop_table('bundles')
    op.drop_table('user_vip_access')
