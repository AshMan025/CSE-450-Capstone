from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict

class MarkCreate(BaseModel):
    assignment_id: int
    submission_id: int
    student_id: int
    base_result: Dict
    final_score: int

class MarkUpdate(BaseModel):
    teacher_override: Dict
    final_score: int

class MarkPublish(BaseModel):
    is_published: bool

class MarkResponse(BaseModel):
    id: int
    assignment_id: int
    submission_id: int
    student_id: int
    base_result: Dict
    teacher_override: Optional[Dict]
    final_score: int
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
