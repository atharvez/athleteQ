from fastapi import APIRouter, HTTPException
from app.schemas.schemas import RegisterRequest, LoginRequest
from app.db.database import get_supabase_admin
import httpx
import os

router = APIRouter(prefix="/auth", tags=["auth"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")


@router.post("/register")
async def register(req: RegisterRequest):
    """Create Supabase user + athlete profile atomically."""
    db = get_supabase_admin()

    try:
        # 1. Create auth user with role in metadata
        auth_response = db.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {
                "role": req.role,
                "full_name": req.full_name,
                "sport": req.sport or "",
            }
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")

        user_id = auth_response.user.id

        # 2. If athlete, create athlete profile (trigger also handles this, but explicit is safer)
        profile = None
        if req.role == "athlete":
            import uuid
            profile_data = {
                "user_id": user_id,
                "full_name": req.full_name,
                "sport": req.sport,
                "date_of_birth": req.date_of_birth,
                "gender": req.gender,
                "height_cm": req.height_cm,
                "weight_kg": req.weight_kg,
                "qr_token": str(uuid.uuid4()),
            }
            # Check if trigger already created it
            existing = db.table("athletes").select("*").eq("user_id", user_id).execute()
            if existing.data:
                # Update with full data
                db.table("athletes").update({
                    "date_of_birth": req.date_of_birth,
                    "gender": req.gender,
                    "height_cm": req.height_cm,
                    "weight_kg": req.weight_kg,
                }).eq("user_id", user_id).execute()
                profile = existing.data[0]
            else:
                result = db.table("athletes").insert(profile_data).execute()
                profile = result.data[0] if result.data else None

        return {
            "message": "Registration successful",
            "user_id": user_id,
            "email": req.email,
            "role": req.role,
            "profile": profile,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate user and return Supabase JWT."""
    db = get_supabase_admin()

    try:
        auth_response = db.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = auth_response.user
        role = user.user_metadata.get("role", "athlete") if user.user_metadata else "athlete"

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user_id": user.id,
            "email": user.email,
            "role": role,
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
