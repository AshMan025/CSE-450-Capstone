from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import os

import models, schemas, database, dependencies
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Assignment Service")

@app.post("/", response_model=schemas.AssignmentResponse)
async def create_assignment(
    assignment: schemas.AssignmentCreate, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    # Verify the course exists and belongs to the teacher
    try:
        course_data = await dependencies.verify_course_teacher(assignment.course_id, current_user["token"])
        if course_data["teacher_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to create assignment for this course")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not verify course")

    new_assignment = models.Assignment(
        course_id=assignment.course_id,
        title=assignment.title,
        description=assignment.description,
        deadline=assignment.deadline,
        marking_strategy=assignment.marking_strategy,
        default_prompt=assignment.default_prompt
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@app.get("/{assignment_id}", response_model=schemas.AssignmentResponse)
def get_assignment(assignment_id: int, db: Session = Depends(database.get_db), current_user: dict = Depends(dependencies.get_current_user)):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@app.get("/course/{course_id}", response_model=List[schemas.AssignmentResponse])
def get_course_assignments(course_id: int, db: Session = Depends(database.get_db), current_user: dict = Depends(dependencies.get_current_user)):
    # Enforce access:
    # - teacher can view their own course assignments
    # - student can view only if approved enrollment exists
    # Course service enforces this on GET /{course_id}, so we proxy-check it here.
    import anyio
    anyio.run(dependencies.verify_course_access, course_id, current_user["token"])
    assignments = db.query(models.Assignment).filter(models.Assignment.course_id == course_id).all()
    return assignments

@app.post("/{assignment_id}/submit", response_model=schemas.SubmissionResponse)
def submit_assignment(
    assignment_id: int,
    submission: schemas.SubmissionCreate,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_student)
):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    # Check deadline (simple check, timezone aware)
    from datetime import datetime, timezone
    if datetime.now(timezone.utc) > assignment.deadline:
        raise HTTPException(status_code=400, detail="Deadline passed")

    # Check if existing submission
    existing = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == current_user["id"]
    ).first()
    
    if existing:
        # replace file_id
        existing.file_id = submission.file_id
        existing.status = "submitted" # Reset status on resubmission
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_submission = models.Submission(
            assignment_id=assignment_id,
            student_id=current_user["id"],
            file_id=submission.file_id,
            status="submitted"
        )
        db.add(new_submission)
        db.commit()
        db.refresh(new_submission)
        return new_submission

@app.get("/{assignment_id}/my-submission", response_model=Optional[schemas.SubmissionResponse])
def get_my_submission(
    assignment_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_student)
):
    return db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == current_user["id"]
    ).first()

@app.get("/{assignment_id}/submissions", response_model=List[schemas.SubmissionResponse])
async def get_assignment_submissions(
    assignment_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    """Return submissions for an assignment, enriched with student names from auth-service when available."""
    AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth-service:8001")

    submissions = db.query(models.Submission).filter(models.Submission.assignment_id == assignment_id).all()

    enriched = []
    async with httpx.AsyncClient() as client:
        for s in submissions:
            student_name = None
            try:
                resp = await client.get(f"{AUTH_SERVICE_URL}/users/{s.student_id}")
                if resp.status_code == 200:
                    student_name = resp.json().get("name")
            except Exception:
                student_name = None

            enriched.append({
                "id": s.id,
                "assignment_id": s.assignment_id,
                "student_id": s.student_id,
                "student_name": student_name,
                "file_id": s.file_id,
                "status": s.status,
                "submitted_at": s.submitted_at,
            })

    return enriched

@app.put("/submissions/{submission_id}/status")
def update_submission_status(
    submission_id: int,
    status: str,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    submission.status = status
    db.commit()
    return {"message": "Status updated"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
