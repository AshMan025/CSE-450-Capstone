import os
import json
import logging
from google import genai
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

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

async def evaluate_submission(text_content: str, marking_strategy: str, prompt: str, fallback_chain: list[str]) -> tuple[str, dict]:
    """
    Tries models in order from `fallback_chain`. Returns the name of the model that succeeded and the parsed JSON.
    """
    sys_prompt = SYSTEM_PROMPT_TEMPLATE.format(marking_strategy=marking_strategy, prompt=prompt)
    full_prompt = f"{sys_prompt}\n\nStudent Submission Content:\n{text_content}"

    last_error = None
    for model_name in fallback_chain:
        try:
            logger.info(f"Trying LLM evaluation with model: {model_name}")

            # Provider routing: Gemini vs Anthropic
            if model_name.startswith("claude"):
                if not ANTHROPIC_API_KEY:
                    raise ValueError("ANTHROPIC_API_KEY is not set")
                aclient = Anthropic(api_key=ANTHROPIC_API_KEY)
                msg = aclient.messages.create(
                    model=model_name,
                    max_tokens=2048,
                    temperature=0,
                    system=sys_prompt,
                    messages=[{"role": "user", "content": text_content}],
                )
                # Anthropic returns a list of content blocks; take combined text
                result = "".join([b.text for b in msg.content if getattr(b, "type", None) == "text"])
            else:
                if not GEMINI_API_KEY:
                    raise ValueError("GEMINI_API_KEY is not set")
                gclient = genai.Client(api_key=GEMINI_API_KEY)
                response = gclient.models.generate_content(
                    model=model_name,
                    contents=full_prompt
                )
                result = response.text
            
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
