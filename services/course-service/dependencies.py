from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

SECRET_KEY = os.environ.get("SECRET_KEY", "PLACEHOLDER_SECRET_KEY_CHANGE_ME_32CHARS")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        email: str = payload.get("email")
        
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            
        return {"id": int(user_id), "role": role, "email": email}
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
