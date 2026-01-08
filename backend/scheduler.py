"""
VetFlow - Scheduler Module for automated reminders
Uses APScheduler for background task scheduling
"""
import asyncio
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def check_and_send_reminders(db):
    """
    Check for upcoming reminders and send WhatsApp messages.
    Runs every hour.
    """
    from whatsapp import send_text_message, is_whatsapp_configured
    from ai_chat import generate_reminder_message
    
    try:
        now = datetime.now(timezone.utc)
        reminder_window = now + timedelta(days=2)
        
        # Find reminders due in the next 2 days that haven't been sent
        reminders = await db.reminders.find({
            "due_date": {"$lte": reminder_window.isoformat(), "$gte": now.isoformat()},
            "sent": False
        }, {"_id": 0}).to_list(100)
        
        for reminder in reminders:
            try:
                # Get customer info
                customer = await db.customers.find_one(
                    {"customer_id": reminder["customer_id"]},
                    {"_id": 0}
                )
                
                if not customer:
                    continue
                
                # Get pet info if applicable
                pet_name = "evcil hayvanınız"
                if reminder.get("pet_id"):
                    pet = await db.pets.find_one(
                        {"pet_id": reminder["pet_id"]},
                        {"_id": 0}
                    )
                    if pet:
                        pet_name = pet["name"]
                
                # Get AI settings for the user
                ai_settings = await db.ai_settings.find_one(
                    {"user_id": reminder["user_id"]},
                    {"_id": 0}
                ) or {}
                
                # Generate personalized message
                message = await generate_reminder_message(
                    reminder_type=reminder["reminder_type"],
                    customer_name=customer["name"],
                    pet_name=pet_name,
                    details=reminder["message"],
                    ai_settings=ai_settings
                )
                
                # Send WhatsApp message
                result = await send_text_message(customer["phone"], message)
                
                # Update reminder status
                await db.reminders.update_one(
                    {"reminder_id": reminder["reminder_id"]},
                    {
                        "$set": {
                            "sent": True,
                            "sent_at": now.isoformat()
                        }
                    }
                )
                
                # Log message
                await db.whatsapp_messages.insert_one({
                    "message_id": f"msg_{datetime.now().timestamp()}",
                    "user_id": reminder["user_id"],
                    "direction": "outbound",
                    "phone_number": customer["phone"],
                    "message_text": message,
                    "message_type": "text",
                    "status": "sent" if result.get("success") else "failed",
                    "customer_id": customer["customer_id"],
                    "created_at": now.isoformat()
                })
                
                logger.info(f"Reminder sent: {reminder['reminder_id']}")
                
            except Exception as e:
                logger.error(f"Error sending reminder {reminder.get('reminder_id')}: {str(e)}")
                
    except Exception as e:
        logger.error(f"Reminder check error: {str(e)}")


