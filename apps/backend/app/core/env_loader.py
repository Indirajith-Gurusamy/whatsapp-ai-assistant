"""Load backend environment from apps/env/{APP_ENV}.env or hosting dashboard vars."""
import os
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[4]
ENV_DIR = REPO_ROOT / "apps" / "env"


def load_env(app_env: Optional[str] = None) -> Path:
    """
    Load environment variables for the given profile.

    APP_ENV=local      -> apps/env/local.env      (default)
    APP_ENV=production -> apps/env/production.env

    On Render/hosting, env vars are injected directly — the .env file is optional
    as long as DATABASE_URL (and other secrets) are set in the dashboard.
    """
    from dotenv import load_dotenv

    env_name = app_env or os.getenv("APP_ENV", "local")
    env_path = ENV_DIR / f"{env_name}.env"

    load_dotenv(REPO_ROOT / ".env", override=False)

    if env_path.exists():
        load_dotenv(env_path, override=True)
    elif not os.getenv("DATABASE_URL"):
        raise FileNotFoundError(
            f"Environment file not found: {env_path}\n"
            f"Copy apps/env/{env_name}.env.example to apps/env/{env_name}.env, "
            f"or set env vars (at least DATABASE_URL) in your hosting dashboard."
        )

    os.environ["APP_ENV"] = env_name
    return env_path
