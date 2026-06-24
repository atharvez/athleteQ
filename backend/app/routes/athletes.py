import time
import threading
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.schemas.schemas import AthleteUpdate
from app.db.database import get_supabase_admin
from app.middleware.auth import get_current_user, require_coach

router = APIRouter(prefix="/athletes", tags=["athletes"])

COACH_LIST_CACHE = []
LAST_CACHE_TIME = 0
CACHE_TTL = 300  # 5 minutes
CACHE_LOCK = threading.Lock()

def refresh_coach_list():
    global COACH_LIST_CACHE, LAST_CACHE_TIME
    if not CACHE_LOCK.acquire(blocking=False):
        return
    try:
        if time.time() - LAST_CACHE_TIME < CACHE_TTL:
            return
        db = get_supabase_admin()
        auth_users = db.auth.admin.list_users()
        coaches = []
        for u in auth_users:
            if u.user_metadata and u.user_metadata.get("role") == "coach":
                coaches.append({
                    "id": u.id,
                    "email": u.email,
                    "full_name": u.user_metadata.get("full_name", "Unknown Coach"),
                    "role": "coach"
                })
        COACH_LIST_CACHE = coaches
        LAST_CACHE_TIME = time.time()
    except Exception as e:
        print("Failed to refresh coach list cache in background:", e)
    finally:
        CACHE_LOCK.release()


@router.get("")
async def get_all_users(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Admin only: get all athletes and coaches."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_supabase_admin()
    try:
        result = db.table("athletes").select("*").execute()

        global COACH_LIST_CACHE, LAST_CACHE_TIME
        if not COACH_LIST_CACHE:
            # Cache is cold — do a synchronous fetch on first call
            refresh_coach_list()
        elif time.time() - LAST_CACHE_TIME > CACHE_TTL:
            # Cache is stale — refresh in background, serve stale data now
            background_tasks.add_task(refresh_coach_list)

        return {"athletes": result.data or [], "coaches": COACH_LIST_CACHE}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
async def get_my_profile(user: dict = Depends(get_current_user)):
    """Return own athlete profile + QR token."""
    db = get_supabase_admin()
    try:
        result = db.table("athletes").select("*").eq("user_id", user["id"]).execute()
        if not result.data:
            if user.get("role") == "athlete":
                import uuid
                metadata = user.get("user_metadata") or {}
                profile_data = {
                    "user_id": user["id"],
                    "full_name": metadata.get("full_name") or user["email"].split("@")[0].capitalize(),
                    "sport": metadata.get("sport") or "General",
                    "qr_token": str(uuid.uuid4())
                }
                insert_res = db.table("athletes").insert(profile_data).execute()
                if insert_res.data:
                    return insert_res.data[0]
            raise HTTPException(status_code=404, detail="Athlete profile not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/me")
async def update_my_profile(body: AthleteUpdate, user: dict = Depends(get_current_user)):
    """Update own athlete profile."""
    db = get_supabase_admin()
    try:
        update_data = {k: v for k, v in body.dict().items() if v is not None}
        result = db.table("athletes").update(update_data).eq("user_id", user["id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Athlete not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/refresh-qr")
async def refresh_qr_token(user: dict = Depends(get_current_user)):
    """Generate a new QR token for the athlete."""
    import uuid
    db = get_supabase_admin()
    new_token = str(uuid.uuid4())
    try:
        result = db.table("athletes").update({"qr_token": new_token}).eq("user_id", user["id"]).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Athlete not found")
        return {"qr_token": new_token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/consolidated")
async def get_consolidated_results(user: dict = Depends(get_current_user)):
    """Admin only: get consolidated best results per athlete and test type."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_supabase_admin()
    try:
        results = db.table("test_results").select(
            "result_value, athletes(id, full_name, sport), test_events(test_type)"
        ).execute()
        
        consolidated = {}
        for r in (results.data or []):
            athlete = r.get("athletes")
            event = r.get("test_events")
            if not athlete or not event:
                continue
            
            athlete_id = athlete["id"]
            test_type = event["test_type"]
            val = r["result_value"]
            
            if athlete_id not in consolidated:
                consolidated[athlete_id] = {
                    "athlete_id": athlete_id,
                    "full_name": athlete["full_name"],
                    "sport": athlete["sport"],
                    "tests": {}
                }
                
            if test_type not in consolidated[athlete_id]["tests"]:
                consolidated[athlete_id]["tests"][test_type] = {
                    "best": val,
                    "count": 1
                }
            else:
                consolidated[athlete_id]["tests"][test_type]["best"] = min(consolidated[athlete_id]["tests"][test_type]["best"], val)
                consolidated[athlete_id]["tests"][test_type]["count"] += 1
                
        # Sort by full name
        res_list = list(consolidated.values())
        res_list.sort(key=lambda x: x["full_name"])
        return {"consolidated": res_list}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{athlete_id}")
async def get_athlete(athlete_id: str, user: dict = Depends(require_coach)):
    """Coach-only: get athlete details."""
    db = get_supabase_admin()
    try:
        result = db.table("athletes").select("*").eq("id", athlete_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Athlete not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{athlete_id}/history")
async def get_athlete_history(athlete_id: str, user: dict = Depends(get_current_user)):
    """Full test result history with stats for an athlete."""
    db = get_supabase_admin()
    try:
        # Allow athletes to only see their own history
        if user["role"] == "athlete":
            profile = db.table("athletes").select("id").eq("user_id", user["id"]).execute()
            if not profile.data or profile.data[0]["id"] != athlete_id:
                raise HTTPException(status_code=403, detail="Access denied")

        results = db.table("test_results").select(
            "*, test_events(name, test_type)"
        ).eq("athlete_id", athlete_id).order("recorded_at", desc=True).execute()

        raw = results.data or []

        # Group by test_type and compute stats
        from collections import defaultdict
        grouped: dict = defaultdict(list)
        for r in raw:
            test_type = r.get("test_events", {}).get("test_type", "unknown") if r.get("test_events") else "unknown"
            grouped[test_type].append(r)

        history = []
        for test_type, records in grouped.items():
            values = [r["result_value"] for r in records]
            history.append({
                "test_type": test_type,
                "records": records[:10],  # last 10
                "personal_best": min(values),  # lower = faster for sprints
                "last_result": values[0] if values else None,
                "trend": _compute_trend(values),
                "total_tests": len(values),
            })

        return {"athlete_id": athlete_id, "history": history}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _compute_trend(values: list) -> str:
    """Simple trend: compare last 3 to previous 3."""
    if len(values) < 4:
        return "insufficient_data"
    recent = sum(values[:3]) / 3
    older = sum(values[3:6]) / max(len(values[3:6]), 1)
    if recent < older * 0.98:
        return "improving"
    elif recent > older * 1.02:
        return "declining"
    return "stable"
