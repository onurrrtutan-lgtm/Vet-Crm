"""
VetFlow - Pydantic Models
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class PetSpecies(str, Enum):
    DOG = "dog"
    CAT = "cat"
    BIRD = "bird"
    RABBIT = "rabbit"
    HAMSTER = "hamster"
    FISH = "fish"
    OTHER = "other"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class ReminderType(str, Enum):
    APPOINTMENT = "appointment"
    VACCINATION = "vaccination"
    MEDICATION = "medication"
    FOOD = "food"
    CHECKUP = "checkup"
    CUSTOM = "custom"


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None
    clinic_name: Optional[str] = None
    phone: Optional[str] = None


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: generate_id("user_"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    language: str = "tr"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    clinic_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: generate_id("sess_"))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Customer Models
class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    customer_id: str = Field(default_factory=lambda: generate_id("cust_"))
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None


# Pet Models
class PetBase(BaseModel):
    name: str
    species: PetSpecies
    breed: Optional[str] = None
    birth_date: Optional[datetime] = None
    weight: Optional[float] = None
    color: Optional[str] = None
    microchip_id: Optional[str] = None
    notes: Optional[str] = None


class Pet(PetBase):
    model_config = ConfigDict(extra="ignore")
    pet_id: str = Field(default_factory=lambda: generate_id("pet_"))
    customer_id: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PetCreate(PetBase):
    customer_id: str


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[PetSpecies] = None
    breed: Optional[str] = None
    birth_date: Optional[datetime] = None
    weight: Optional[float] = None
    color: Optional[str] = None
    microchip_id: Optional[str] = None
    notes: Optional[str] = None


# Health Record Models
class HealthRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    record_id: str = Field(default_factory=lambda: generate_id("rec_"))
    pet_id: str
    user_id: str
    record_type: str  # vaccination, treatment, surgery, checkup
    title: str
    description: Optional[str] = None
    date: datetime
    next_due_date: Optional[datetime] = None
    cost: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HealthRecordCreate(BaseModel):
    pet_id: str
    record_type: str
    title: str
    description: Optional[str] = None
    date: datetime
    next_due_date: Optional[datetime] = None
    cost: Optional[float] = None


# Appointment Models
class AppointmentBase(BaseModel):
    customer_id: str
    pet_id: str
    title: str
    description: Optional[str] = None
    date: datetime
    duration_minutes: int = 30
    status: AppointmentStatus = AppointmentStatus.SCHEDULED


class Appointment(AppointmentBase):
    model_config = ConfigDict(extra="ignore")
    appointment_id: str = Field(default_factory=lambda: generate_id("apt_"))
    user_id: str
    reminder_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[AppointmentStatus] = None


# Product Models (Food/Medicine tracking)
class ProductBase(BaseModel):
    name: str
    category: str  # food, medicine, accessory
    brand: Optional[str] = None
    unit: str = "kg"  # kg, g, piece, bottle
    price: Optional[float] = None


class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: generate_id("prod_"))
    user_id: str
    stock_quantity: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(ProductBase):
    stock_quantity: Optional[float] = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[float] = None


# Pet Product Usage (for consumption tracking)
class PetProductUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    usage_id: str = Field(default_factory=lambda: generate_id("usg_"))
    pet_id: str
    product_id: str
    customer_id: str
    user_id: str
    daily_consumption: float  # daily usage amount
    start_date: datetime
    last_purchase_date: datetime
    last_purchase_quantity: float
    auto_remind: bool = True
    remind_days_before: int = 3
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PetProductUsageCreate(BaseModel):
    pet_id: str
    product_id: str
    daily_consumption: float
    last_purchase_date: datetime
    last_purchase_quantity: float
    auto_remind: bool = True
    remind_days_before: int = 3


# Reminder Models
class ReminderBase(BaseModel):
    reminder_type: ReminderType
    title: str
    message: str
    due_date: datetime
    customer_id: str
    pet_id: Optional[str] = None


class Reminder(ReminderBase):
    model_config = ConfigDict(extra="ignore")
    reminder_id: str = Field(default_factory=lambda: generate_id("rem_"))
    user_id: str
    sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReminderCreate(ReminderBase):
    pass


# Finance Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: generate_id("trx_"))
    user_id: str
    transaction_type: TransactionType
    amount: float
    category: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionCreate(BaseModel):
    transaction_type: TransactionType
    amount: float
    category: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    date: datetime


# WhatsApp Message Models
class WhatsAppMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str = Field(default_factory=lambda: generate_id("msg_"))
    user_id: str
    direction: str  # inbound, outbound
    phone_number: str
    message_text: str
    message_type: str = "text"  # text, template
    status: str = "sent"  # sent, delivered, read, failed
    customer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# AI Settings Models
class AISettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    settings_id: str = Field(default_factory=lambda: generate_id("ai_"))
    user_id: str
    tone: str = "friendly"  # friendly, professional, casual
    language: str = "tr"
    greeting_message: str = "Merhaba! VetFlow Veteriner Kliniğine hoş geldiniz. Size nasıl yardımcı olabilirim?"
    clinic_info: Optional[str] = None
    services: Optional[str] = None
    working_hours: Optional[str] = None
    custom_instructions: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AISettingsUpdate(BaseModel):
    tone: Optional[str] = None
    language: Optional[str] = None
    greeting_message: Optional[str] = None
    clinic_info: Optional[str] = None
    services: Optional[str] = None
    working_hours: Optional[str] = None
    custom_instructions: Optional[str] = None


# Response Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class MessageResponse(BaseModel):
    message: str
    success: bool = True
