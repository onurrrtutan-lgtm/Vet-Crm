"""
VetFlow - AI Chat Module using OpenAI GPT via Emergent Integrations
With appointment booking capabilities via WhatsApp
"""
import os
import re
import json
from dotenv import load_dotenv
load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage
from typing import Optional, Dict, Tuple
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")


def build_system_prompt(ai_settings: dict, is_registered: bool = False) -> str:
    """Build system prompt from AI settings."""
    tone_instructions = {
        "friendly": "Sen sıcak, samimi ve yardımsever bir veteriner asistanısın. Evcil hayvan sahipleriyle dostça ve rahatlatıcı bir şekilde iletişim kur.",
        "professional": "Sen profesyonel ve uzman bir veteriner asistanısın. Bilgi verirken net, doğru ve güvenilir ol.",
        "casual": "Sen rahat ve konuşkan bir veteriner asistanısın. Günlük bir sohbet havasında yanıtlar ver."
    }
    
    tone = ai_settings.get("tone", "friendly")
    language = ai_settings.get("language", "tr")
    
    appointment_instructions = ""
    if is_registered:
        appointment_instructions = """
RANDEVU OLUŞTURMA TALİMATLARI:
Kayıtlı müşteriler WhatsApp üzerinden randevu alabilir. Eğer müşteri randevu almak isterse:
1. Hangi tarih ve saat istediğini sor
2. Hangi hizmet için geleceklerini sor (muayene, aşı, kontrol vb.)
3. Cevaplarını aldıktan sonra RANDEVU TALEBİ olarak formatla

Eğer müşteri tarih ve saat belirtirse, cevabını şu formatla bitir:
[RANDEVU_TALEBI]
tarih: YYYY-MM-DD
saat: HH:MM
hizmet: <hizmet türü>
[/RANDEVU_TALEBI]
"""

    base_prompt = f"""Sen bir veteriner kliniği için AI asistanısın.

{tone_instructions.get(tone, tone_instructions["friendly"])}

Klinik Bilgileri:
{ai_settings.get("clinic_info", "Bilgi mevcut değil")}

Sunulan Hizmetler:
{ai_settings.get("services", "Genel veterinerlik hizmetleri")}

Çalışma Saatleri:
{ai_settings.get("working_hours", "Hafta içi 09:00-18:00")}

{ai_settings.get("custom_instructions", "")}

{appointment_instructions}

Kurallar:
1. Her zaman {language.upper()} dilinde yanıt ver
2. Acil durumlar için mutlaka kliniğe gelmelerini öner
3. Tıbbi teşhis koyma, sadece genel bilgi ver
4. Kayıtlı müşteriler randevu alabilir, kayıtsızlar için telefon numarası paylaş
5. Fiyat bilgisi verme, kliniğe danışmalarını söyle
"""
    return base_prompt


def parse_appointment_request(response: str) -> Optional[Dict]:
    """
    Parse appointment request from AI response.
    Returns dict with date, time, service if found.
    """
    pattern = r'\[RANDEVU_TALEBI\](.*?)\[/RANDEVU_TALEBI\]'
    match = re.search(pattern, response, re.DOTALL)
    
    if not match:
        return None
    
    content = match.group(1).strip()
    result = {}
    
    # Parse date
    date_match = re.search(r'tarih:\s*(\d{4}-\d{2}-\d{2})', content)
    if date_match:
        result['date'] = date_match.group(1)
    
    # Parse time
    time_match = re.search(r'saat:\s*(\d{1,2}:\d{2})', content)
    if time_match:
        result['time'] = time_match.group(1)
    
    # Parse service
    service_match = re.search(r'hizmet:\s*(.+?)(?:\n|$)', content)
    if service_match:
        result['service'] = service_match.group(1).strip()
    
    if result.get('date') and result.get('time'):
        return result
    
    return None


def clean_response_for_customer(response: str) -> str:
    """Remove appointment markup from response for customer."""
    return re.sub(r'\[RANDEVU_TALEBI\].*?\[/RANDEVU_TALEBI\]', '', response, flags=re.DOTALL).strip()


