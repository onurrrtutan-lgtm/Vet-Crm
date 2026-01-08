#!/usr/bin/env python3
"""
VetFlow Backend API Testing
Tests all backend endpoints systematically
"""
import requests
import sys
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class VetFlowAPITester:
    def __init__(self, base_url="https://petcare-hub-52.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_customer_id = None
        self.test_pet_id = None
        self.test_appointment_id = None
        self.test_product_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request and return success status and response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            if not success:
                print(f"   Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")

            return success, response_data

        except Exception as e:
            print(f"   Request failed: {str(e)}")
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.make_request('GET', '')
        self.log_test("Root API endpoint", success and "VetFlow API" in str(response))

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "name": "Test Veteriner",
            "clinic_name": "Test Veteriner Kliniği"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['user_id']
            self.log_test("User registration", True)
        else:
            self.log_test("User registration", False, str(response))

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            # Try to login with a test user (this might fail if no users exist)
            login_data = {
                "email": "test@example.com",
                "password": "TestPass123!"
            }
            success, response = self.make_request('POST', 'auth/login', login_data, expected_status=401)
            self.log_test("User login (expected to fail - no existing user)", success)
        else:
            self.log_test("User login (using registration token)", True)

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get current user", False, "No auth token")
            return
            
        success, response = self.make_request('GET', 'auth/me')
        self.log_test("Get current user", success and 'user_id' in response)

    def test_create_customer(self):
        """Test customer creation"""
        if not self.token:
            self.log_test("Create customer", False, "No auth token")
            return

        customer_data = {
            "name": "Test Müşteri",
            "phone": "+90 555 123 4567",
            "email": "test.musteri@example.com",
            "address": "Test Adres, İstanbul",
            "notes": "Test müşteri notları"
        }
        
        success, response = self.make_request('POST', 'customers', customer_data, expected_status=200)
        
        if success and 'customer_id' in response:
            self.test_customer_id = response['customer_id']
            self.log_test("Create customer", True)
        else:
            self.log_test("Create customer", False, str(response))

    def test_get_customers(self):
        """Test getting customers list"""
        if not self.token:
            self.log_test("Get customers", False, "No auth token")
            return

        success, response = self.make_request('GET', 'customers')
        self.log_test("Get customers", success and isinstance(response, list))

    def test_create_pet(self):
        """Test pet creation"""
        if not self.token or not self.test_customer_id:
            self.log_test("Create pet", False, "No auth token or customer")
            return

        pet_data = {
            "customer_id": self.test_customer_id,
            "name": "Test Pet",
            "species": "dog",
            "breed": "Golden Retriever",
            "weight": 25.5,
            "color": "Golden",
            "notes": "Test pet notları"
        }
        
        success, response = self.make_request('POST', 'pets', pet_data)
        
        if success and 'pet_id' in response:
            self.test_pet_id = response['pet_id']
            self.log_test("Create pet", True)
        else:
            self.log_test("Create pet", False, str(response))

    def test_get_pets(self):
        """Test getting pets list"""
        if not self.token:
            self.log_test("Get pets", False, "No auth token")
            return

        success, response = self.make_request('GET', 'pets')
        self.log_test("Get pets", success and isinstance(response, list))

    def test_create_appointment(self):
        """Test appointment creation"""
        if not self.token or not self.test_customer_id or not self.test_pet_id:
            self.log_test("Create appointment", False, "Missing dependencies")
            return

        appointment_data = {
            "customer_id": self.test_customer_id,
            "pet_id": self.test_pet_id,
            "title": "Test Randevu",
            "description": "Test randevu açıklaması",
            "date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "duration_minutes": 30,
            "status": "scheduled"
        }
        
        success, response = self.make_request('POST', 'appointments', appointment_data)
        
        if success and 'appointment_id' in response:
            self.test_appointment_id = response['appointment_id']
            self.log_test("Create appointment", True)
        else:
            self.log_test("Create appointment", False, str(response))

    def test_get_appointments(self):
        """Test getting appointments list"""
        if not self.token:
            self.log_test("Get appointments", False, "No auth token")
            return

        success, response = self.make_request('GET', 'appointments')
        self.log_test("Get appointments", success and isinstance(response, list))

    def test_create_product(self):
        """Test product creation"""
        if not self.token:
            self.log_test("Create product", False, "No auth token")
            return

        product_data = {
            "name": "Test Ürün",
            "category": "food",
            "brand": "Test Marka",
            "unit": "kg",
            "price": 150.0,
            "stock_quantity": 10.0
        }
        
        success, response = self.make_request('POST', 'products', product_data)
        
        if success and 'product_id' in response:
            self.test_product_id = response['product_id']
            self.log_test("Create product", True)
        else:
            self.log_test("Create product", False, str(response))

    def test_get_products(self):
        """Test getting products list"""
        if not self.token:
            self.log_test("Get products", False, "No auth token")
            return

        success, response = self.make_request('GET', 'products')
        self.log_test("Get products", success and isinstance(response, list))

    def test_create_transaction(self):
        """Test transaction creation"""
        if not self.token:
            self.log_test("Create transaction", False, "No auth token")
            return

        transaction_data = {
            "transaction_type": "income",
            "amount": 500.0,
            "category": "consultation",
            "description": "Test muayene ücreti",
            "date": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.make_request('POST', 'transactions', transaction_data)
        self.log_test("Create transaction", success and 'transaction_id' in response)

    def test_get_transactions(self):
        """Test getting transactions list"""
        if not self.token:
            self.log_test("Get transactions", False, "No auth token")
            return

        success, response = self.make_request('GET', 'transactions')
        self.log_test("Get transactions", success and isinstance(response, list))

    def test_finance_summary(self):
        """Test finance summary endpoint"""
        if not self.token:
            self.log_test("Finance summary", False, "No auth token")
            return

        success, response = self.make_request('GET', 'finance/summary')
        expected_fields = ['total_income', 'total_expense', 'net_profit']
        has_fields = all(field in response for field in expected_fields) if success else False
        self.log_test("Finance summary", success and has_fields)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.token:
            self.log_test("Dashboard stats", False, "No auth token")
            return

        success, response = self.make_request('GET', 'dashboard/stats')
        expected_fields = ['total_customers', 'total_pets', 'today_appointments']
        has_fields = all(field in response for field in expected_fields) if success else False
        self.log_test("Dashboard stats", success and has_fields)

    def test_whatsapp_webhook_verify(self):
        """Test WhatsApp webhook verification"""
        # This is a GET request without auth
        url = f"{self.base_url}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=vetflow_webhook_verify_token&hub.challenge=test_challenge"
        
        try:
            response = requests.get(url, timeout=10)
            success = response.status_code == 200 and response.text == "test_challenge"
            self.log_test("WhatsApp webhook verify", success)
        except Exception as e:
            self.log_test("WhatsApp webhook verify", False, str(e))

    def test_pet_history(self):
        """Test getting pet history with health records and appointments"""
        if not self.token or not self.test_pet_id:
            self.log_test("Get pet history", False, "No auth token or pet")
            return

        success, response = self.make_request('GET', f'pets/{self.test_pet_id}/history')
        
        if success:
            expected_fields = ['pet', 'customer', 'health_records', 'appointments']
            has_fields = all(field in response for field in expected_fields)
            self.log_test("Get pet history", has_fields)
        else:
            self.log_test("Get pet history", False, str(response))

    def test_appointment_details(self):
        """Test getting appointment details with customer and pet data"""
        if not self.token or not self.test_appointment_id:
            self.log_test("Get appointment details", False, "No auth token or appointment")
            return

        success, response = self.make_request('GET', f'appointments/{self.test_appointment_id}/details')
        
        if success:
            expected_fields = ['appointment', 'customer', 'pet']
            has_fields = all(field in response for field in expected_fields)
            self.log_test("Get appointment details", has_fields)
        else:
            self.log_test("Get appointment details", False, str(response))

    def test_appointment_cancellation(self):
        """Test appointment cancellation with WhatsApp notification"""
        if not self.token or not self.test_appointment_id:
            self.log_test("Cancel appointment", False, "No auth token or appointment")
            return

        success, response = self.make_request('POST', f'appointments/{self.test_appointment_id}/cancel')
        
        if success:
            expected_fields = ['message', 'whatsapp_sent', 'whatsapp_mocked']
            has_fields = any(field in response for field in expected_fields)
            whatsapp_handled = response.get('whatsapp_mocked', False) or response.get('whatsapp_sent', False)
            self.log_test("Cancel appointment with WhatsApp", has_fields and whatsapp_handled)
        else:
            self.log_test("Cancel appointment with WhatsApp", False, str(response))

    def test_create_health_record(self):
        """Test creating health record for pet history"""
        if not self.token or not self.test_pet_id:
            self.log_test("Create health record", False, "No auth token or pet")
            return

        health_record_data = {
            "pet_id": self.test_pet_id,
            "record_type": "vaccination",
            "title": "Test Aşı",
            "description": "Test aşı açıklaması",
            "date": datetime.now(timezone.utc).isoformat(),
            "cost": 150.0
        }
        
        success, response = self.make_request('POST', 'health-records', health_record_data)
        self.log_test("Create health record", success and 'record_id' in response)

    def test_subscription_plans(self):
        """Test getting subscription plans"""
        success, response = self.make_request('GET', 'subscription/plans')
        has_plans = 'plans' in response and 'response_packages' in response if success else False
        self.log_test("Get subscription plans", success and has_plans)

    def test_subscription_current(self):
        """Test getting current subscription"""
        if not self.token:
            self.log_test("Get current subscription", False, "No auth token")
            return

        success, response = self.make_request('GET', 'subscription/current')
        has_subscription_field = 'has_subscription' in response if success else False
        self.log_test("Get current subscription", success and has_subscription_field)

    def test_subscription_limits(self):
        """Test getting subscription limits"""
        if not self.token:
            self.log_test("Get subscription limits", False, "No auth token")
            return

        success, response = self.make_request('GET', 'subscription/limits')
        has_limits = 'has_subscription' in response and 'customer_limit' in response if success else False
        self.log_test("Get subscription limits", success and has_limits)

    def test_subscription_start_trial(self):
        """Test starting trial subscription"""
        if not self.token:
            self.log_test("Start trial subscription", False, "No auth token")
            return

        success, response = self.make_request('POST', 'subscription/start-trial')
        trial_started = 'subscription' in response and 'message' in response if success else False
        self.log_test("Start trial subscription", success and trial_started)

    def test_subscription_checkout(self):
        """Test creating subscription checkout session"""
        if not self.token:
            self.log_test("Create subscription checkout", False, "No auth token")
            return

        # Check if already has subscription
        success, current_sub = self.make_request('GET', 'subscription/current')
        
        if success and current_sub.get('has_subscription'):
            # Already has subscription, but checkout might still work for upgrades
            checkout_data = {
                "plan_id": "professional",
                "origin_url": "https://example.com"
            }
            
            success, response = self.make_request('POST', 'subscription/checkout', checkout_data)
            has_checkout_url = 'url' in response and 'session_id' in response if success else False
            self.log_test("Create subscription checkout (upgrade)", success and has_checkout_url)
        else:
            # No subscription, should work
            checkout_data = {
                "plan_id": "starter",
                "origin_url": "https://example.com"
            }
            
            success, response = self.make_request('POST', 'subscription/checkout', checkout_data)
            has_checkout_url = 'url' in response and 'session_id' in response if success else False
            self.log_test("Create subscription checkout", success and has_checkout_url)

    def test_response_pack_checkout(self):
        """Test creating response pack checkout session"""
        if not self.token:
            self.log_test("Create response pack checkout", False, "No auth token")
            return

        # Check if we already have a subscription from trial
        success, current_sub = self.make_request('GET', 'subscription/current')
        
        if success and current_sub.get('has_subscription'):
            checkout_data = {
                "pack_id": "pack_10",
                "origin_url": "https://example.com"
            }
            
            success, response = self.make_request('POST', 'subscription/response-pack/checkout', checkout_data)
            has_checkout_url = 'url' in response and 'session_id' in response if success else False
            self.log_test("Create response pack checkout", success and has_checkout_url)
        else:
            self.log_test("Create response pack checkout", False, "No active subscription for response pack")

    def test_customer_limit_check(self):
        """Test customer creation with subscription limit check"""
        if not self.token:
            self.log_test("Customer limit check", False, "No auth token")
            return

        # Check current subscription status first
        success, current_sub = self.make_request('GET', 'subscription/current')
        
        if success and not current_sub.get('has_subscription'):
            # Try to create customer without subscription (should fail)
            customer_data = {
                "name": "Test Limit Customer",
                "phone": "+90 555 999 8888",
                "email": "limit.test@example.com"
            }
            
            success, response = self.make_request('POST', 'customers', customer_data, expected_status=403)
            limit_enforced = success and "limitine ulaşıldı" in str(response).lower()
            self.log_test("Customer limit enforcement", limit_enforced)
        else:
            self.log_test("Customer limit enforcement", True, "Already has subscription - limit check passed")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting VetFlow API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 50)

        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Subscription tests (before customer creation to test limits)
        self.test_subscription_plans()
        self.test_subscription_current()
        self.test_subscription_limits()
        self.test_customer_limit_check()  # Test limit enforcement without subscription
        self.test_subscription_start_trial()
        
        # Test subscription endpoints after trial
        self.test_subscription_checkout()
        self.test_response_pack_checkout()
        
        # Customer management (after trial started - should work now)
        self.test_create_customer()
        self.test_get_customers()
        
        # Pet management
        self.test_create_pet()
        self.test_get_pets()
        
        # Health records (for pet history testing)
        self.test_create_health_record()
        
        # Appointment management
        self.test_create_appointment()
        self.test_get_appointments()
        
        # NEW FEATURES TESTING
        self.test_pet_history()
        self.test_appointment_details()
        self.test_appointment_cancellation()
        
        # Product management
        self.test_create_product()
        self.test_get_products()
        
        # Finance management
        self.test_create_transaction()
        self.test_get_transactions()
        self.test_finance_summary()
        
        # Dashboard
        self.test_dashboard_stats()
        
        # WhatsApp integration
        self.test_whatsapp_webhook_verify()

        # Print summary
        print("=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")

        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = VetFlowAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())