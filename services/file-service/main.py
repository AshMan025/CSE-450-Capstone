from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.orm import Session
import uuid
import os
import shutil

import models, schemas, database, dependencies
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="File Service")

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed extensions for exams
ALLOWED_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"]
MAX_FILE_SIZE = 20 * 1024 * 1024 # 20MB

@app.post("/upload", response_model=schemas.FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.get_current_user)
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPEG, and PNG are allowed.")

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")

    file_id = str(uuid.uuid4())
    _, ext = os.path.splitext(file.filename)
    if not ext:
        ext = ".bin" # fallback

    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not save file")

    new_file_meta = models.FileMetadata(
        id=file_id,
        filename=f"{file_id}{ext}", # store physical filename or original filename, storing physical for easy retrieval
        content_type=file.content_type,
        size_bytes=file_size,
        uploader_id=current_user["id"]
    )
    db.add(new_file_meta)
    db.commit()
    db.refresh(new_file_meta)
    
    # Return the original filename for the response schema but the id is what matters
    return schemas.FileResponse(
        id=new_file_meta.id,
        filename=file.filename, # Show original to user
        content_type=new_file_meta.content_type,
        size_bytes=new_file_meta.size_bytes,
        created_at=new_file_meta.created_at
    )

@app.get("/{file_id}")
def get_file(file_id: str, db: Session = Depends(database.get_db), current_user: dict = Depends(dependencies.get_current_user)):
    file_meta = db.query(models.FileMetadata).filter(models.FileMetadata.id == file_id).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = os.path.join(UPLOAD_DIR, file_meta.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found")

    # We might want to restrict file access to the teacher of the course or the student who uploaded it.
    # For MVP, anyone authenticated can view it (assuming they got the UUID via the assignment service).
    return FastAPIFileResponse(path=file_path, media_type=file_meta.content_type, filename=file_meta.filename)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
