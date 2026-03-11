from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    teacher_id = Column(Integer, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    enrollments = relationship("Enrollment", back_populates="course")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    student_id = Column(Integer, index=True)
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="enrollments")
