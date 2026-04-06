from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from database import Base

class EvaluationJob(Base):
    __tablename__ = "evaluation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, index=True)
    assignment_id = Column(Integer, index=True)
    teacher_id = Column(Integer, index=True)
    
    # Store LLM used and its raw output for auditing
    llm_model_used = Column(String)
    raw_response = Column(String)
    
    # Store parsed JSON block for marks service
    parsed_result = Column(JSON)
    status = Column(String, default="pending") # pending, completed, failed
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, index=True)
    provider = Column(String, index=True)
    model_name = Column(String, index=True)
    encrypted_key = Column(String)
    is_valid = Column(String, default="untested")
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
