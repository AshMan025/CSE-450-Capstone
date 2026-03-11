from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import os
import httpx

import models, schemas, database, dependencies, llm_router
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LLM Evaluation Service")

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")

async def extract_text_from_file(file_id: str) -> str:
    # A naive extraction for MVP. In reality you'd use fitz for PDF and pytesseract for images
    # We look for file in physical directory
    file_path = None
    for ext in [".pdf", ".jpeg", ".jpg", ".png", ".bin"]:
        p = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(p):
            file_path = p
            break
            
    if not file_path:
        raise FileNotFoundError(f"File for ID {file_id} not found on disk")
        
    try:
        if file_path.endswith(".pdf"):
            import fitz # PyMuPDF
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        elif file_path.endswith((".jpeg", ".jpg", ".png")):
            from PIL import Image
            import pytesseract
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img)
            return text
        else:
            with open(file_path, "r") as f:
                return f.read()
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from {file_path}: {e}")

async def process_evaluation_job(job_id: int, db: Session, req: schemas.EvaluationRequest):
    job = db.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
    if not job:
        return
        
    try:
        # 1. Extract text
        text_content = await extract_text_from_file(req.file_id)
        
        # 2. Call LLM Router
        model_used, parsed_result = await llm_router.evaluate_submission(
            text_content=text_content,
            marking_strategy=req.marking_strategy,
            prompt=req.prompt,
            fallback_chain=req.llm_chain
        )
        
        job.llm_model_used = model_used
        job.parsed_result = parsed_result
        job.status = "completed"
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
    finally:
        job.completed_at = datetime.utcnow()
        db.commit()

@app.post("/evaluate", response_model=schemas.EvaluationResponse)
async def start_evaluation(
    eval_req: schemas.EvaluationRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    # Create the job
    job = models.EvaluationJob(
        submission_id=eval_req.submission_id,
        assignment_id=eval_req.assignment_id,
        teacher_id=current_user["id"],
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Process mostly async via background task because LLMs take time
    background_tasks.add_task(process_evaluation_job, job.id, db, eval_req)
    
    return job

@app.get("/jobs/{job_id}", response_model=schemas.EvaluationResponse)
def get_evaluation_job(job_id: int, db: Session = Depends(database.get_db), current_user: dict = Depends(dependencies.require_teacher)):
    job = db.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.teacher_id != current_user["id"]:
         raise HTTPException(status_code=403, detail="Not authorized")
    return job

@app.get("/health")
def health_check():
    return {"status": "healthy"}
