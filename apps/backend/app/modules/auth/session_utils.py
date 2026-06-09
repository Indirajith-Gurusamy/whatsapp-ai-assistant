"""Session management utilities."""
import hashlib
import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import httpx
from app.core.datetime_utils import utc_now
from user_agents import parse

logger = logging.getLogger(__name__)


def hash_token(token: str) -> str:
    """
    Hash an access token for secure storage.
    
    Args:
        token: JWT access token
        
    Returns:
        SHA-256 hash of the token
    """
    return hashlib.sha256(token.encode()).hexdigest()


def parse_user_agent(user_agent: str) -> Dict[str, Optional[str]]:
    """
    Parse User-Agent string to extract device, browser, and OS information.
    
    Args:
        user_agent: User-Agent header string
        
    Returns:
        Dictionary with device_type, browser, browser_version, and os
    """
    if not user_agent:
        return {
            "device_type": None,
            "browser": None,
            "browser_version": None,
            "os": None
        }
    
    try:
        ua = parse(user_agent)
        
        # Determine device type
        if ua.is_mobile:
            device_type = "mobile"
        elif ua.is_tablet:
            device_type = "tablet"
        elif ua.is_pc:
            device_type = "desktop"
        else:
            device_type = "unknown"
        
        # Extract browser info
        browser = ua.browser.family if ua.browser.family else None
        browser_version = ua.browser.version_string if ua.browser.version_string else None
        
        # Extract OS info
        os = f"{ua.os.family} {ua.os.version_string}" if ua.os.family else None
        if os:
            os = os.strip()
        
        return {
            "device_type": device_type,
            "browser": browser,
            "browser_version": browser_version,
            "os": os
        }
    except Exception as e:
        logger.error(f"Failed to parse user agent: {e}")
        return {
            "device_type": None,
            "browser": None,
            "browser_version": None,
            "os": None
        }


async def get_location_from_ip(ip_address: str) -> Optional[str]:
    """
    Get approximate location from IP address using ip-api.com.
    
    Args:
        ip_address: IP address to lookup
        
    Returns:
        Location string in format "City, Country" or None if lookup fails
    """
    # Skip private/local IP addresses
    if not ip_address or ip_address in ["127.0.0.1", "localhost", "::1"]:
        return None
    
    # Check if it's a private IP range
    if ip_address.startswith(("10.", "172.", "192.168.", "169.254.")):
        return None
    
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(
                f"http://ip-api.com/json/{ip_address}",
                params={"fields": "status,city,country"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    city = data.get("city", "")
                    country = data.get("country", "")
                    
                    if city and country:
                        return f"{city}, {country}"
                    elif country:
                        return country
            
            return None
    except Exception as e:
        logger.warning(f"Failed to get location for IP {ip_address}: {e}")
        return None


async def cleanup_expired_sessions(db) -> int:
    """
    Remove expired sessions from the database.
    
    Args:
        db: Prisma database instance
        
    Returns:
        Number of sessions deleted
    """
    try:
        now = utc_now()
        
        # Delete sessions that have expired
        result = await db.session.delete_many(
            where={
                "OR": [
                    {"expiresAt": {"lt": now}},
                    {"lastActivity": {"lt": now - timedelta(days=2)}}
                ]
            }
        )
        
        count = result if isinstance(result, int) else 0
        if count > 0:
            logger.info(f"Cleaned up {count} expired sessions")
        
        return count
    except Exception as e:
        logger.error(f"Failed to cleanup expired sessions: {e}")
        return 0


def get_client_ip(request) -> Optional[str]:
    """
    Extract client IP address from request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Client IP address or None
    """
    # Check for X-Forwarded-For header (proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded.split(",")[0].strip()
    
    # Check for X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct client IP
    if request.client:
        return request.client.host
    
    return None
