"""Webhook API router."""
from fastapi import APIRouter, Request, Query, BackgroundTasks
from fastapi.responses import PlainTextResponse, JSONResponse
from typing import Optional
from app.modules.webhooks.service import WebhookService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhooks"])


@router.get("", response_class=PlainTextResponse)
@router.get("/", response_class=PlainTextResponse)
async def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token")
):
    """
    Webhook verification endpoint (GET).
    
    Called by WhatsApp to verify the webhook URL.
    """
    logger.info(f"[HIT] GET WEBHOOK - mode: {hub_mode}, token: {hub_verify_token}, challenge: {hub_challenge}")
    if hub_mode == "subscribe" and hub_verify_token == settings.VERIFY_TOKEN:
        logger.info("[OK] WEBHOOK VERIFIED - Returning challenge")
        logger.debug(f"Challenge value: {hub_challenge} (type: {type(hub_challenge)})")
        return PlainTextResponse(content=hub_challenge, status_code=200)
    else:
        logger.warning(f"[ERROR] WEBHOOK VERIFICATION FAILED - mode: {hub_mode}, token_match: {hub_verify_token == settings.VERIFY_TOKEN}")
        return PlainTextResponse(content="", status_code=403)


@router.post("")
@router.post("/")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook message endpoint (POST).
    
    Receives incoming messages from Twilio WhatsApp and processes them in the background.
    """
    try:
        logger.info("=" * 80)
        logger.info("[WEBHOOK] Incoming Twilio webhook")
        
        raw_body = await request.body()
        
        if not raw_body:
            logger.warning("Empty webhook body received")
            return JSONResponse({"status": "ok"}, status_code=200)
        
        # Acknowledge immediately to avoid Twilio retries
        background_tasks.add_task(WebhookService.process_webhook, raw_body)
        
        logger.info("[OK] Webhook queued for processing")
        return JSONResponse({"status": "ok"}, status_code=200)
        
    except Exception as e:
        # Return 200 to Twilio even on error to prevent retries
        logger.error(f"[ERROR] Webhook error: {e}", exc_info=True)
        return JSONResponse({"status": "ok"}, status_code=200)
