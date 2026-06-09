"""Background job to poll Gmail inboxes for new emails."""

import asyncio

import logging



from app.core.async_lock import ensure_async_lock
from app.core.auth_activity import wait_for_auth_idle

from app.modules.email.poll_lock import acquire_email_poll_lock, release_email_poll_lock

from app.modules.email.service import (

    INGEST_EXISTING,

    INGEST_NEW,

    INGEST_SKIPPED,

    load_email_settings,

    poll_all_accounts,

)



logger = logging.getLogger(__name__)



DEFAULT_POLL_INTERVAL = 60



_poll_lock_holder: list = [None]

_job_started = False





def _log_poll_result(stats: dict) -> None:

    fetched = stats.get("fetched", 0)

    new_count = stats.get(INGEST_NEW, 0)

    existing = stats.get(INGEST_EXISTING, 0)

    skipped = stats.get(INGEST_SKIPPED, 0)



    if new_count > 0:

        logger.info(

            "Email poll complete — ingested %s new message(s) (%s unseen checked)",

            new_count,

            fetched,

        )

        return

    if fetched == 0:

        logger.debug("Email poll complete — no unseen messages")

        return

    logger.info(

        "Email poll complete — 0 new (%s unseen: %s already in CRM, %s skipped)",

        fetched,

        existing,

        skipped,

    )





async def gmail_poll_job():

    """Periodically poll configured Gmail accounts for unseen messages."""

    global _job_started

    if _job_started:

        logger.warning("Gmail poll job already running in this process — ignoring duplicate start")

        return

    _job_started = True



    try:

        # Let HTTP handlers start before the first IMAP poll

        await asyncio.sleep(15)



        while True:

            interval = DEFAULT_POLL_INTERVAL

            try:

                poll_lock = ensure_async_lock(_poll_lock_holder)
                if poll_lock.locked():

                    logger.debug("Email poll already running in this process — skipping this cycle")

                elif not acquire_email_poll_lock():

                    logger.debug("Email poll skipped — another backend instance is polling")

                else:

                    try:

                        async with poll_lock:

                            config = await load_email_settings()

                            interval = config.get("poll_interval_seconds", DEFAULT_POLL_INTERVAL)



                            if config.get("enabled"):

                                if not config.get("accounts"):

                                    logger.warning(

                                        "Email ingestion enabled but no Gmail accounts configured"

                                    )

                                elif not config.get("create_customers") and not config.get(

                                    "assign_to_leads"

                                ):

                                    logger.warning(

                                        "Email ingestion enabled but neither Customers nor Leads "

                                        "is on — unseen emails will be skipped"

                                    )

                                if await wait_for_auth_idle(max_wait_seconds=90.0):

                                    stats = await poll_all_accounts()

                                    _log_poll_result(stats)

                                else:

                                    logger.info(

                                        "Skipping email poll cycle — login/auth in progress"

                                    )

                            else:

                                logger.debug("Email polling disabled — skipping")

                    finally:

                        release_email_poll_lock()

            except asyncio.CancelledError:

                release_email_poll_lock()

                raise

            except Exception as exc:

                logger.error("Email poll job failed: %s", exc)



            await asyncio.sleep(interval)

    except asyncio.CancelledError:

        logger.info("Gmail poll job stopped")

        raise

    finally:

        _job_started = False


