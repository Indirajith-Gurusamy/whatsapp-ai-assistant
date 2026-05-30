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

    Called by Meta WhatsApp Cloud API (hub.mode) or Twilio (plain GET) to verify the webhook URL.
    """
    logger.info(f"[HIT] GET WEBHOOK - mode: {hub_mode}, token: {hub_verify_token}, challenge: {hub_challenge}")

    # Meta WhatsApp Cloud API verification
    if hub_mode == "subscribe" and hub_verify_token == settings.VERIFY_TOKEN:
        logger.info("[OK] META WEBHOOK VERIFIED - Returning challenge")
        logger.debug(f"Challenge value: {hub_challenge} (type: {type(hub_challenge)})")
        return PlainTextResponse(content=hub_challenge, status_code=200)

    # Twilio / health-check: return 200 OK so Twilio accepts the URL
    logger.info("[OK] Non-Meta GET request (Twilio/health) - returning 200")
    return PlainTextResponse(content="OK", status_code=200)


@router.post("")
@router.post("/")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook message endpoint (POST).

    Receives incoming messages from Twilio WhatsApp / Meta and processes them in the background.
    """
    try:
        logger.info("=" * 80)
        logger.info(f"[WEBHOOK] Incoming POST to /webhook from {request.client.host if request.client else 'unknown'}")

        # Log headers for debugging (Twilio sends specific headers)
        logger.debug(f"[WEBHOOK] Headers: {dict(request.headers)}")

        raw_body = await request.body()
        if raw_body:
            logger.info(f"[WEBHOOK] Body length: {len(raw_body)} bytes")
            logger.debug(f"[WEBHOOK] Raw body: {raw_body.decode('utf-8', errors='replace')}")
        else:
            logger.warning("[WEBHOOK] Empty body received")
            return JSONResponse({"status": "ok"}, status_code=200)

        # Acknowledge immediately to avoid Twilio retries
        background_tasks.add_task(WebhookService.process_webhook, raw_body)

        logger.info("[OK] Webhook queued for background processing")
        return JSONResponse({"status": "ok"}, status_code=200)

    except Exception as e:
        logger.error(f"[ERROR] Webhook error: {e}", exc_info=True)
        # Return 200 to Twilio even on error to prevent retries
        return JSONResponse({"status": "ok"}, status_code=200)
