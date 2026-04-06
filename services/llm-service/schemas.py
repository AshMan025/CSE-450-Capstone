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
    student_id: int
    llm_chain: list[str] = ["gemini-2.5-flash", "gemini-1.5-flash"] # fallback sequence

class EvaluationResponse(BaseModel):
    id: int
    submission_id: int
    status: str
    llm_model_used: Optional[str]
    parsed_result: Optional[Dict]
    error_message: Optional[str]

    class Config:
        from_attributes = True


# ----- API Key Schemas -----
class APIKeyCreate(BaseModel):
    provider: str  # e.g., 'openai', 'gemini', 'claude', 'mistral', 'cohere'
    model_name: str  # e.g., 'gpt-4', 'gemini-1.5-pro'
    api_key: str  # plain text key from frontend

class APIKeyUpdate(BaseModel):
    api_key: str
    model_name: Optional[str] = None

class APIKeyResponse(BaseModel):
    id: int
    provider: str
    model_name: str
    # Return masked key (last 4 chars only)
    masked_key: str
    is_valid: str  # untested, valid, invalid, quota_exceeded
    last_tested_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class APIKeyTestRequest(BaseModel):
    provider: str
    model_name: str
    api_key: str

class APIKeyTestResponse(BaseModel):
    is_valid: bool
    status: str  # valid, invalid, quota_exceeded, network_error
    error_message: Optional[str]
    message: str
