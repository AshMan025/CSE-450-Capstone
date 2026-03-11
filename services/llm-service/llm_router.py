import os
import json
import logging
import google.generativeai as genai
# import anthropic
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
# ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "PLACEHOLDER_GEMINI_KEY":
    genai.configure(api_key=GEMINI_API_KEY)

# if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "PLACEHOLDER_ANTHROPIC_KEY":
#     anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT_TEMPLATE = """
You are an expert exam script evaluator. Your task is to evaluate the student's submission based on the teacher's marking strategy and default prompt.
You MUST extract the student's answers, evaluate them, and return the result strictly as a valid JSON object. Do NOT wrap the JSON in markdown blocks like ```json ... ```.

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
            if "gemini" in model_name:
                result = await _call_gemini(model_name, full_prompt)
            # elif "claude" in model_name:
            #     result = await _call_claude(model_name, sys_prompt, text_content)
            else:
                raise ValueError(f"Unknown model prefix in {model_name}")
            
            # Clean possible markdown formatting
            cleaned_result = result.strip()
            if cleaned_result.startswith("```json"):
                cleaned_result = cleaned_result[7:]
            if cleaned_result.endswith("```"):
                cleaned_result = cleaned_result[:-3]
                
            parsed_json = json.loads(cleaned_result.strip())
            return model_name, parsed_json
            
        except Exception as e:
            logger.error(f"Model {model_name} failed: {e}")
            last_error = e
            continue
            
    raise RuntimeError(f"All models in fallback chain failed. Last error: {last_error}")


async def _call_gemini(model_name: str, full_prompt: str) -> str:
    # Uses the newer async Google SDK or equivalent, for MVP making synchronous call in async func wrapper is acceptable.
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(full_prompt)
    return response.text

# async def _call_claude(model_name: str, sys_prompt: str, user_content: str) -> str:
#     response = anthropic_client.messages.create(
#         model=model_name,
#         max_tokens=2000,
#         system=sys_prompt,
#         messages=[{"role": "user", "content": f"Student Submission Content:\n{user_content}"}]
#     )
#     return response.content[0].text
