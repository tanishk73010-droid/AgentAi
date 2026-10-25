import json
import logging
from typing import Dict, Any, Type, Optional
from pydantic import BaseModel
import httpx

from app.config import settings

logger = logging.getLogger("shadowbuilder.llm")


class LLMService:
    """Multi-provider LLM caller supporting Gemini, OpenAI, and labeled Fixture mode."""

    def __init__(self):
        self.provider = settings.llm_provider.lower()
        self.api_key = settings.llm_api_key
        self.model = settings.llm_model

    def is_fixture_mode(self, force_fixture: bool = False) -> bool:
        return force_fixture or self.provider == "fixture" or not (self.api_key and self.api_key.strip())

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[BaseModel],
        fixture_fallback_data: Optional[Dict[str, Any]] = None,
        force_fixture: bool = False,
    ) -> BaseModel:
        """Generates a validated structured Pydantic response from LLM or deterministic fixture."""
        if self.is_fixture_mode(force_fixture):
            logger.info("Using labeled FIXTURE mode for LLM generation.")
            if fixture_fallback_data:
                return response_model.model_validate(fixture_fallback_data)
            raise ValueError("No fixture fallback data provided for fixture mode.")

        # Real LLM call
        try:
            if self.provider == "gemini":
                raw_json = await self._call_gemini(system_prompt, user_prompt, response_model)
            elif self.provider == "openai":
                raw_json = await self._call_openai(system_prompt, user_prompt, response_model)
            else:
                logger.warning(f"Unknown provider '{self.provider}', falling back to fixture data.")
                if fixture_fallback_data:
                    return response_model.model_validate(fixture_fallback_data)
                raise ValueError(f"Unsupported LLM provider: {self.provider}")

            parsed_data = json.loads(raw_json)
            return response_model.model_validate(parsed_data)

        except Exception as e:
            logger.error(f"LLM call to {self.provider} failed: {str(e)}")
            # If real call fails and fixture data is available, do not fake success: raise error with truthful details
            raise RuntimeError(f"LLM Generation failed ({self.provider}): {str(e)}")

    async def _call_gemini(self, system_prompt: str, user_prompt: str, response_model: Type[BaseModel]) -> str:
        # Schema definition for Gemini response_schema
        schema = response_model.model_json_schema()

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "system_instruction": {
                "parts": [{"text": system_prompt + "\nYou MUST return valid JSON matching the requested schema."}]
            },
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API error ({resp.status_code}): {resp.text}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("No generation candidates returned from Gemini.")

            content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return content_text.strip()

    async def _call_openai(self, system_prompt: str, user_prompt: str, response_model: Type[BaseModel]) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt + "\nReturn ONLY valid JSON."},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI API error ({resp.status_code}): {resp.text}")

            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("No generation choices returned from OpenAI.")

            return choices[0]["message"]["content"].strip()


llm_service = LLMService()
