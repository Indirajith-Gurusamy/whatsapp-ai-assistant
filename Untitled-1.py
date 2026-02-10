#!/usr/bin/env python3
"""
WhatsApp Business Phone Number Registration Script

This script registers a WhatsApp Business phone number with two-step verification.
Make sure your phone number is in UNVERIFIED status before running this script.
"""

import requests
import json
import sys

# ============================================================================
# CONFIGURATION - FILL IN YOUR DETAILS HERE
# ============================================================================

# Your WhatsApp Business Phone Number ID (from WhatsApp Manager)
PHONE_NUMBER_ID = "940369172496878"

# Your Meta/Facebook Access Token
ACCESS_TOKEN = "EAA6ZBEPe3ePIBQoTbMtLlcDOI0bZCgZAuJLbR3CB6FzqMm5Tf90xuqLuHWqnwmyOJWXGiZBsbZAZCZCFXUM1QroZBN4EvTbsMuo0bpXVsrZC8ZBqHtSd6p7ZB7NielXgUZC3CNX0QV7fv8oerJq5zLupG4yG0QVgHcFPmpiqzfzt36dvS3EFLLJOZBVQMUF9bGNzqLlKcBkSc6xE5duN0TnoxgZCDAuOhUDqZCxzUsSkPP0CfAKGkEVUaBCoOJQmX6gm03JZAeE835X5gojGwsVEGJ5xsxknumzg"

# Your 6-digit PIN for two-step verification (KEEP THIS SECURE!)
PIN = "450885"

# Graph API Version
API_VERSION = "v21.0"

# ============================================================================
# DO NOT MODIFY BELOW THIS LINE
# ============================================================================

def register_whatsapp_number():
    """
    Register a WhatsApp Business phone number with two-step verification.
    
    Returns:
        dict: Response from the API
    """
    # Construct the API endpoint
    url = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/register"
    
    # Set up headers
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Request payload
    payload = {
        "messaging_product": "whatsapp",
        "pin": PIN
    }
    
    print("=" * 70)
    print("WhatsApp Business Phone Number Registration")
    print("=" * 70)
    print(f"\nEndpoint: {url}")
    print(f"Phone Number ID: {PHONE_NUMBER_ID}")
    print(f"API Version: {API_VERSION}")
    print("\nSending registration request...\n")
    
    try:
        # Make the POST request
        response = requests.post(url, headers=headers, json=payload)
        
        # Parse the response
        response_data = response.json()
        
        # Check if successful
        if response.status_code == 200:
            print("✓ SUCCESS!")
            print("=" * 70)
            print(json.dumps(response_data, indent=2))
            print("=" * 70)
            print("\nYour WhatsApp Business phone number has been registered!")
            print(f"Two-step verification PIN: {PIN}")
            print("\n⚠️  IMPORTANT: Store your PIN securely. You'll need it for account recovery.")
            return response_data
        else:
            print("✗ ERROR!")
            print("=" * 70)
            print(f"Status Code: {response.status_code}")
            print(json.dumps(response_data, indent=2))
            print("=" * 70)
            
            # Provide helpful error messages
            if response.status_code == 400:
                print("\n❌ Bad Request - Check your PIN format (must be exactly 6 digits)")
            elif response.status_code == 401:
                print("\n❌ Unauthorized - Your access token is invalid or expired")
            elif response.status_code == 403:
                print("\n❌ Forbidden - Your app doesn't have permission to register this number")
            elif response.status_code == 404:
                print("\n❌ Not Found - Phone number ID doesn't exist or isn't accessible")
            elif response.status_code == 422:
                print("\n❌ Unprocessable - Phone number may already be registered or in wrong state")
            elif response.status_code == 429:
                print("\n❌ Rate Limit Exceeded - Wait before trying again")
            elif response.status_code == 500:
                print("\n❌ Server Error - Retry your request")
            
            return response_data
            
    except requests.exceptions.RequestException as e:
        print(f"✗ CONNECTION ERROR!")
        print("=" * 70)
        print(f"Error: {str(e)}")
        print("=" * 70)
        print("\nPlease check your internet connection and try again.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"✗ JSON PARSING ERROR!")
        print("=" * 70)
        print(f"Error: {str(e)}")
        print("Response text:", response.text)
        print("=" * 70)
        sys.exit(1)


def validate_configuration():
    """Validate that configuration has been filled in."""
    errors = []
    
    if PHONE_NUMBER_ID == "YOUR_PHONE_NUMBER_ID_HERE":
        errors.append("❌ PHONE_NUMBER_ID not configured")
    
    if ACCESS_TOKEN == "YOUR_ACCESS_TOKEN_HERE":
        errors.append("❌ ACCESS_TOKEN not configured")
    
    if PIN == "123456" or len(PIN) != 6 or not PIN.isdigit():
        errors.append("❌ PIN must be exactly 6 digits (current: '{}')".format(PIN))
    
    if errors:
        print("Configuration Errors:")
        print("=" * 70)
        for error in errors:
            print(error)
        print("=" * 70)
        print("\nPlease edit the script and fill in your configuration details at the top.")
        sys.exit(1)


if __name__ == "__main__":
    # Validate configuration before proceeding
    validate_configuration()
    
    # Register the phone number
    register_whatsapp_number()