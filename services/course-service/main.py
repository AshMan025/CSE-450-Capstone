from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas, database, dependencies
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Course Service")

@app.post("/", response_model=schemas.CourseResponse)
def create_course(
    course: schemas.CourseCreate, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    new_course = models.Course(
        name=course.name,
        description=course.description,
        teacher_id=current_user["id"]
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@app.get("/", response_model=List[schemas.CourseResponse])
def list_courses(db: Session = Depends(database.get_db), current_user: dict = Depends(dependencies.get_current_user)):
    # If teacher, return their courses. If student, return all courses.
    if current_user["role"] == "teacher":
        return db.query(models.Course).filter(models.Course.teacher_id == current_user["id"]).all()
    else:
        return db.query(models.Course).all()

@app.get("/{course_id}", response_model=schemas.CourseResponse)
def get_course(course_id: int, db: Session = Depends(database.get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@app.post("/{course_id}/enroll", response_model=schemas.EnrollmentResponse)
def enroll_course(
    course_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_student)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Check if already enrolled
    existing_enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id,
        models.Enrollment.student_id == current_user["id"]
    ).first()
    
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Already enrolled or pending")

    new_enrollment = models.Enrollment(
        course_id=course_id,
        student_id=current_user["id"],
        status="pending"
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    return new_enrollment

@app.get("/{course_id}/enrollments", response_model=List[schemas.EnrollmentResponse])
def get_enrollments(
    course_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course or course.teacher_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return db.query(models.Enrollment).filter(models.Enrollment.course_id == course_id).all()

@app.put("/enrollments/{enrollment_id}/status", response_model=schemas.EnrollmentResponse)
def update_enrollment_status(
    enrollment_id: int,
    status: str, # 'approved' or 'rejected'
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    enrollment = db.query(models.Enrollment).filter(models.Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
        
    course = db.query(models.Course).filter(models.Course.id == enrollment.course_id).first()
    if not course or course.teacher_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    enrollment.status = status
    db.commit()
    db.refresh(enrollment)
    return enrollment

@app.get("/health")
def health_check():
    return {"status": "healthy"}
