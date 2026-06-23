from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os

security = HTTPBearer()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Verify Supabase JWT via Supabase Auth API and return decoded payload."""
    token = credentials.credentials
    try:
        from app.db.database import get_supabase_admin
        db = get_supabase_admin()
        res = db.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid token: no user found")
        user = res.user
        return {
            "sub": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata or {},
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_current_user(payload: dict = Depends(verify_token)) -> dict:
    """Extract user info from JWT payload."""
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")
    return {
        "id": user_id,
        "email": payload.get("email", ""),
        "role": payload.get("user_metadata", {}).get("role", "athlete"),
    }


def require_coach(user: dict = Depends(get_current_user)) -> dict:
    """Dependency: only coaches can access this endpoint."""
    if user.get("role") not in ["coach", "admin"] and user.get("email") != "admin@pst.com":
        raise HTTPException(status_code=403, detail="Coach or Admin access required")
    return user
