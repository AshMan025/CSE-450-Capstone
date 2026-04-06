import os
import json
import logging
from google import genai
from anthropic import Anthropic
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

SYSTEM_PROMPT_TEMPLATE = """
You are an expert exam script evaluator. Your task is to evaluate the student's submission based on the teacher's marking strategy and default prompt.
You MUST extract the student's answers, evaluate them, and return the result strictly as a valid JSON object.

Required JSON Structure:
{{
  "student_id": "string",
  "total_score": number,
  "max_score": number,
  "breakdown": [
    {{ "question": "string", "score": number, "max": number, "feedback": "string" }}
  ],
  "overall_feedback": "string"
}}

Marking Strategy:
{marking_strategy}

Teacher's Prompt:
{prompt}
"""

def _provider_for_model(model_name: str) -> str:
    lowered = model_name.lower()
    if lowered.startswith("claude"):
        return "claude"
    if lowered.startswith("gemini"):
        return "gemini"
    if lowered.startswith("gpt") or lowered.startswith("openai"):
        return "openai"
    if lowered.startswith("mistral"):
        return "mistral"
    if lowered.startswith("command") or lowered.startswith("cohere"):
        return "cohere"
    return "unknown"


async def evaluate_submission(
    text_content: str,
    marking_strategy: str,
    prompt: str,
    fallback_chain: list[str],
    api_key: str | None = None,
    api_key_provider: str | None = None,
) -> tuple[str, dict]:
    """
    Tries models in order from `fallback_chain`. Returns the name of the model that succeeded and the parsed JSON.
    """
    sys_prompt = SYSTEM_PROMPT_TEMPLATE.format(marking_strategy=marking_strategy, prompt=prompt)
    full_prompt = f"{sys_prompt}\n\nStudent Submission Content:\n{text_content}"

    last_error = None
    for model_name in fallback_chain:
        try:
            logger.info(f"Trying LLM evaluation with model: {model_name}")

            model_provider = _provider_for_model(model_name)

            # Use per-request key only when provider matches the selected key provider.
            use_selected_key = bool(api_key and api_key_provider and model_provider == api_key_provider.lower())

            # Provider routing: Gemini vs Anthropic.
            if model_provider == "claude":
                use_key = api_key if use_selected_key else ANTHROPIC_API_KEY
                if not use_key:
                    raise ValueError("ANTHROPIC API key not available")
                aclient = Anthropic(api_key=use_key)
                msg = aclient.messages.create(
                    model=model_name,
                    max_tokens=2048,
                    temperature=0,
                    system=sys_prompt,
                    messages=[{"role": "user", "content": text_content}],
                )
                # Anthropic returns a list of content blocks; take combined text
                result = "".join([b.text for b in msg.content if getattr(b, "type", None) == "text"])
            elif model_provider == "gemini":
                use_key = api_key if use_selected_key else GEMINI_API_KEY
                if not use_key:
                    raise ValueError("Gemini API key not available")
                gclient = genai.Client(api_key=use_key)
                response = gclient.models.generate_content(
                    model=model_name,
                    contents=full_prompt
                )
                result = response.text
            elif model_provider == "openai":
                use_key = api_key if use_selected_key else OPENAI_API_KEY
                if not use_key:
                    raise ValueError("OpenAI API key not available")
                oclient = OpenAI(api_key=use_key)
                response = oclient.chat.completions.create(
                    model=model_name,
                    temperature=0,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": text_content},
                    ],
                )
                result = (response.choices[0].message.content or "").strip()
                if not result:
                    raise ValueError("OpenAI response was empty")
            else:
                raise ValueError(f"Unsupported model/provider for evaluation: {model_name}")
            
            # Clean possible markdown formatting
            cleaned_result = result.strip()
            if "```json" in cleaned_result:
                cleaned_result = cleaned_result.split("```json")[1].split("```")[0]
            elif "```" in cleaned_result:
                cleaned_result = cleaned_result.split("```")[1].split("```")[0]
                
            parsed_json = json.loads(cleaned_result.strip())
            return model_name, parsed_json
            
        except Exception as e:
            logger.error(f"Model {model_name} failed: {e}")
            last_error = e
            continue
            
    raise RuntimeError(f"All models in fallback chain failed. Last error: {last_error}")
