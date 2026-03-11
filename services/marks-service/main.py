from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas, database, dependencies
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Marks Service")

@app.get("/", response_model=List[schemas.MarkResponse])
def get_my_marks(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.get_current_user)
):
    """Returns marks relevant to the current user (student sees own published marks, teacher sees all)."""
    query = db.query(models.Mark)
    if current_user["role"] == "student":
        query = query.filter(
            models.Mark.student_id == current_user["id"],
            models.Mark.is_published == True
        )
    return query.all()

@app.post("/", response_model=schemas.MarkResponse)
def create_initial_mark(
    mark: schemas.MarkCreate,
    db: Session = Depends(database.get_db),
):
    existing = db.query(models.Mark).filter(models.Mark.submission_id == mark.submission_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mark already exists for this submission")

    new_mark = models.Mark(
        assignment_id=mark.assignment_id,
        submission_id=mark.submission_id,
        student_id=mark.student_id,
        base_result=mark.base_result,
        final_score=mark.final_score
    )
    db.add(new_mark)
    db.commit()
    db.refresh(new_mark)
    return new_mark

@app.get("/assignment/{assignment_id}", response_model=List[schemas.MarkResponse])
def get_assignment_marks(
    assignment_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: dict = Depends(dependencies.require_teacher)
):
    # Retrieve all marks for a given assignment
    return db.query(models.Mark).filter(models.Mark.assignment_id == assignment_id).all()

@app.get("/student/{student_id}", response_model=List[schemas.MarkResponse])
def get_student_marks(
    student_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: dict = Depends(dependencies.get_current_user)
):
    if current_user["role"] == "student" and current_user["id"] != student_id:
        raise HTTPException(status_code=403, detail="Not authorized to view other student's marks")
        
    query = db.query(models.Mark).filter(models.Mark.student_id == student_id)
    if current_user["role"] == "student":
        # Only show published marks to students
        query = query.filter(models.Mark.is_published == True)
        
    return query.all()

@app.put("/{mark_id}/override", response_model=schemas.MarkResponse)
def override_mark(
    mark_id: int, 
    update: schemas.MarkUpdate, 
    db: Session = Depends(database.get_db), 
    current_user: dict = Depends(dependencies.require_teacher)
):
    mark = db.query(models.Mark).filter(models.Mark.id == mark_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
        
    mark.teacher_override = update.teacher_override
    mark.final_score = update.final_score
    db.commit()
    db.refresh(mark)
    return mark

@app.put("/{mark_id}/publish", response_model=schemas.MarkResponse)
def publish_mark(
    mark_id: int, 
    publish: schemas.MarkPublish, 
    db: Session = Depends(database.get_db), 
    current_user: dict = Depends(dependencies.require_teacher)
):
    mark = db.query(models.Mark).filter(models.Mark.id == mark_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
        
    mark.is_published = publish.is_published
    db.commit()
    db.refresh(mark)
    return mark

@app.get("/health")
def health_check():
    return {"status": "healthy"}
