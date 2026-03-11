from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from database import Base

class Mark(Base):
    """
    Stores the final published result.
    evaluation_job_id maps to the LLM service job that generated the base marks.
    If the teacher overrides a score, we save it here.
    """
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, index=True)
    submission_id = Column(Integer, index=True, unique=True) # One final mark per submission
    student_id = Column(Integer, index=True)
    
    # Snapshot of the LLM parsed result
    base_result = Column(JSON)
    
    # Teacher modifications to the JSON structure
    teacher_override = Column(JSON, nullable=True)
    
    final_score = Column(Integer)
    is_published = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
