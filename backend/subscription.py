"""
VetFlow - Subscription & Payment Module
Stripe integration for subscription management
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from pydantic import BaseModel, Field
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Subscription Plans Configuration
class SubscriptionPlan(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    UNLIMITED = "unlimited"


# Plan configurations
SUBSCRIPTION_PLANS = {
    "starter": {
        "name": "Starter",
        "price": 9.90,
        "customer_limit": 10,
        "unregistered_response_limit": 9,  # Monthly limit for unregistered customers
        "features": [
            "10 müşteri kaydı",
            "Kayıtlı müşterilere sınırsız WhatsApp yanıt",
            "9 kayıtsız müşteriye aylık WhatsApp yanıt",
            "WhatsApp üzerinden randevu oluşturma",
            "Otomatik hatırlatmalar",
            "Temel raporlar"
        ]
    },
    "professional": {
        "name": "Professional",
        "price": 17.90,
        "customer_limit": 40,
        "unregistered_response_limit": 14,
        "features": [
            "40 müşteri kaydı",
            "Kayıtlı müşterilere sınırsız WhatsApp yanıt",
            "14 kayıtsız müşteriye aylık WhatsApp yanıt",
            "WhatsApp üzerinden randevu oluşturma",
            "Otomatik hatırlatmalar",
            "Gelişmiş raporlar"
        ]
    },
    "unlimited": {
        "name": "Unlimited",
        "price": 29.90,
        "customer_limit": -1,  # -1 means unlimited
        "unregistered_response_limit": 50,
        "features": [
            "Sınırsız müşteri kaydı",
            "Kayıtlı müşterilere sınırsız WhatsApp yanıt",
            "50 kayıtsız müşteriye aylık WhatsApp yanıt",
            "WhatsApp üzerinden randevu oluşturma",
            "Otomatik hatırlatmalar",
            "Tüm raporlar ve analizler",
            "Öncelikli destek"
        ]
    }
}

# Extra response packages (for unregistered customers)
RESPONSE_PACKAGES = {
    "pack_10": {
        "name": "10 Yanıt Paketi",
        "responses": 10,
        "price": 2.50,  # 10 * 0.25
        "price_per_response": 0.25
    },
    "pack_25": {
        "name": "25 Yanıt Paketi",
        "responses": 25,
        "price": 6.25,  # 25 * 0.25
        "price_per_response": 0.25
    },
    "pack_50": {
        "name": "50 Yanıt Paketi",
        "responses": 50,
        "price": 12.50,  # 50 * 0.25
        "price_per_response": 0.25
    }
}


# Pydantic Models
class Subscription(BaseModel):
    subscription_id: str
    user_id: str
    plan: str
    status: str = "active"  # active, cancelled, expired, trial
    stripe_subscription_id: Optional[str] = None
    current_period_start: datetime
    current_period_end: datetime
    customer_count: int = 0
    unregistered_responses_used: int = 0
    extra_responses_balance: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubscriptionCreate(BaseModel):
    plan: str


class PaymentTransaction(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    currency: str = "usd"
    transaction_type: str  # subscription, response_pack
    plan_or_pack_id: str
    stripe_session_id: str
    payment_status: str = "pending"  # pending, paid, failed, expired
    metadata: Optional[Dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def generate_subscription_id():
    import uuid
    return f"sub_{uuid.uuid4().hex[:12]}"


def generate_transaction_id():
    import uuid
    return f"pay_{uuid.uuid4().hex[:12]}"


async def check_customer_limit(db, user_id: str) -> Dict:
    """
    Check if user can add more customers based on their subscription.
    Returns: {"can_add": bool, "current": int, "limit": int, "plan": str}
    """
    # Get user's subscription (active or trial)
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not subscription:
        # No subscription - can't add customers
        return {
            "can_add": False,
            "current": 0,
            "limit": 0,
            "plan": None,
            "message": "Aktif abonelik bulunamadı"
        }
    
    plan = subscription.get("plan", "starter")
    plan_config = SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["starter"])
    customer_limit = plan_config["customer_limit"]
    
    # Count current customers
    customer_count = await db.customers.count_documents({"user_id": user_id})
    
    if customer_limit == -1:  # Unlimited
        return {
            "can_add": True,
            "current": customer_count,
            "limit": -1,
            "plan": plan,
            "message": "Sınırsız müşteri"
        }
    
    can_add = customer_count < customer_limit
    
    return {
        "can_add": can_add,
        "current": customer_count,
        "limit": customer_limit,
        "plan": plan,
        "message": f"{customer_count}/{customer_limit} müşteri" if can_add else "Müşteri limitine ulaşıldı"
    }


async def check_whatsapp_response_limit(db, user_id: str, customer_phone: str) -> Dict:
    """
    Check if user can respond to a WhatsApp message.
    Registered customers: unlimited responses
    Unregistered customers: limited by plan + extra packages
    Returns: {"can_respond": bool, "is_registered": bool, "responses_left": int}
    """
    # Check if customer is registered
    customer = await db.customers.find_one(
        {"user_id": user_id, "phone": {"$regex": customer_phone[-10:]}},
        {"_id": 0}
    )
    
    if customer:
        # Registered customer - unlimited responses
        return {
            "can_respond": True,
            "is_registered": True,
            "responses_left": -1,
            "message": "Kayıtlı müşteri - sınırsız yanıt"
        }
    
    # Unregistered customer - check limits
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "can_respond": False,
            "is_registered": False,
            "responses_left": 0,
            "message": "Aktif abonelik bulunamadı"
        }
    
    plan = subscription.get("plan", "starter")
    plan_config = SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["starter"])
    monthly_limit = plan_config["unregistered_response_limit"]
    
    used = subscription.get("unregistered_responses_used", 0)
    extra_balance = subscription.get("extra_responses_balance", 0)
    
    # Total available = monthly limit - used + extra balance
    available = (monthly_limit - used) + extra_balance
    
    if available > 0:
        return {
            "can_respond": True,
            "is_registered": False,
            "responses_left": available,
            "use_extra": used >= monthly_limit,
            "message": f"{available} yanıt hakkı kaldı"
        }
    
    return {
        "can_respond": False,
        "is_registered": False,
        "responses_left": 0,
        "message": "Kayıtsız müşteri yanıt limitine ulaşıldı. Ek paket satın alabilirsiniz."
    }


async def use_whatsapp_response(db, user_id: str, is_registered: bool, use_extra: bool = False):
    """
    Decrement response counter after sending a response to unregistered customer.
    """
    if is_registered:
        return  # No counting for registered customers
    
    if use_extra:
        # Use from extra balance
        await db.subscriptions.update_one(
            {"user_id": user_id, "status": {"$in": ["active", "trial"]}},
            {"$inc": {"extra_responses_balance": -1}}
        )
    else:
        # Use from monthly limit
        await db.subscriptions.update_one(
            {"user_id": user_id, "status": {"$in": ["active", "trial"]}},
            {"$inc": {"unregistered_responses_used": 1}}
        )


async def reset_monthly_counters(db):
    """
    Reset monthly unregistered response counters.
    Should be called on subscription renewal.
    """
    await db.subscriptions.update_many(
        {"status": "active"},
        {"$set": {"unregistered_responses_used": 0}}
    )


async def add_extra_responses(db, user_id: str, responses: int):
    """
    Add extra response credits from purchased package.
    """
    await db.subscriptions.update_one(
        {"user_id": user_id, "status": {"$in": ["active", "trial"]}},
        {"$inc": {"extra_responses_balance": responses}}
    )


async def create_trial_subscription(db, user_id: str):
    """
    Create a 7-day trial subscription with starter plan limits.
    """
    now = datetime.now(timezone.utc)
    subscription = Subscription(
        subscription_id=generate_subscription_id(),
        user_id=user_id,
        plan="starter",
        status="trial",
        current_period_start=now,
        current_period_end=now + timedelta(days=7)
    )
    
    doc = subscription.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    doc["current_period_start"] = doc["current_period_start"].isoformat()
    doc["current_period_end"] = doc["current_period_end"].isoformat()
    
    await db.subscriptions.insert_one(doc)
    return subscription
