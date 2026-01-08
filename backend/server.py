"""
VetFlow - Veterinary Clinic Management System
FastAPI Backend Server
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from dotenv import load_dotenv

from models import (
    User, UserCreate, UserLogin, TokenResponse, MessageResponse,
    Customer, CustomerCreate, CustomerUpdate,
    Pet, PetCreate, PetUpdate,
    HealthRecord, HealthRecordCreate,
    Appointment, AppointmentCreate, AppointmentUpdate, AppointmentStatus,
    Product, ProductCreate, ProductUpdate,
    PetProductUsage, PetProductUsageCreate,
    Reminder, ReminderCreate, ReminderType,
    Transaction, TransactionCreate, TransactionType,
    WhatsAppMessage, AISettings, AISettingsUpdate,
    generate_id
)
from auth import (
    hash_password, verify_password, create_jwt_token,
    get_current_user, exchange_emergent_session,
    set_session_cookie, clear_session_cookie
)
from subscription import (
    SUBSCRIPTION_PLANS, RESPONSE_PACKAGES,
    Subscription, SubscriptionCreate, PaymentTransaction,
    generate_subscription_id, generate_transaction_id,
    check_customer_limit, check_whatsapp_response_limit,
    use_whatsapp_response, add_extra_responses,
    create_trial_subscription
)
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse
    )
except ModuleNotFoundError:
    StripeCheckout = None
    CheckoutSessionRequest = None
    CheckoutSessionResponse = None
    CheckoutStatusResponse = None



ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="VetFlow API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Dependency to get current user
async def get_user(request: Request) -> User:
    return await get_current_user(request, db)


# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, response: Response):
    """Register a new user with email and password."""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        clinic_name=user_data.clinic_name
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create default AI settings
    ai_settings = AISettings(user_id=user.user_id)
    ai_dict = ai_settings.model_dump()
    ai_dict["created_at"] = ai_dict["created_at"].isoformat()
    ai_dict["updated_at"] = ai_dict["updated_at"].isoformat()
    await db.ai_settings.insert_one(ai_dict)
    
    # Generate token
    token = create_jwt_token(user.user_id)
    set_session_cookie(response, token)
    
    return TokenResponse(access_token=token, user=user)


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    """Login with email and password."""
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc or not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    token = create_jwt_token(user.user_id)
    set_session_cookie(response, token)
    
    return TokenResponse(access_token=token, user=user)


@api_router.post("/auth/google", response_model=TokenResponse)
async def google_auth(request: Request, response: Response):
    """Exchange Emergent Google OAuth session for user."""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session with Emergent
    auth_data = await exchange_emergent_session(session_id)
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Find or create user
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user_doc:
        # Update existing user
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    else:
        # Create new user
        user = User(email=email, name=name, picture=picture)
        user_dict = user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
        
        # Create default AI settings
        ai_settings = AISettings(user_id=user.user_id)
        ai_dict = ai_settings.model_dump()
        ai_dict["created_at"] = ai_dict["created_at"].isoformat()
        ai_dict["updated_at"] = ai_dict["updated_at"].isoformat()
        await db.ai_settings.insert_one(ai_dict)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_id": generate_id("sess_"),
        "user_id": user.user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    set_session_cookie(response, session_token)
    
    return TokenResponse(access_token=session_token, user=user)


@api_router.get("/auth/me", response_model=User)
async def get_me(user: User = Depends(get_user)):
    """Get current user info."""
    return user


@api_router.post("/auth/logout")
async def logout(response: Response, user: User = Depends(get_user)):
    """Logout user."""
    clear_session_cookie(response)
    await db.user_sessions.delete_many({"user_id": user.user_id})
    return {"message": "Logged out successfully"}


# ============ CUSTOMER ROUTES ============

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(
    user: User = Depends(get_user),
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get all customers for the user."""
    query = {"user_id": user.user_id}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(limit)
    return customers


@api_router.post("/customers", response_model=Customer)
async def create_customer(data: CustomerCreate, user: User = Depends(get_user)):
    """Create a new customer."""
    # Check subscription limit
    limit_check = await check_customer_limit(db, user.user_id)
    if not limit_check["can_add"]:
        raise HTTPException(
            status_code=403, 
            detail=f"Müşteri limitine ulaşıldı ({limit_check['current']}/{limit_check['limit']}). Paketinizi yükseltin."
        )
    
    customer = Customer(**data.model_dump(), user_id=user.user_id)
    doc = customer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.customers.insert_one(doc)
    
    # Update customer count in subscription
    await db.subscriptions.update_one(
        {"user_id": user.user_id, "status": {"$in": ["active", "trial"]}},
        {"$inc": {"customer_count": 1}}
    )
    
    return customer


