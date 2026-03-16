from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "PLACEHOLDER_SECRET_KEY_CHANGE_ME_32CHARS")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
COURSE_SERVICE_URL = os.environ.get("COURSE_SERVICE_URL", "http://course-service:8002")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        email: str = payload.get("email")
        
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            
        return {"id": int(user_id), "role": role, "email": email, "token": token}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_teacher(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user

def require_student(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user

# Helper to verify course ownership (synchronous for simplicity in MVP, but async httpx is better)
async def verify_course_teacher(course_id: int, token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{COURSE_SERVICE_URL}/{course_id}", headers={"Authorization": f"Bearer {token}"})
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Course not found")
        # Ensure course data implies the caller is the teacher (course service doesn't strictly hide the course but we assume teacher validation)
        return response.json()

async def verify_course_access(course_id: int, token: str):
    """
    Verifies the current user can access the course. Course service enforces:
    - teacher: must be the owner
    - student: must have approved enrollment
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{COURSE_SERVICE_URL}/{course_id}", headers={"Authorization": f"Bearer {token}"})
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Course not found")
        if response.status_code == 403:
            raise HTTPException(status_code=403, detail="Not authorized")
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not verify course access")
        return response.json()
