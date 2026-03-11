from pydantic import BaseModel
from datetime import datetime

class FileResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True
