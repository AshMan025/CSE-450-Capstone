from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import os
import httpx
import json
import logging

import models, schemas, database, dependencies, llm_router
from database import engine
from encryption import encrypt_api_key, decrypt_api_key, mask_api_key
from test_keys import test_api_key
from typing import List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

async def process_evaluation_job(job_id: int, req: schemas.EvaluationRequest):
    # Background tasks must NOT use request-scoped DB sessions.
    db = database.SessionLocal()
    try:
        job = db.query(models.EvaluationJob).filter(models.EvaluationJob.id == job_id).first()
        if not job:
            return

        try:
            # 1. Extract text
            text_content = await extract_text_from_file(req.file_id)
            logger.info(f"Successfully extracted {len(text_content)} characters for job {job_id}")

            # 2. Call LLM Router
            fallback_chain = req.llm_chain if req.llm_chain else [
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "claude-3-5-sonnet-20240620",
                "claude-3-haiku-20240307",
            ]
            model_used, parsed_result = await llm_router.evaluate_submission(
                text_content=text_content,
                marking_strategy=req.marking_strategy,
                prompt=req.prompt,
                fallback_chain=fallback_chain
            )

            job.llm_model_used = model_used
            job.parsed_result = parsed_result
            job.raw_response = json.dumps(parsed_result)  # or original text if we want raw
            job.status = "completed"

            # 3. Push to Marks Service (best-effort but don't swallow details)
            marks_service_url = os.environ.get("MARKS_SERVICE_URL", "http://marks-service:8006")
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{marks_service_url}/", json={
                    "assignment_id": req.assignment_id,
                    "submission_id": req.submission_id,
                    "student_id": req.student_id,
                    "base_result": parsed_result,
                    "final_score": parsed_result.get("total_score", 0)
                })
                if resp.status_code == 400 and "already exists" in (resp.text or ""):
                    logger.info(f"Mark already exists for submission {req.submission_id}; skipping create.")
                else:
                    resp.raise_for_status()

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
        finally:
            job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

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
    background_tasks.add_task(process_evaluation_job, job.id, eval_req)
    
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


# ===== API Key Management Endpoints =====

@app.post("/api-keys", response_model=schemas.APIKeyResponse)
def save_api_key(
    req: schemas.APIKeyCreate,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    """Save or update an API key for a provider/model."""
    # Check if already exists
    existing = db.query(models.APIKey).filter(
        models.APIKey.teacher_id == current_user["id"],
        models.APIKey.provider == req.provider.lower(),
        models.APIKey.model_name == req.model_name
    ).first()
    
    encrypted_key = encrypt_api_key(req.api_key)
    
    if existing:
        existing.encrypted_key = encrypted_key
        existing.is_valid = "untested"
        existing.error_message = None
        db.commit()
        db.refresh(existing)
        api_key_obj = existing
    else:
        api_key_obj = models.APIKey(
            teacher_id=current_user["id"],
            provider=req.provider.lower(),
            model_name=req.model_name,
            encrypted_key=encrypted_key,
            is_valid="untested"
        )
        db.add(api_key_obj)
        db.commit()
        db.refresh(api_key_obj)
    
    # Return response with masked key
    return {
        "id": api_key_obj.id,
        "provider": api_key_obj.provider,
        "model_name": api_key_obj.model_name,
        "masked_key": mask_api_key(decrypt_api_key(api_key_obj.encrypted_key)),
        "is_valid": api_key_obj.is_valid,
        "last_tested_at": api_key_obj.last_tested_at,
        "error_message": api_key_obj.error_message,
        "created_at": api_key_obj.created_at,
        "updated_at": api_key_obj.updated_at,
    }


@app.get("/api-keys", response_model=List[schemas.APIKeyResponse])
def list_api_keys(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    """List all API keys for the current teacher."""
    keys = db.query(models.APIKey).filter(
        models.APIKey.teacher_id == current_user["id"]
    ).all()
    
    result = []
    for key in keys:
        decrypted = decrypt_api_key(key.encrypted_key)
        result.append({
            "id": key.id,
            "provider": key.provider,
            "model_name": key.model_name,
            "masked_key": mask_api_key(decrypted),
            "is_valid": key.is_valid,
            "last_tested_at": key.last_tested_at,
            "error_message": key.error_message,
            "created_at": key.created_at,
            "updated_at": key.updated_at,
        })
    
    return result


@app.post("/api-keys/test", response_model=schemas.APIKeyTestResponse)
async def test_api_key_endpoint(
    req: schemas.APIKeyTestRequest,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    """Test an API key with the specified provider and model."""
    # Look up existing saved key if no api_key provided in request
    existing = db.query(models.APIKey).filter(
        models.APIKey.teacher_id == current_user["id"],
        models.APIKey.provider == req.provider.lower(),
        models.APIKey.model_name == req.model_name
    ).first()

    key_to_test = req.api_key
    if (not key_to_test) and existing:
        try:
            key_to_test = decrypt_api_key(existing.encrypted_key)
        except Exception:
            # if decryption fails, mark existing as invalid and return
            existing.is_valid = "invalid"
            existing.last_tested_at = datetime.utcnow()
            existing.error_message = "failed to decrypt stored key"
            db.commit()
            return {
                "is_valid": False,
                "status": "invalid",
                "error_message": existing.error_message,
                "message": existing.error_message
            }

    # If we have an existing DB record, mark it as running so frontend shows progress
    if existing:
        existing.is_valid = "running"
        existing.last_tested_at = datetime.utcnow()
        existing.error_message = None
        db.commit()

    # Perform the actual test
    is_valid, status, message = await test_api_key(req.provider, req.model_name, key_to_test)

    # Update in DB if already saved
    if existing:
        existing.is_valid = status
        existing.last_tested_at = datetime.utcnow()
        existing.error_message = message if not is_valid else None
        db.commit()

    return {
        "is_valid": is_valid,
        "status": status,
        "error_message": message if not is_valid else None,
        "message": message
    }


@app.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.require_teacher)
):
    """Delete an API key."""
    key = db.query(models.APIKey).filter(models.APIKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if key.teacher_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(key)
    db.commit()
    
    return {"message": "API key deleted successfully"}
