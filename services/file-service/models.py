from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(String, primary_key=True, index=True) # UUID string
    filename = Column(String)
    content_type = Column(String)
    size_bytes = Column(Integer)
    uploader_id = Column(Integer, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
