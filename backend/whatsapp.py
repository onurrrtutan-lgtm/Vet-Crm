"""
VetFlow - WhatsApp Business Cloud API Module
NOTE: This module requires WhatsApp Business API credentials to be configured.
Currently MOCKED for development - real integration requires:
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
"""
import os
import httpx
import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = "v18.0"
WHATSAPP_API_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"


def is_whatsapp_configured() -> bool:
    """Check if WhatsApp credentials are configured."""
    return bool(WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID)


async def send_text_message(phone_number: str, message: str) -> dict:
    """
    Send a text message via WhatsApp Business API.
    Returns message status.
    
    NOTE: Currently MOCKED - requires WhatsApp Business API credentials
    """
    if not is_whatsapp_configured():
        logger.warning("WhatsApp not configured - message not sent")
        return {
            "success": False,
            "mocked": True,
            "message": "WhatsApp credentials not configured",
            "phone": phone_number,
            "text": message
        }
    
    # Format phone number (remove + and spaces)
    formatted_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
    
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": formatted_phone,
        "type": "text",
        "text": {"body": message}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message_id": data.get("messages", [{}])[0].get("id"),
                    "phone": formatted_phone
                }
            else:
                logger.error(f"WhatsApp API error: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "phone": formatted_phone
                }
    except Exception as e:
        logger.error(f"WhatsApp send error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "phone": formatted_phone
        }


async def send_template_message(
    phone_number: str,
    template_name: str,
    language_code: str = "tr",
    components: Optional[list] = None
) -> dict:
    """
    Send a template message via WhatsApp Business API.
    
    NOTE: Currently MOCKED - requires WhatsApp Business API credentials
    """
    if not is_whatsapp_configured():
        logger.warning("WhatsApp not configured - template message not sent")
        return {
            "success": False,
            "mocked": True,
            "message": "WhatsApp credentials not configured",
            "phone": phone_number,
            "template": template_name
        }
    
    formatted_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
    
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    template_obj = {
        "name": template_name,
        "language": {"code": language_code}
    }
    
    if components:
        template_obj["components"] = components
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": formatted_phone,
        "type": "template",
        "template": template_obj
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message_id": data.get("messages", [{}])[0].get("id"),
                    "phone": formatted_phone
                }
            else:
                logger.error(f"WhatsApp template error: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "phone": formatted_phone
                }
    except Exception as e:
        logger.error(f"WhatsApp template send error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "phone": formatted_phone
        }


def parse_webhook_message(payload: dict) -> Optional[dict]:
    """
    Parse incoming WhatsApp webhook payload.
    Returns extracted message data or None.
    """
    try:
        entry = payload.get("entry", [])
        if not entry:
            return None
        
        changes = entry[0].get("changes", [])
        if not changes:
            return None
        
        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        
        if not messages:
            # Check for status updates
            statuses = value.get("statuses", [])
            if statuses:
                status = statuses[0]
                return {
                    "type": "status",
                    "message_id": status.get("id"),
                    "status": status.get("status"),
                    "timestamp": status.get("timestamp")
                }
            return None
        
        message = messages[0]
        contacts = value.get("contacts", [{}])
        
        return {
            "type": "message",
            "message_id": message.get("id"),
            "from": message.get("from"),
            "timestamp": message.get("timestamp"),
            "message_type": message.get("type"),
            "text": message.get("text", {}).get("body", ""),
            "contact_name": contacts[0].get("profile", {}).get("name", "")
        }
    except Exception as e:
        logger.error(f"Webhook parse error: {str(e)}")
        return None