async def get_ai_response(
    message: str,
    ai_settings: dict,
    is_registered: bool = False,
    conversation_history: Optional[list] = None
) -> Tuple[str, Optional[Dict]]:
    """
    Get AI response for a customer message.
    Returns: (response_text, appointment_request or None)
    """
    if not EMERGENT_LLM_KEY:
        logger.error("EMERGENT_LLM_KEY not configured")
        return "Şu anda AI asistan hizmeti mevcut değil. Lütfen kliniği arayın.", None
    
    try:
        system_prompt = build_system_prompt(ai_settings, is_registered)
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"vetflow_{id(message)}",
            system_message=system_prompt
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        # Check for appointment request
        appointment_request = None
        if is_registered:
            appointment_request = parse_appointment_request(response)
        
        # Clean response for customer
        clean_response = clean_response_for_customer(response)
        
        return clean_response, appointment_request
        
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        return "Üzgünüm, şu anda yanıt veremiyorum. Lütfen kliniği doğrudan arayın.", None


async def check_appointment_availability(db, user_id: str, date_str: str, time_str: str) -> Dict:
    """
    Check if the requested appointment slot is available.
    Returns: {"available": bool, "alternative": {...} or None}
    """
    try:
        # Parse requested datetime
        requested_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        requested_dt = requested_dt.replace(tzinfo=timezone.utc)
        
        # Check working hours (default 09:00-18:00)
        hour = requested_dt.hour
        if hour < 9 or hour >= 18:
            return {
                "available": False,
                "reason": "Çalışma saatleri dışında",
                "alternative": await find_next_available_slot(db, user_id, requested_dt)
            }
        
        # Check if weekend (Saturday=5, Sunday=6)
        if requested_dt.weekday() >= 5:
            return {
                "available": False,
                "reason": "Hafta sonu kapalıyız",
                "alternative": await find_next_available_slot(db, user_id, requested_dt)
            }
        
        # Check for existing appointments (within 30 min window)
        start_window = (requested_dt - timedelta(minutes=30)).isoformat()
        end_window = (requested_dt + timedelta(minutes=30)).isoformat()
        
        existing = await db.appointments.find_one({
            "user_id": user_id,
            "date": {"$gte": start_window, "$lt": end_window},
            "status": {"$in": ["scheduled", "confirmed"]}
        })
        
        if existing:
            return {
                "available": False,
                "reason": "Bu saatte başka bir randevu var",
                "alternative": await find_next_available_slot(db, user_id, requested_dt)
            }
        
        return {"available": True, "datetime": requested_dt.isoformat()}
        
    except Exception as e:
        logger.error(f"Availability check error: {str(e)}")
        return {"available": False, "reason": "Tarih formatı hatalı", "alternative": None}


async def find_next_available_slot(db, user_id: str, start_from: datetime) -> Optional[Dict]:
    """Find the next available appointment slot."""
    try:
        current = start_from
        
        # Search for next 7 days
        for _ in range(7 * 18):  # 7 days * 18 slots per day
            # Skip weekends
            if current.weekday() >= 5:
                current = current.replace(hour=9, minute=0) + timedelta(days=(7 - current.weekday()))
                continue
            
            # Ensure within working hours
            if current.hour < 9:
                current = current.replace(hour=9, minute=0)
            elif current.hour >= 18:
                current = current.replace(hour=9, minute=0) + timedelta(days=1)
                continue
            
            # Check if slot is available
            start_window = (current - timedelta(minutes=15)).isoformat()
            end_window = (current + timedelta(minutes=15)).isoformat()
            
            existing = await db.appointments.find_one({
                "user_id": user_id,
                "date": {"$gte": start_window, "$lt": end_window},
                "status": {"$in": ["scheduled", "confirmed"]}
            })
            
            if not existing:
                return {
                    "date": current.strftime("%Y-%m-%d"),
                    "time": current.strftime("%H:%M"),
                    "datetime": current.isoformat()
                }
            
            # Move to next 30-minute slot
            current = current + timedelta(minutes=30)
        
        return None
        
    except Exception as e:
        logger.error(f"Find slot error: {str(e)}")
        return None


