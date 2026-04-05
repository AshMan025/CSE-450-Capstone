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
    # Optional enrollment info for the current user (student)
    enrollment_status: Optional[str] = None
    enrollment_id: Optional[int] = None

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
    # Optional human-readable student name provided by auth-service
    student_name: Optional[str] = None
    status: str
    created_at: datetime
    course: Optional[CourseResponse] = None
    # If a rejected enrollment was re-applied and updated to pending, backend may set this flag
    reapplied: Optional[bool] = None

    class Config:
        from_attributes = True
