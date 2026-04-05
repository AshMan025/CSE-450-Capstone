from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# ----- Assignment Schemas -----
class AssignmentBase(BaseModel):
    course_id: int
    title: str
    description: str
    deadline: datetime
    marking_strategy: str
    default_prompt: str

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentResponse(AssignmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----- Submission Schemas -----
class SubmissionBase(BaseModel):
    assignment_id: int
    file_id: str

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionResponse(SubmissionBase):
    id: int
    student_id: int
    # Optional human-readable student name (enriched by calling auth-service)
    student_name: Optional[str] = None
    status: str
    submitted_at: datetime

    class Config:
        from_attributes = True
