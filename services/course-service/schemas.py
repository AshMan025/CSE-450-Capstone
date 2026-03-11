from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# ----- Course Schemas -----
class CourseBase(BaseModel):
    name: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseResponse(CourseBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ----- Enrollment Schemas -----
class EnrollmentBase(BaseModel):
    course_id: int

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(EnrollmentBase):
    id: int
    student_id: int
    status: str
    created_at: datetime
    course: Optional[CourseResponse] = None

    class Config:
        from_attributes = True
