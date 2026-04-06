"""Encryption utility for storing API keys securely."""

from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

# Get or generate encryption key
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate a new key if not provided
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"⚠️  No ENCRYPTION_KEY found. Generated: {ENCRYPTION_KEY}")
    print("   Add this to your .env file to persist key encryption across restarts.")

# Ensure key is bytes
if isinstance(ENCRYPTION_KEY, str):
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode()

cipher = Fernet(ENCRYPTION_KEY)


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key for storage."""
    return cipher.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key from storage."""
    try:
        return cipher.decrypt(encrypted_key.encode()).decode()
    except Exception as e:
        raise ValueError(f"Failed to decrypt API key: {str(e)}")


def mask_api_key(api_key: str) -> str:
    """Return masked version: show only last 4 characters."""
    if len(api_key) <= 4:
        return "****"
    return f"...{api_key[-4:]}"