async def check_food_reminders(db):
    """
    Check for pets whose food is running low based on consumption tracking.
    Runs daily at 9 AM.
    """
    from whatsapp import send_text_message
    from ai_chat import generate_reminder_message
    
    try:
        now = datetime.now(timezone.utc)
        
        # Get all active product usages
        usages = await db.pet_product_usages.find(
            {"auto_remind": True},
            {"_id": 0}
        ).to_list(1000)
        
        for usage in usages:
            try:
                # Calculate remaining days
                last_purchase = datetime.fromisoformat(usage["last_purchase_date"].replace("Z", "+00:00"))
                if last_purchase.tzinfo is None:
                    last_purchase = last_purchase.replace(tzinfo=timezone.utc)
                
                days_since_purchase = (now - last_purchase).days
                total_consumed = days_since_purchase * usage["daily_consumption"]
                remaining = usage["last_purchase_quantity"] - total_consumed
                remaining_days = remaining / usage["daily_consumption"] if usage["daily_consumption"] > 0 else 999
                
                # Check if reminder needed
                if remaining_days <= usage["remind_days_before"] and remaining_days > 0:
                    # Check if already reminded today
                    existing_reminder = await db.reminders.find_one({
                        "pet_id": usage["pet_id"],
                        "product_id": usage["product_id"],
                        "reminder_type": "food",
                        "due_date": {"$gte": (now - timedelta(days=1)).isoformat()}
                    })
                    
                    if existing_reminder:
                        continue
                    
                    # Get customer and pet info
                    customer = await db.customers.find_one(
                        {"customer_id": usage["customer_id"]},
                        {"_id": 0}
                    )
                    pet = await db.pets.find_one(
                        {"pet_id": usage["pet_id"]},
                        {"_id": 0}
                    )
                    product = await db.products.find_one(
                        {"product_id": usage["product_id"]},
                        {"_id": 0}
                    )
                    
                    if not all([customer, pet, product]):
                        continue
                    
                    # Get AI settings
                    ai_settings = await db.ai_settings.find_one(
                        {"user_id": usage["user_id"]},
                        {"_id": 0}
                    ) or {}
                    
                    # Generate message
                    details = f"{product['name']} yaklaşık {int(remaining_days)} gün içinde bitecek."
                    message = await generate_reminder_message(
                        reminder_type="food",
                        customer_name=customer["name"],
                        pet_name=pet["name"],
                        details=details,
                        ai_settings=ai_settings
                    )
                    
                    # Send message
                    result = await send_text_message(customer["phone"], message)
                    
                    # Create reminder record
                    await db.reminders.insert_one({
                        "reminder_id": f"rem_{datetime.now().timestamp()}",
                        "user_id": usage["user_id"],
                        "reminder_type": "food",
                        "title": f"{pet['name']} - Mama Hatırlatması",
                        "message": details,
                        "due_date": now.isoformat(),
                        "customer_id": customer["customer_id"],
                        "pet_id": pet["pet_id"],
                        "product_id": product["product_id"],
                        "sent": True,
                        "sent_at": now.isoformat(),
                        "created_at": now.isoformat()
                    })
                    
                    logger.info(f"Food reminder sent for pet {pet['pet_id']}")
                    
            except Exception as e:
                logger.error(f"Error processing food usage {usage.get('usage_id')}: {str(e)}")
                
    except Exception as e:
        logger.error(f"Food reminder check error: {str(e)}")


async def check_appointment_reminders(db):
    """
    Check for upcoming appointments and send reminders.
    Runs every 2 hours.
    """
    from whatsapp import send_text_message
    from ai_chat import generate_reminder_message
    
    try:
        now = datetime.now(timezone.utc)
        reminder_window = now + timedelta(days=2)
        
        # Find appointments in the next 2 days that haven't had reminders sent
        appointments = await db.appointments.find({
            "date": {"$lte": reminder_window.isoformat(), "$gte": now.isoformat()},
            "reminder_sent": False,
            "status": {"$in": ["scheduled", "confirmed"]}
        }, {"_id": 0}).to_list(100)
        
        for apt in appointments:
            try:
                customer = await db.customers.find_one(
                    {"customer_id": apt["customer_id"]},
                    {"_id": 0}
                )
                pet = await db.pets.find_one(
                    {"pet_id": apt["pet_id"]},
                    {"_id": 0}
                )
                
                if not all([customer, pet]):
                    continue
                
                ai_settings = await db.ai_settings.find_one(
                    {"user_id": apt["user_id"]},
                    {"_id": 0}
                ) or {}
                
                apt_date = datetime.fromisoformat(apt["date"].replace("Z", "+00:00"))
                details = f"{apt['title']} - {apt_date.strftime('%d/%m/%Y %H:%M')}"
                
                message = await generate_reminder_message(
                    reminder_type="appointment",
                    customer_name=customer["name"],
                    pet_name=pet["name"],
                    details=details,
                    ai_settings=ai_settings
                )
                
                result = await send_text_message(customer["phone"], message)
                
                await db.appointments.update_one(
                    {"appointment_id": apt["appointment_id"]},
                    {"$set": {"reminder_sent": True}}
                )
                
                logger.info(f"Appointment reminder sent: {apt['appointment_id']}")
                
            except Exception as e:
                logger.error(f"Error sending appointment reminder: {str(e)}")
                
    except Exception as e:
        logger.error(f"Appointment reminder check error: {str(e)}")


def setup_scheduler(db):
    """Setup and start the scheduler with all jobs."""
    
    # Check reminders every hour
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(minute=0),
        args=[db],
        id="check_reminders",
        replace_existing=True
    )
    
    # Check food reminders daily at 9 AM
    scheduler.add_job(
        check_food_reminders,
        CronTrigger(hour=9, minute=0),
        args=[db],
        id="check_food_reminders",
        replace_existing=True
    )
    
    # Check appointment reminders every 2 hours
    scheduler.add_job(
        check_appointment_reminders,
        CronTrigger(hour="*/2", minute=30),
        args=[db],
        id="check_appointment_reminders",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started with reminder jobs")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown complete")