@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, user: User = Depends(get_user)):
    """Get a specific customer."""
    customer = await db.customers.find_one(
        {"customer_id": customer_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, data: CustomerUpdate, user: User = Depends(get_user)):
    """Update a customer."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.customers.update_one(
        {"customer_id": customer_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})


@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: User = Depends(get_user)):
    """Delete a customer."""
    result = await db.customers.delete_one(
        {"customer_id": customer_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}


# ============ PET ROUTES ============

@api_router.get("/pets", response_model=List[Pet])
async def get_pets(
    user: User = Depends(get_user),
    customer_id: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get all pets for the user."""
    query = {"user_id": user.user_id}
    if customer_id:
        query["customer_id"] = customer_id
    
    pets = await db.pets.find(query, {"_id": 0}).to_list(limit)
    return pets


@api_router.post("/pets", response_model=Pet)
async def create_pet(data: PetCreate, user: User = Depends(get_user)):
    """Create a new pet."""
    # Verify customer belongs to user
    customer = await db.customers.find_one(
        {"customer_id": data.customer_id, "user_id": user.user_id}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    pet = Pet(**data.model_dump(), user_id=user.user_id)
    doc = pet.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if doc.get("birth_date"):
        doc["birth_date"] = doc["birth_date"].isoformat()
    
    await db.pets.insert_one(doc)
    return pet


@api_router.get("/pets/{pet_id}", response_model=Pet)
async def get_pet(pet_id: str, user: User = Depends(get_user)):
    """Get a specific pet."""
    pet = await db.pets.find_one(
        {"pet_id": pet_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@api_router.put("/pets/{pet_id}", response_model=Pet)
async def update_pet(pet_id: str, data: PetUpdate, user: User = Depends(get_user)):
    """Update a pet."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data.get("birth_date"):
        update_data["birth_date"] = update_data["birth_date"].isoformat()
    
    result = await db.pets.update_one(
        {"pet_id": pet_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    return await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})


@api_router.delete("/pets/{pet_id}")
async def delete_pet(pet_id: str, user: User = Depends(get_user)):
    """Delete a pet."""
    result = await db.pets.delete_one(
        {"pet_id": pet_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pet not found")
    return {"message": "Pet deleted"}


# ============ HEALTH RECORD ROUTES ============

@api_router.get("/health-records", response_model=List[HealthRecord])
async def get_health_records(
    user: User = Depends(get_user),
    pet_id: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get health records."""
    query = {"user_id": user.user_id}
    if pet_id:
        query["pet_id"] = pet_id
    
    records = await db.health_records.find(query, {"_id": 0}).to_list(limit)
    return records


@api_router.post("/health-records", response_model=HealthRecord)
async def create_health_record(data: HealthRecordCreate, user: User = Depends(get_user)):
    """Create a new health record."""
    # Verify pet belongs to user
    pet = await db.pets.find_one(
        {"pet_id": data.pet_id, "user_id": user.user_id}
    )
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    record = HealthRecord(**data.model_dump(), user_id=user.user_id)
    doc = record.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["date"] = doc["date"].isoformat()
    if doc.get("next_due_date"):
        doc["next_due_date"] = doc["next_due_date"].isoformat()
    
    await db.health_records.insert_one(doc)
    
    # Create reminder if next_due_date is set
    if data.next_due_date:
        pet_doc = await db.pets.find_one({"pet_id": data.pet_id}, {"_id": 0})
        customer = await db.customers.find_one({"customer_id": pet_doc["customer_id"]}, {"_id": 0})
        
        reminder_type = ReminderType.VACCINATION if data.record_type == "vaccination" else ReminderType.CHECKUP
        reminder = Reminder(
            user_id=user.user_id,
            reminder_type=reminder_type,
            title=f"{pet_doc['name']} - {data.title}",
            message=f"{data.title} için randevu zamanı",
            due_date=data.next_due_date,
            customer_id=customer["customer_id"],
            pet_id=data.pet_id
        )
        rem_doc = reminder.model_dump()
        rem_doc["created_at"] = rem_doc["created_at"].isoformat()
        rem_doc["due_date"] = rem_doc["due_date"].isoformat()
        await db.reminders.insert_one(rem_doc)
    
    return record


# ============ APPOINTMENT ROUTES ============

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    user: User = Depends(get_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get appointments."""
    query = {"user_id": user.user_id}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("date", 1).to_list(limit)
    return appointments


@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(data: AppointmentCreate, user: User = Depends(get_user)):
    """Create a new appointment."""
    # Verify customer and pet
    customer = await db.customers.find_one(
        {"customer_id": data.customer_id, "user_id": user.user_id}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    pet = await db.pets.find_one(
        {"pet_id": data.pet_id, "user_id": user.user_id}
    )
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    appointment = Appointment(**data.model_dump(), user_id=user.user_id)
    doc = appointment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    doc["date"] = doc["date"].isoformat()
    
    await db.appointments.insert_one(doc)
    return appointment


@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    user: User = Depends(get_user)
):
    """Update an appointment."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data.get("date"):
        update_data["date"] = update_data["date"].isoformat()
    
    result = await db.appointments.update_one(
        {"appointment_id": appointment_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})


@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, user: User = Depends(get_user)):
    """Delete an appointment."""
    result = await db.appointments.delete_one(
        {"appointment_id": appointment_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted"}


@api_router.get("/appointments/{appointment_id}/details")
async def get_appointment_details(appointment_id: str, user: User = Depends(get_user)):
    """Get detailed appointment info with customer and pet data."""
    appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get customer info
    customer = await db.customers.find_one(
        {"customer_id": appointment["customer_id"]},
        {"_id": 0}
    )
    
    # Get pet info
    pet = await db.pets.find_one(
        {"pet_id": appointment["pet_id"]},
        {"_id": 0}
    )
    
    return {
        "appointment": appointment,
        "customer": customer,
        "pet": pet
    }


@api_router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment_with_notification(
    appointment_id: str, 
    request: Request,
    user: User = Depends(get_user)
):
    """Cancel appointment and send WhatsApp notification to customer."""
    from whatsapp import send_text_message
    
    # Get appointment
    appointment = await db.appointments.find_one(
        {"appointment_id": appointment_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get customer and pet info
    customer = await db.customers.find_one(
        {"customer_id": appointment["customer_id"]},
        {"_id": 0}
    )
    
    pet = await db.pets.find_one(
        {"pet_id": appointment["pet_id"]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update appointment status to cancelled
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get AI settings for message tone
    ai_settings = await db.ai_settings.find_one({"user_id": user.user_id}, {"_id": 0}) or {}
    clinic_name = ai_settings.get("clinic_info", "VetFlow Veteriner Kliniği")
    
    # Parse appointment date
    apt_date = appointment.get("date", "")
    try:
        if isinstance(apt_date, str):
            from datetime import datetime as dt
            apt_dt = dt.fromisoformat(apt_date.replace("Z", "+00:00"))
            formatted_date = apt_dt.strftime("%d/%m/%Y %H:%M")
        else:
            formatted_date = str(apt_date)
    except:
        formatted_date = apt_date
    
    # Create cancellation message
    pet_name = pet.get("name", "evcil hayvanınız") if pet else "evcil hayvanınız"
    cancel_message = f"""Sayın {customer['name']},

{formatted_date} tarihli {pet_name} için olan randevunuz iptal edilmiştir.

Yeni randevu almak için bizimle iletişime geçebilirsiniz.

{clinic_name}"""
    
    # Send WhatsApp notification
    whatsapp_result = await send_text_message(customer["phone"], cancel_message)
    
    # Log the message
    await db.whatsapp_messages.insert_one({
        "message_id": generate_id("msg_"),
        "user_id": user.user_id,
        "direction": "outbound",
        "phone_number": customer["phone"],
        "message_text": cancel_message,
        "message_type": "text",
        "status": "sent" if whatsapp_result.get("success") else "failed",
        "customer_id": customer["customer_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "message": "Randevu iptal edildi ve müşteriye bildirim gönderildi",
        "whatsapp_sent": whatsapp_result.get("success", False),
        "whatsapp_mocked": whatsapp_result.get("mocked", False)
    }


@api_router.get("/pets/{pet_id}/history")
async def get_pet_history(pet_id: str, user: User = Depends(get_user)):
    """Get pet's complete history including health records and appointments."""
    # Verify pet belongs to user
    pet = await db.pets.find_one(
        {"pet_id": pet_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Get customer info
    customer = await db.customers.find_one(
        {"customer_id": pet["customer_id"]},
        {"_id": 0}
    )
    
    # Get health records
    health_records = await db.health_records.find(
        {"pet_id": pet_id, "user_id": user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    # Get appointments
    appointments = await db.appointments.find(
        {"pet_id": pet_id, "user_id": user.user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    # Get product usage (food/medicine tracking)
    product_usage = await db.pet_product_usages.find(
        {"pet_id": pet_id, "user_id": user.user_id},
        {"_id": 0}
    ).to_list(50)
    
    # Get products details for usage
    product_ids = [u.get("product_id") for u in product_usage if u.get("product_id")]
    products = {}
    if product_ids:
        product_docs = await db.products.find(
            {"product_id": {"$in": product_ids}},
            {"_id": 0}
        ).to_list(50)
        products = {p["product_id"]: p for p in product_docs}
    
    # Enrich product usage with product details
    for usage in product_usage:
        if usage.get("product_id") in products:
            usage["product"] = products[usage["product_id"]]
    
    return {
        "pet": pet,
        "customer": customer,
        "health_records": health_records,
        "appointments": appointments,
        "product_usage": product_usage
    }


# ============ PRODUCT ROUTES ============

@api_router.get("/products", response_model=List[Product])
async def get_products(
    user: User = Depends(get_user),
    category: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get products."""
    query = {"user_id": user.user_id}
    if category:
        query["category"] = category
    
    products = await db.products.find(query, {"_id": 0}).to_list(limit)
    return products


@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, user: User = Depends(get_user)):
    """Create a new product."""
    product = Product(**data.model_dump(), user_id=user.user_id)
    doc = product.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.products.insert_one(doc)
    return product


@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, data: ProductUpdate, user: User = Depends(get_user)):
    """Update a product."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.products.update_one(
        {"product_id": product_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(get_user)):
    """Delete a product."""
    result = await db.products.delete_one(
        {"product_id": product_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


# ============ PET PRODUCT USAGE ROUTES ============

@api_router.get("/pet-product-usage", response_model=List[PetProductUsage])
async def get_pet_product_usage(
    user: User = Depends(get_user),
    pet_id: Optional[str] = None
):
    """Get pet product usage records."""
    query = {"user_id": user.user_id}
    if pet_id:
        query["pet_id"] = pet_id
    
    usages = await db.pet_product_usages.find(query, {"_id": 0}).to_list(100)
    return usages


@api_router.post("/pet-product-usage", response_model=PetProductUsage)
async def create_pet_product_usage(data: PetProductUsageCreate, user: User = Depends(get_user)):
    """Create pet product usage tracking."""
    pet = await db.pets.find_one({"pet_id": data.pet_id, "user_id": user.user_id}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    product = await db.products.find_one({"product_id": data.product_id, "user_id": user.user_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    usage = PetProductUsage(
        **data.model_dump(),
        customer_id=pet["customer_id"],
        user_id=user.user_id,
        start_date=datetime.now(timezone.utc)
    )
    doc = usage.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["start_date"] = doc["start_date"].isoformat()
    doc["last_purchase_date"] = doc["last_purchase_date"].isoformat()
    
    await db.pet_product_usages.insert_one(doc)
    return usage


# ============ REMINDER ROUTES ============

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(
    user: User = Depends(get_user),
    sent: Optional[bool] = None,
    limit: int = Query(default=100, le=500)
):
    """Get reminders."""
    query = {"user_id": user.user_id}
    if sent is not None:
        query["sent"] = sent
    
    reminders = await db.reminders.find(query, {"_id": 0}).sort("due_date", 1).to_list(limit)
    return reminders


@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(data: ReminderCreate, user: User = Depends(get_user)):
    """Create a new reminder."""
    reminder = Reminder(**data.model_dump(), user_id=user.user_id)
    doc = reminder.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["due_date"] = doc["due_date"].isoformat()
    
    await db.reminders.insert_one(doc)
    return reminder


@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: User = Depends(get_user)):
    """Delete a reminder."""
    result = await db.reminders.delete_one(
        {"reminder_id": reminder_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}


# ============ FINANCE ROUTES ============

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    user: User = Depends(get_user),
    transaction_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get transactions."""
    query = {"user_id": user.user_id}
    
    if transaction_type:
        query["transaction_type"] = transaction_type
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return transactions


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(data: TransactionCreate, user: User = Depends(get_user)):
    """Create a new transaction."""
    transaction = Transaction(**data.model_dump(), user_id=user.user_id)
    doc = transaction.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["date"] = doc["date"].isoformat()
    
    await db.transactions.insert_one(doc)
    return transaction


@api_router.get("/finance/summary")
async def get_finance_summary(
    user: User = Depends(get_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get finance summary."""
    query = {"user_id": user.user_id}
    
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["transaction_type"] == "expense")
    
    # Group by category
    income_by_category = {}
    expense_by_category = {}
    
    for t in transactions:
        category = t.get("category", "Other")
        if t["transaction_type"] == "income":
            income_by_category[category] = income_by_category.get(category, 0) + t["amount"]
        else:
            expense_by_category[category] = expense_by_category.get(category, 0) + t["amount"]
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense,
        "income_by_category": income_by_category,
        "expense_by_category": expense_by_category
    }


# ============ WHATSAPP ROUTES ============

@api_router.get("/whatsapp/webhook")
async def whatsapp_webhook_verify(request: Request):
    """WhatsApp webhook verification."""
    verify_token = os.environ.get("WHATSAPP_VERIFY_TOKEN", "vetflow_webhook_verify_token")
    
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if mode == "subscribe" and token == verify_token:
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@api_router.post("/whatsapp/webhook")
async def whatsapp_webhook_receive(request: Request):
    """Receive WhatsApp webhook events with subscription limits and appointment booking."""
    from whatsapp import parse_webhook_message, send_text_message
    from ai_chat import (
        get_ai_response, check_appointment_availability,
        create_whatsapp_appointment, generate_appointment_response
    )
    from subscription import check_whatsapp_response_limit, use_whatsapp_response
    
    payload = await request.json()
    message_data = parse_webhook_message(payload)
    
    if not message_data:
        return {"status": "ok"}
    
    if message_data["type"] == "status":
        # Update message status
        await db.whatsapp_messages.update_one(
            {"message_id": message_data["message_id"]},
            {"$set": {"status": message_data["status"]}}
        )
        return {"status": "ok"}
    
    # Process incoming message
    phone = message_data["from"]
    text = message_data["text"]
    
    # Find customer by phone
    customer = await db.customers.find_one({"phone": {"$regex": phone[-10:]}}, {"_id": 0})
    is_registered = customer is not None
    
    # Get AI settings - find user by matching customer or use first user
    ai_settings = None
    user_id = None
    
    if customer:
        user_id = customer.get("user_id")
        ai_settings = await db.ai_settings.find_one({"user_id": user_id}, {"_id": 0})
    
    if not ai_settings:
        ai_settings = await db.ai_settings.find_one({}, {"_id": 0}) or {}
        user_id = ai_settings.get("user_id") or "system"
    
    # Check subscription response limits
    response_limit = await check_whatsapp_response_limit(db, user_id, phone)
    
    # Store incoming message
    await db.whatsapp_messages.insert_one({
        "message_id": message_data["message_id"],
        "user_id": user_id,
        "direction": "inbound",
        "phone_number": phone,
        "message_text": text,
        "message_type": message_data["message_type"],
        "status": "received",
        "customer_id": customer["customer_id"] if customer else None,
        "is_registered": is_registered,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Check if can respond
    if not response_limit["can_respond"]:
        logger.warning(f"Response limit reached for user {user_id}, phone {phone}")
        return {"status": "ok", "limited": True}
    
    # Generate AI response with appointment capability for registered customers
    response_text, appointment_request = await get_ai_response(
        text, 
        ai_settings, 
        is_registered=is_registered
    )
    
    # Handle appointment request for registered customers
    if appointment_request and is_registered and customer:
        # Get customer's first pet (or could be smarter about this)
        pet = await db.pets.find_one(
            {"customer_id": customer["customer_id"]},
            {"_id": 0}
        )
        
        if pet:
            # Check availability
            availability = await check_appointment_availability(
                db, user_id,
                appointment_request.get("date"),
                appointment_request.get("time")
            )
            
            if availability.get("available"):
                # Create the appointment
                apt_result = await create_whatsapp_appointment(
                    db, user_id,
                    customer["customer_id"],
                    pet["pet_id"],
                    appointment_request.get("date"),
                    appointment_request.get("time"),
                    appointment_request.get("service", "Muayene")
                )
                
                response_text = await generate_appointment_response(
                    availability, apt_result, ai_settings
                )
            else:
                # Offer alternative
                response_text = await generate_appointment_response(
                    availability, None, ai_settings
                )
    
    # Send response
    result = await send_text_message(phone, response_text)
    
    # Use response credit (only for unregistered)
    if result.get("success") or result.get("mocked"):
        await use_whatsapp_response(
            db, user_id, 
            is_registered, 
            response_limit.get("use_extra", False)
        )
    
    # Store outgoing message
    await db.whatsapp_messages.insert_one({
        "message_id": generate_id("msg_"),
        "user_id": user_id,
        "direction": "outbound",
        "phone_number": phone,
        "message_text": response_text,
        "message_type": "text",
        "status": "sent" if result.get("success") else "failed",
        "customer_id": customer["customer_id"] if customer else None,
        "is_registered": is_registered,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"status": "ok"}


@api_router.get("/whatsapp/messages", response_model=List[WhatsAppMessage])
async def get_whatsapp_messages(
    user: User = Depends(get_user),
    phone: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get WhatsApp messages."""
    query = {"user_id": user.user_id}
    if phone:
        query["phone_number"] = {"$regex": phone}
    
    messages = await db.whatsapp_messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return messages


@api_router.post("/whatsapp/send")
async def send_whatsapp_message(request: Request, user: User = Depends(get_user)):
    """Send a WhatsApp message manually."""
    from whatsapp import send_text_message
    
    body = await request.json()
    phone = body.get("phone")
    message = body.get("message")
    
    if not phone or not message:
        raise HTTPException(status_code=400, detail="phone and message required")
    
    result = await send_text_message(phone, message)
    
    # Store message
    await db.whatsapp_messages.insert_one({
        "message_id": generate_id("msg_"),
        "user_id": user.user_id,
        "direction": "outbound",
        "phone_number": phone,
        "message_text": message,
        "message_type": "text",
        "status": "sent" if result.get("success") else "failed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return result


# ============ AI SETTINGS ROUTES ============

@api_router.get("/ai-settings", response_model=AISettings)
async def get_ai_settings(user: User = Depends(get_user)):
    """Get AI settings."""
    settings = await db.ai_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    if not settings:
        # Create default settings
        default = AISettings(user_id=user.user_id)
        doc = default.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await db.ai_settings.insert_one(doc)
        return default
    return settings


@api_router.put("/ai-settings", response_model=AISettings)
async def update_ai_settings(data: AISettingsUpdate, user: User = Depends(get_user)):
    """Update AI settings."""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_settings.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return await db.ai_settings.find_one({"user_id": user.user_id}, {"_id": 0})


# ============ DASHBOARD ROUTES ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(get_user)):
    """Get dashboard statistics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Counts
    total_customers = await db.customers.count_documents({"user_id": user.user_id})
    total_pets = await db.pets.count_documents({"user_id": user.user_id})
    
    # Today's appointments
    today_appointments = await db.appointments.count_documents({
        "user_id": user.user_id,
        "date": {"$gte": today_start.isoformat(), "$lt": (today_start + timedelta(days=1)).isoformat()}
    })
    
    # Pending reminders
    pending_reminders = await db.reminders.count_documents({
        "user_id": user.user_id,
        "sent": False,
        "due_date": {"$lte": (now + timedelta(days=7)).isoformat()}
    })
    
    # Monthly income
    monthly_transactions = await db.transactions.find({
        "user_id": user.user_id,
        "date": {"$gte": month_start.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    monthly_income = sum(t["amount"] for t in monthly_transactions if t["transaction_type"] == "income")
    monthly_expense = sum(t["amount"] for t in monthly_transactions if t["transaction_type"] == "expense")
    
    # Recent appointments
    recent_appointments = await db.appointments.find(
        {"user_id": user.user_id, "date": {"$gte": now.isoformat()}},
        {"_id": 0}
    ).sort("date", 1).to_list(5)
    
    return {
        "total_customers": total_customers,
        "total_pets": total_pets,
        "today_appointments": today_appointments,
        "pending_reminders": pending_reminders,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "monthly_profit": monthly_income - monthly_expense,
        "recent_appointments": recent_appointments
    }


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "VetFlow API v1.0.0", "status": "running"}


# ============ SUBSCRIPTION & PAYMENT ROUTES ============

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get all available subscription plans."""
    return {
        "plans": SUBSCRIPTION_PLANS,
        "response_packages": RESPONSE_PACKAGES
    }


@api_router.get("/subscription/current")
async def get_current_subscription(user: User = Depends(get_user)):
    """Get current user's subscription."""
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not subscription:
        return {"subscription": None, "has_subscription": False}
    
    plan_config = SUBSCRIPTION_PLANS.get(subscription.get("plan", "starter"))
    limit_check = await check_customer_limit(db, user.user_id)
    
    return {
        "subscription": subscription,
        "has_subscription": True,
        "plan_details": plan_config,
        "customer_usage": limit_check
    }


@api_router.get("/subscription/limits")
async def get_subscription_limits(user: User = Depends(get_user)):
    """Get current subscription limits and usage."""
    customer_limit = await check_customer_limit(db, user.user_id)
    
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "has_subscription": False,
            "customer_limit": customer_limit,
            "whatsapp_limit": {"can_respond": False, "message": "Abonelik gerekli"}
        }
    
    plan = subscription.get("plan", "starter")
    plan_config = SUBSCRIPTION_PLANS.get(plan)
    
    return {
        "has_subscription": True,
        "plan": plan,
        "plan_name": plan_config["name"],
        "customer_limit": customer_limit,
        "whatsapp_responses": {
            "monthly_limit": plan_config["unregistered_response_limit"],
            "used": subscription.get("unregistered_responses_used", 0),
            "extra_balance": subscription.get("extra_responses_balance", 0),
            "remaining": (plan_config["unregistered_response_limit"] - subscription.get("unregistered_responses_used", 0)) + subscription.get("extra_responses_balance", 0)
        },
        "period_end": subscription.get("current_period_end")
    }


@api_router.post("/subscription/checkout")
async def create_subscription_checkout(request: Request, user: User = Depends(get_user)):
    """Create a Stripe checkout session for subscription."""
    body = await request.json()
    plan_id = body.get("plan_id")
    origin_url = body.get("origin_url")
    
    if not plan_id or plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url required")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    # Create checkout session
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/settings?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/settings?payment=cancelled"
    
    checkout_request = CheckoutSessionRequest(
        amount=plan["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user.user_id,
            "plan_id": plan_id,
            "type": "subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        transaction_id=generate_transaction_id(),
        user_id=user.user_id,
        amount=plan["price"],
        currency="usd",
        transaction_type="subscription",
        plan_or_pack_id=plan_id,
        stripe_session_id=session.session_id,
        payment_status="pending",
        metadata={"plan_name": plan["name"]}
    )
    
    doc = transaction.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.payment_transactions.insert_one(doc)
    
    return {"url": session.url, "session_id": session.session_id}


@api_router.post("/subscription/response-pack/checkout")
async def create_response_pack_checkout(request: Request, user: User = Depends(get_user)):
    """Create a Stripe checkout session for response pack purchase."""
    body = await request.json()
    pack_id = body.get("pack_id")
    origin_url = body.get("origin_url")
    
    if not pack_id or pack_id not in RESPONSE_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid pack")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url required")
    
    # Check if user has active subscription
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=403, detail="Aktif abonelik gerekli")
    
    pack = RESPONSE_PACKAGES[pack_id]
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/settings?payment=success&session_id={{CHECKOUT_SESSION_ID}}&type=response_pack"
    cancel_url = f"{origin_url}/settings?payment=cancelled"
    
    checkout_request = CheckoutSessionRequest(
        amount=pack["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user.user_id,
            "pack_id": pack_id,
            "type": "response_pack",
            "responses": str(pack["responses"])
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        transaction_id=generate_transaction_id(),
        user_id=user.user_id,
        amount=pack["price"],
        currency="usd",
        transaction_type="response_pack",
        plan_or_pack_id=pack_id,
        stripe_session_id=session.session_id,
        payment_status="pending",
        metadata={"pack_name": pack["name"], "responses": pack["responses"]}
    )
    
    doc = transaction.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.payment_transactions.insert_one(doc)
    
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/subscription/payment/status/{session_id}")
async def get_payment_status(session_id: str, user: User = Depends(get_user)):
    """Check payment status and activate subscription if paid."""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    # Check if already processed
    existing_tx = await db.payment_transactions.find_one(
        {"stripe_session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not existing_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if existing_tx.get("payment_status") == "paid":
        return {"status": "paid", "already_processed": True}
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if status.payment_status == "paid":
            tx_type = existing_tx.get("transaction_type")
            
            if tx_type == "subscription":
                # Activate or update subscription
                plan_id = existing_tx.get("plan_or_pack_id")
                now = datetime.now(timezone.utc)
                
                # Check for existing subscription
                existing_sub = await db.subscriptions.find_one(
                    {"user_id": user.user_id},
                    {"_id": 0}
                )
                
                if existing_sub:
                    # Update existing subscription
                    await db.subscriptions.update_one(
                        {"user_id": user.user_id},
                        {"$set": {
                            "plan": plan_id,
                            "status": "active",
                            "current_period_start": now.isoformat(),
                            "current_period_end": (now + timedelta(days=30)).isoformat(),
                            "unregistered_responses_used": 0,
                            "updated_at": now.isoformat()
                        }}
                    )
                else:
                    # Create new subscription
                    customer_count = await db.customers.count_documents({"user_id": user.user_id})
                    subscription = Subscription(
                        subscription_id=generate_subscription_id(),
                        user_id=user.user_id,
                        plan=plan_id,
                        status="active",
                        current_period_start=now,
                        current_period_end=now + timedelta(days=30),
                        customer_count=customer_count
                    )
                    
                    doc = subscription.model_dump()
                    doc["created_at"] = doc["created_at"].isoformat()
                    doc["updated_at"] = doc["updated_at"].isoformat()
                    doc["current_period_start"] = doc["current_period_start"].isoformat()
                    doc["current_period_end"] = doc["current_period_end"].isoformat()
                    await db.subscriptions.insert_one(doc)
            
            elif tx_type == "response_pack":
                # Add response credits
                responses = int(existing_tx.get("metadata", {}).get("responses", 0))
                await add_extra_responses(db, user.user_id, responses)
        
        return {
            "status": status.payment_status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
        
    except Exception as e:
        logger.error(f"Payment status check error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error checking payment status")


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks."""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")

    # Local / dev ortamda Stripe kapalıysa sessizce OK dön
    if not stripe_api_key:
        return {"status": "ok"}

    # emergentintegrations yoksa (StripeCheckout import edilemediyse) sessizce OK dön
    if StripeCheckout is None:
        return {"status": "ok"}

    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")

        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)

        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata or {}

            # Update transaction
            await db.payment_transactions.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )

            # Process based on type
            tx_type = metadata.get("type")
            user_id = metadata.get("user_id")

            if tx_type == "subscription" and user_id:
                plan_id = metadata.get("plan_id")
                now = datetime.now(timezone.utc)

                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "plan": plan_id,
                        "status": "active",
                        "current_period_start": now.isoformat(),
                        "current_period_end": (now + timedelta(days=30)).isoformat(),
                        "unregistered_responses_used": 0,
                        "updated_at": now.isoformat()
                    }},
                    upsert=True
                )

            elif tx_type == "response_pack" and user_id:
                responses = int(metadata.get("responses", 0))
                await add_extra_responses(db, user_id, responses)

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "ok"}



@api_router.post("/subscription/start-trial")
async def start_trial(user: User = Depends(get_user)):
    """Start a 7-day free trial."""
    # Check if already has subscription
    existing = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Zaten bir aboneliğiniz var")
    
    subscription = await create_trial_subscription(db, user.user_id)
    
    return {
        "message": "7 günlük deneme başlatıldı",
        "subscription": subscription.model_dump()
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup."""
    from scheduler import setup_scheduler
    setup_scheduler(db)
    logger.info("VetFlow API started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    from scheduler import shutdown_scheduler
    shutdown_scheduler()
    client.close()
    logger.info("VetFlow API shutdown")
