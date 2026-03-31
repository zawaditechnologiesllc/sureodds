from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class SubscriptionStatus(str, enum.Enum):
    free = "free"
    paid = "paid"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    subscription_status = Column(String, default="free", nullable=False)
    referral_code = Column(String, unique=True, nullable=False, index=True)
    referred_by = Column(String, ForeignKey("users.id"), nullable=True)
    prediction_score = Column(Float, default=0.0)
    accuracy_pct = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    referrals = relationship("User", backref="referrer", remote_side=[id])
    earnings = relationship("ReferralEarning", back_populates="user", foreign_keys="ReferralEarning.user_id")
    user_packages = relationship("UserPackage", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")


class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    fixtures = relationship("Fixture", back_populates="league")


class Fixture(Base):
    __tablename__ = "fixtures"

    id = Column(Integer, primary_key=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False, index=True)
    home_team_id = Column(Integer, nullable=False)
    home_team_name = Column(String, nullable=False)
    home_team_logo = Column(String, nullable=True)
    away_team_id = Column(Integer, nullable=False)
    away_team_name = Column(String, nullable=False)
    away_team_logo = Column(String, nullable=True)
    kickoff = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String, default="scheduled", index=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    season = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    league = relationship("League", back_populates="fixtures")
    prediction = relationship("Prediction", back_populates="fixture", uselist=False)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fixture_id = Column(Integer, ForeignKey("fixtures.id"), unique=True, nullable=False, index=True)
    home_win_pct = Column(Float, nullable=False)
    draw_pct = Column(Float, nullable=False)
    away_win_pct = Column(Float, nullable=False)
    over25_pct = Column(Float, nullable=False)
    btts_pct = Column(Float, nullable=False)
    best_pick = Column(String, nullable=False)
    confidence = Column(String, nullable=False)  # high_confidence, high, medium, low
    is_locked = Column(Boolean, default=True)
    prediction_date = Column(DateTime(timezone=True), server_default=func.now())
    is_correct = Column(Boolean, nullable=True)
    actual_result = Column(String, nullable=True)

    fixture = relationship("Fixture", back_populates="prediction")


class Package(Base):
    """Pre-seeded pick packages available for purchase."""
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)         # Amount in USD (or KES for VIP)
    picks_count = Column(Integer, nullable=False, default=0)
    currency = Column(String, default="USD")
    package_type = Column(String, default="credits")  # "credits" | "vip"
    duration_days = Column(Integer, nullable=True)     # For VIP: 1, 7, 30
    description = Column(Text, nullable=True)
    features = Column(Text, nullable=True)             # JSON array of feature strings
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserVipAccess(Base):
    """Tracks active VIP access for each user."""
    __tablename__ = "user_vip_access"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=True)
    starts_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    reference = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    package = relationship("Package")


class UserPackage(Base):
    """Tracks remaining credits for each user."""
    __tablename__ = "user_packages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    remaining_picks = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="user_packages")


class Transaction(Base):
    """Payment transaction log."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)          # "package" or "subscription"
    status = Column(String, default="pending")     # pending, success, failed
    reference = Column(String, unique=True, nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="transactions")
    package = relationship("Package")


class ReferralEarning(Base):
    __tablename__ = "referral_earnings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    referred_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    subscription_amount = Column(Float, nullable=False)
    commission_rate = Column(Float, default=0.30)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="earnings", foreign_keys=[user_id])


class Bundle(Base):
    """Pre-generated betting bundles sold as a unit."""
    __tablename__ = "bundles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    total_odds = Column(Float, nullable=False)
    picks = Column(Text, nullable=False)   # JSON array of picks
    tier = Column(String, nullable=False)  # safe / medium / high / mega
    price = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    purchases = relationship("BundlePurchase", back_populates="bundle")


class BundlePurchase(Base):
    """Records a user's purchase of a bundle."""
    __tablename__ = "bundle_purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bundle_id = Column(String, ForeignKey("bundles.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    reference = Column(String, unique=True, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")   # pending / success / failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)

    bundle = relationship("Bundle", back_populates="purchases")
    user = relationship("User")


class PartnerApplication(Base):
    """Partner / affiliate program application."""
    __tablename__ = "partner_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    platform = Column(String, nullable=False)
    handle = Column(String, nullable=False)
    followers = Column(String, nullable=False)
    website = Column(String, nullable=True)
    why = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending / approved / rejected
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # When approved, a user_id is linked
    user_id = Column(String, ForeignKey("users.id"), nullable=True)


class PartnerPayoutSettings(Base):
    """Payout method settings for approved partners."""
    __tablename__ = "partner_payout_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    method = Column(String, nullable=False, default="usdt")  # "usdt" | "bank"
    usdt_address = Column(String, nullable=True)             # TRC-20 address
    bank_name = Column(String, nullable=True)
    bank_account_number = Column(String, nullable=True)
    bank_account_name = Column(String, nullable=True)
    bank_swift = Column(String, nullable=True)
    bank_country = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")


class ReferralClick(Base):
    """Tracks clicks on partner invite links."""
    __tablename__ = "referral_clicks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    referral_code = Column(String, nullable=False, index=True)
    ip_hash = Column(String, nullable=True)
    converted = Column(Boolean, default=False)   # True once the visitor signs up
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    """Admin-created notifications shown to users, partners, or both."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    target = Column(String, nullable=False, default="all")  # "users" | "partners" | "all"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
