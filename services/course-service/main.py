from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import httpx
import os

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
    # If teacher, return their courses. If student, return all courses enriched with enrollment status for current student.
    if current_user["role"] == "teacher":
        return db.query(models.Course).filter(models.Course.teacher_id == current_user["id"]).all()

    # Student: include enrollment status (if any) for each course
    courses = db.query(models.Course).all()
    result = []
    for c in courses:
        enrollment = db.query(models.Enrollment).filter(
            models.Enrollment.course_id == c.id,
            models.Enrollment.student_id == current_user["id"]
        ).first()

        item = {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "teacher_id": c.teacher_id,
            "created_at": c.created_at,
            "enrollment_status": enrollment.status if enrollment else None,
            "enrollment_id": enrollment.id if enrollment else None,
        }
        result.append(item)

    return result

@app.get("/{course_id}", response_model=schemas.CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.get_current_user),
):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Teachers can access their own courses
    if current_user["role"] == "teacher":
        if course.teacher_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        return course

    # Students must be approved/enrolled to access course details
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id,
        models.Enrollment.student_id == current_user["id"],
        models.Enrollment.status == "approved",
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled")

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

    # If there is an existing enrollment and it was rejected, allow re-apply by setting status to pending
    if existing_enrollment:
        if existing_enrollment.status == "rejected":
            existing_enrollment.status = "pending"
            db.commit()
            db.refresh(existing_enrollment)
            # mark reapplied flag on returned payload
            return {**existing_enrollment.__dict__, "reapplied": True}
        # otherwise disallow duplicate requests
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
    
    AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth-service:8001")
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.course_id == course_id).all()

    # Exclude rejected enrollments from teacher-visible list as requested
    visible = [e for e in enrollments if e.status != "rejected"]

    enriched = []
    async def _fetch_names():
        async with httpx.AsyncClient() as client:
            for e in visible:
                student_name = None
                try:
                    resp = await client.get(f"{AUTH_SERVICE_URL}/users/{e.student_id}")
                    if resp.status_code == 200:
                        student_name = resp.json().get("name")
                except Exception:
                    student_name = None

                enriched.append({
                    "id": e.id,
                    "course_id": e.course_id,
                    "student_id": e.student_id,
                    "student_name": student_name,
                    "status": e.status,
                    "created_at": e.created_at,
                })

    import anyio
    anyio.run(_fetch_names)
    return enriched

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
