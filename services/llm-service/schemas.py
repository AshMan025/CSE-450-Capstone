from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict

class EvaluationRequest(BaseModel):
    submission_id: int
    assignment_id: int
    file_id: str # To read the file from shared volume
    marking_strategy: str
    prompt: str
    teacher_id: int
    llm_chain: list[str] = ["gemini-1.5-flash", "gemini-1.5-pro"] # fallback sequence

class EvaluationResponse(BaseModel):
    id: int
    submission_id: int
    status: str
    llm_model_used: Optional[str]
    parsed_result: Optional[Dict]
    error_message: Optional[str]

    class Config:
        from_attributes = True
