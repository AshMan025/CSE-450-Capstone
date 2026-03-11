from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, index=True)
    title = Column(String)
    description = Column(String)
    deadline = Column(DateTime(timezone=True))
    marking_strategy = Column(String)
    default_prompt = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("Submission", back_populates="assignment")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    student_id = Column(Integer, index=True)
    file_id = Column(String) # UUID from file-service
    status = Column(String, default="submitted") # submitted, evaluated
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("Assignment", back_populates="submissions")
