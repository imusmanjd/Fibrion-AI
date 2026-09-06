"""
backend/tests/conftest.py

core/config.py validates required env vars (OPENROUTER_API_KEY,
TELEGRAM_BOT_TOKEN) the moment it's imported. Since almost every
module in this codebase imports something that eventually imports
core.config, these dummy values must be set before pytest collects
any test module - not inside a fixture, which would run too late.
"""

import os

os.environ.setdefault("OPENROUTER_API_KEY", "test-key-not-real")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test-token-not-real")