from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


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
    price = Column(Float, nullable=False)         # Amount in KES
    picks_count = Column(Integer, nullable=False)
    currency = Column(String, default="KES")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


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
