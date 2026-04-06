"""Test API keys with their respective LLM providers."""

import httpx
import os


async def test_openai_key(api_key: str, model_name: str) -> tuple[bool, str, str]:
    """Test OpenAI API key. Returns (is_valid, status, message)."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if response.status_code == 200:
                models = response.json().get("data", [])
                available = any(m["id"] == model_name for m in models)
                if available:
                    return True, "valid", f"✓ API key valid. Model '{model_name}' available."
                else:
                    return False, "invalid", f"✗ API key valid but model '{model_name}' not available."
            elif response.status_code == 401:
                return False, "invalid", "✗ Invalid API key."
            elif response.status_code == 429:
                return False, "quota_exceeded", "✗ Rate limit or quota exceeded."
            else:
                return False, "invalid", f"✗ Error: {response.status_code} {response.text[:100]}"
    except httpx.TimeoutException:
        return False, "network_error", "✗ Connection timeout."
    except Exception as e:
        return False, "network_error", f"✗ Network error: {str(e)[:100]}"


async def test_gemini_key(api_key: str, model_name: str) -> tuple[bool, str, str]:
    """Test Google Gemini API key."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}",
                params={"key": api_key},
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "valid", f"✓ API key valid. Model '{model_name}' available."
            elif response.status_code == 401:
                return False, "invalid", "✗ Invalid API key."
            elif response.status_code == 403:
                return False, "quota_exceeded", "✗ Quota exceeded or access denied."
            else:
                return False, "invalid", f"✗ Error: {response.status_code}"
    except httpx.TimeoutException:
        return False, "network_error", "✗ Connection timeout."
    except Exception as e:
        return False, "network_error", f"✗ Network error: {str(e)[:100]}"


async def test_claude_key(api_key: str, model_name: str) -> tuple[bool, str, str]:
    """Test Anthropic Claude API key."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": model_name,
                    "max_tokens": 100,
                    "messages": [{"role": "user", "content": "test"}]
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "valid", f"✓ API key valid. Model '{model_name}' available."
            elif response.status_code == 401:
                return False, "invalid", "✗ Invalid API key."
            elif response.status_code == 429:
                return False, "quota_exceeded", "✗ Rate limit or quota exceeded."
            else:
                return False, "invalid", f"✗ Error: {response.status_code}"
    except httpx.TimeoutException:
        return False, "network_error", "✗ Connection timeout."
    except Exception as e:
        return False, "network_error", f"✗ Network error: {str(e)[:100]}"


async def test_mistral_key(api_key: str, model_name: str) -> tuple[bool, str, str]:
    """Test Mistral API key."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 10
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "valid", f"✓ API key valid. Model '{model_name}' available."
            elif response.status_code == 401:
                return False, "invalid", "✗ Invalid API key."
            elif response.status_code == 429:
                return False, "quota_exceeded", "✗ Rate limit or quota exceeded."
            else:
                return False, "invalid", f"✗ Error: {response.status_code}"
    except httpx.TimeoutException:
        return False, "network_error", "✗ Connection timeout."
    except Exception as e:
        return False, "network_error", f"✗ Network error: {str(e)[:100]}"


async def test_cohere_key(api_key: str, model_name: str) -> tuple[bool, str, str]:
    """Test Cohere API key."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.cohere.ai/v1/generate",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model_name, "prompt": "test", "max_tokens": 10},
                timeout=10.0
            )
            if response.status_code == 200:
                return True, "valid", f"✓ API key valid. Model '{model_name}' available."
            elif response.status_code == 401:
                return False, "invalid", "✗ Invalid API key."
            elif response.status_code == 429:
                return False, "quota_exceeded", "✗ Rate limit or quota exceeded."
            else:
                return False, "invalid", f"✗ Error: {response.status_code}"
    except httpx.TimeoutException:
        return False, "network_error", "✗ Connection timeout."
    except Exception as e:
        return False, "network_error", f"✗ Network error: {str(e)[:100]}"


async def test_api_key(provider: str, model_name: str, api_key: str) -> tuple[bool, str, str]:
    """Route to appropriate provider test. Returns (is_valid, status, message)."""
    provider = provider.lower()
    
    if provider == "openai":
        return await test_openai_key(api_key, model_name)
    elif provider == "gemini":
        return await test_gemini_key(api_key, model_name)
    elif provider == "claude":
        return await test_claude_key(api_key, model_name)
    elif provider == "mistral":
        return await test_mistral_key(api_key, model_name)
    elif provider == "cohere":
        return await test_cohere_key(api_key, model_name)
    else:
        return False, "invalid", f"✗ Provider '{provider}' not supported."
