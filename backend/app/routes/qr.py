from fastapi import APIRouter, HTTPException, Depends
from app.schemas.schemas import QRValidateRequest, QRValidateResponse
from app.db.database import get_supabase_admin
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/qr", tags=["qr"])


@router.post("/validate", response_model=QRValidateResponse)
async def validate_qr(req: QRValidateRequest, user: dict = Depends(get_current_user)):
    """
    Accepts {qr_token, test_event_id}.
    - Looks up athlete by qr_token
    - Checks the event is active
    - Enrolls athlete in session (or returns existing)
    - Logs the scan
    - Returns athlete identity + session info
    """
    db = get_supabase_admin()

    # 1. Find athlete by qr_token
    athlete_result = db.table("athletes").select("*").eq("qr_token", req.qr_token).execute()
    if not athlete_result.data:
        # Log failed scan
        _log_scan(db, req.qr_token, None, req.test_event_id, "not_found", user["id"])
        raise HTTPException(status_code=404, detail="QR token not found")

    athlete = athlete_result.data[0]

    # 2. Verify event exists and is active
    event_result = db.table("test_events").select("*").eq("id", req.test_event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Test event not found")
    event = event_result.data[0]
    if event["status"] != "active":
        raise HTTPException(status_code=400, detail=f"Event is not active (status: {event['status']})")

    # 3. Check if already enrolled
    existing = db.table("athlete_sessions").select("*").eq(
        "athlete_id", athlete["id"]
    ).eq("test_event_id", req.test_event_id).execute()

    if existing.data:
        session = existing.data[0]
        # Check if there is an existing test result
        result_res = db.table("test_results").select("*").eq("athlete_session_id", session["id"]).execute()
        result_val = None
        speed = None
        if result_res.data:
            result_val = result_res.data[0]["result_value"]
            SPRINT_DISTANCES = {"20m_sprint": 20, "30m_sprint": 30}
            distance = SPRINT_DISTANCES.get(event["test_type"])
            if distance and result_val:
                speed = round((distance / result_val) * 3.6, 1)


        _log_scan(db, req.qr_token, athlete["id"], req.test_event_id, "already_enrolled", user["id"])
        return QRValidateResponse(
            athlete_id=athlete["id"],
            full_name=athlete["full_name"],
            sport=athlete.get("sport"),
            session_id=session["id"],
            status=session["status"],
            already_enrolled=True,
            result_value=result_val,
            speed_kmh=speed
        )

    # 4. Enroll in session
    # We will enroll them as queued first. Let the queue process handle completion.
    # Wait, the user's flow seems to just auto-complete it in the MVP to simulate testing,
    # let's keep it as is, or we can just make it queued if we want them to test via queue.
    # If we want the queue to work, it should be "queued".
    import random

    SPRINT_DISTANCES = {"20m_sprint": 20, "30m_sprint": 30}
    distance = SPRINT_DISTANCES.get(event["test_type"])

    # Simulate a test result immediately
    if event["test_type"] == "20m_sprint":
        test_val = round(random.uniform(3.0, 4.5), 3)
    elif event["test_type"] == "30m_sprint":
        test_val = round(random.uniform(4.0, 5.5), 3)
    else:  # agility
        test_val = round(random.uniform(10.0, 15.0), 3)

    speed = round((distance / test_val) * 3.6, 1) if distance else None


    session_result = db.table("athlete_sessions").insert({
        "athlete_id": athlete["id"],
        "test_event_id": req.test_event_id,
        "status": "completed",
    }).execute()
    
    session = session_result.data[0]
    
    db.table("test_results").insert({
        "athlete_session_id": session["id"],
        "athlete_id": athlete["id"],
        "test_event_id": req.test_event_id,
        "result_value": test_val,
        "unit": "seconds",
    }).execute()
    
    _log_scan(db, req.qr_token, athlete["id"], req.test_event_id, "success", user["id"])
    
    return QRValidateResponse(
        athlete_id=athlete["id"],
        full_name=athlete["full_name"],
        sport=athlete.get("sport"),
        session_id=session["id"],
        status="completed",
        already_enrolled=False,
        result_value=test_val,
        speed_kmh=speed
    )


def _log_scan(db, qr_token, athlete_id, event_id, result, scanned_by):
    """Insert a scan audit log (fire-and-forget)."""
    try:
        db.table("scan_logs").insert({
            "qr_token": qr_token,
            "athlete_id": athlete_id,
            "test_event_id": event_id,
            "scan_result": result,
            "scanned_by": scanned_by,
        }).execute()
    except Exception:
        pass  # Non-critical