async def create_whatsapp_appointment(
    db, 
    user_id: str, 
    customer_id: str, 
    pet_id: str,
    date_str: str, 
    time_str: str, 
    service: str
) -> Dict:
    """
    Create an appointment from WhatsApp request.
    Returns the created appointment or error.
    """
    from models import Appointment, generate_id
    
    try:
        # Create datetime
        appointment_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        appointment_dt = appointment_dt.replace(tzinfo=timezone.utc)
        
        # Create appointment
        appointment = Appointment(
            appointment_id=generate_id("apt_"),
            user_id=user_id,
            customer_id=customer_id,
            pet_id=pet_id,
            title=service or "WhatsApp Randevusu",
            description="WhatsApp üzerinden oluşturuldu",
            date=appointment_dt,
            duration_minutes=30,
            status="confirmed"  # Auto-confirm WhatsApp appointments
        )
        
        doc = appointment.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        doc["date"] = doc["date"].isoformat()
        
        await db.appointments.insert_one(doc)
        
        return {
            "success": True,
            "appointment": appointment,
            "message": f"Randevunuz {appointment_dt.strftime('%d/%m/%Y %H:%M')} tarihine oluşturuldu."
        }
        
    except Exception as e:
        logger.error(f"Create appointment error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Randevu oluşturulurken bir hata oluştu."
        }


async def generate_appointment_response(
    availability: Dict,
    appointment_result: Optional[Dict] = None,
    ai_settings: dict = None
) -> str:
    """Generate a human-friendly response for appointment booking."""
    tone = (ai_settings or {}).get("tone", "friendly")
    
    if appointment_result and appointment_result.get("success"):
        return f"✅ {appointment_result['message']} Size hatırlatma göndereceğiz. Görüşmek üzere! 🐾"
    
    if not availability.get("available"):
        reason = availability.get("reason", "Bu saat uygun değil")
        alternative = availability.get("alternative")
        
        if alternative:
            alt_date = alternative.get("date")
            alt_time = alternative.get("time")
            return f"Üzgünüm, {reason}. En yakın uygun zamanımız {alt_date} tarihinde saat {alt_time}. Bu saate randevu almak ister misiniz? (Evet/Hayır)"
        
        return f"Üzgünüm, {reason}. Lütfen başka bir tarih ve saat belirtir misiniz?"
    
    return "Randevunuz için teşekkürler!"


async def generate_reminder_message(
    reminder_type: str,
    customer_name: str,
    pet_name: str,
    details: str,
    ai_settings: dict
) -> str:
    """
    Generate a personalized reminder message using AI.
    """
    if not EMERGENT_LLM_KEY:
        # Fallback to template messages
        templates = {
            "appointment": f"Sayın {customer_name}, {pet_name} için randevunuz yaklaşıyor. {details}",
            "vaccination": f"Sayın {customer_name}, {pet_name}'in aşı zamanı geldi. {details}",
            "food": f"Sayın {customer_name}, {pet_name}'in maması bitmek üzere. {details}",
            "medication": f"Sayın {customer_name}, {pet_name}'in ilacı bitmek üzere. {details}",
            "checkup": f"Sayın {customer_name}, {pet_name} için kontrol zamanı. {details}"
        }
        return templates.get(reminder_type, f"Sayın {customer_name}, {pet_name} için hatırlatma: {details}")
    
    try:
        tone = ai_settings.get("tone", "friendly")
        clinic_name = ai_settings.get("clinic_info", "VetFlow Veteriner Kliniği")
        
        prompt = f"""Bir veteriner kliniği için WhatsApp hatırlatma mesajı oluştur.

Müşteri Adı: {customer_name}
Evcil Hayvan: {pet_name}
Hatırlatma Türü: {reminder_type}
Detaylar: {details}
Klinik: {clinic_name}
Ton: {tone}

Kısa, samimi ve profesyonel bir mesaj yaz. Emojiler kullanabilirsin ama abartma."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"reminder_{id(prompt)}",
            system_message="Sen bir veteriner kliniği için mesaj yazan asistansın. Kısa ve etkili mesajlar yaz."
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=prompt))
        return response
        
    except Exception as e:
        logger.error(f"Reminder generation error: {str(e)}")
        return f"Sayın {customer_name}, {pet_name} için hatırlatma: {details}"
