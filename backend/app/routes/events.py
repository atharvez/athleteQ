import time
import threading
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.schemas.schemas import CreateEventRequest
from app.db.database import get_supabase_admin
from app.middleware.auth import get_current_user, require_coach

router = APIRouter(prefix="/events", tags=["events"])

VALID_TEST_TYPES = ["20m_sprint", "30m_sprint", "agility"]

COACH_MAP_CACHE = {}
LAST_CACHE_TIME = 0
CACHE_TTL = 300  # Cache for 5 minutes
CACHE_LOCK = threading.Lock()

def refresh_coach_cache():
    global COACH_MAP_CACHE, LAST_CACHE_TIME
    # Try to acquire lock without blocking to avoid queueing duplicate requests
    if not CACHE_LOCK.acquire(blocking=False):
        return
    try:
        # Double-check inside lock
        if time.time() - LAST_CACHE_TIME < CACHE_TTL:
            return
        db = get_supabase_admin()
        auth_users = db.auth.admin.list_users()
        new_map = {u.id: (u.user_metadata.get("full_name") if u.user_metadata else "Unknown") for u in auth_users}
        COACH_MAP_CACHE = new_map
        LAST_CACHE_TIME = time.time()
    except Exception as e:
        print("Failed to refresh coach cache in background:", e)
    finally:
        CACHE_LOCK.release()


@router.get("")
async def list_events(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """List all test events."""
    db = get_supabase_admin()
    try:
        is_admin = user.get("role") == "admin" or user.get("email") == "admin@pst.com"
        query = db.table("test_events").select("*").order("created_at", desc=True)
        if not is_admin:
            query = query.eq("created_by", user["id"])
        result = query.execute()
        events = result.data or []

        global COACH_MAP_CACHE, LAST_CACHE_TIME
        if not COACH_MAP_CACHE:
            # Cache is cold — do a synchronous fetch on first call
            refresh_coach_cache()
        elif time.time() - LAST_CACHE_TIME > CACHE_TTL:
            # Cache is stale — refresh in background, serve stale data now
            background_tasks.add_task(refresh_coach_cache)

        for e in events:
            e["coach_name"] = COACH_MAP_CACHE.get(e["created_by"], "Unknown Coach")

        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.post("")
async def create_event(req: CreateEventRequest, user: dict = Depends(require_coach)):
    """Create new test event (coach only)."""
    db = get_supabase_admin()
    if req.test_type not in VALID_TEST_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid test_type. Must be one of: {VALID_TEST_TYPES}")
    try:
        result = db.table("test_events").insert({
            "name": req.name,
            "test_type": req.test_type,
            "status": "pending",
            "created_by": user["id"],
        }).execute()
        return {"event": result.data[0], "message": "Event created successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{event_id}/activate")
async def activate_event(event_id: str, user: dict = Depends(require_coach)):
    """Set event status to active, completing any other active events."""
    db = get_supabase_admin()
    try:
        # Deactivate/complete all other active events to prevent duplicates
        db.table("test_events").update({"status": "completed"}).eq("status", "active").neq("id", event_id).execute()
        
        result = db.table("test_events").update({"status": "active"}).eq("id", event_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"event": result.data[0], "message": "Event activated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{event_id}/complete")
async def complete_event(event_id: str, user: dict = Depends(require_coach)):
    """Set event status to completed."""
    db = get_supabase_admin()
    try:
        result = db.table("test_events").update({"status": "completed"}).eq("id", event_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"event": result.data[0], "message": "Event completed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{event_id}/queue")
async def get_event_queue(event_id: str, user: dict = Depends(require_coach)):
    """Return all athlete_sessions with status for this event (realtime-ready snapshot)."""
    db = get_supabase_admin()
    try:
        # Join with athletes to get names
        result = db.table("athlete_sessions").select(
            "*, athletes(full_name, sport, qr_token)"
        ).eq("test_event_id", event_id).order("scanned_at").execute()

        sessions = []
        for s in (result.data or []):
            athlete_info = s.get("athletes", {}) or {}
            sessions.append({
                "id": s["id"],
                "athlete_id": s["athlete_id"],
                "athlete_name": athlete_info.get("full_name", "Unknown"),
                "athlete_sport": athlete_info.get("sport", ""),
                "test_event_id": s["test_event_id"],
                "status": s["status"],
                "scanned_at": s["scanned_at"],
            })

        # Sort by status priority: testing > ready > queued > completed
        priority = {"testing": 0, "ready": 1, "queued": 2, "completed": 3}
        sessions.sort(key=lambda x: priority.get(x["status"], 99))

        return {"sessions": sessions, "total": len(sessions)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
