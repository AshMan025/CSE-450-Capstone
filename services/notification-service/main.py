from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas, database, dependencies
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Notification Service")

@app.post("/", response_model=schemas.NotificationResponse)
def create_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(database.get_db),
    # Normally other services (like marks, course) will call this.
    # We might protect this with a machine-to-machine token or allow logged in teachers
):
    new_notification = models.Notification(
        user_id=notification.user_id,
        message=notification.message
    )
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    return new_notification

@app.get("/", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.get_current_user)
):
    """Alias for /user - returns the current user's notifications."""
    return db.query(models.Notification).filter(models.Notification.user_id == current_user["id"]).order_by(models.Notification.created_at.desc()).all()

@app.get("/user", response_model=List[schemas.NotificationResponse])
def get_user_notifications(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.get_current_user)
):
    return db.query(models.Notification).filter(models.Notification.user_id == current_user["id"]).order_by(models.Notification.created_at.desc()).all()

@app.put("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(dependencies.get_current_user)
):
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notification.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@app.get("/health")
def health_check():
    return {"status": "healthy"}
