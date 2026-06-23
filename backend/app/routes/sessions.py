from fastapi import APIRouter, HTTPException, Depends
from app.schemas.schemas import CompleteSessionRequest
from app.db.database import get_supabase_admin
from app.middleware.auth import get_current_user, require_coach
from app.utils.iot_simulator import generate_mock_timing

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.put("/{session_id}/start")
async def start_session(session_id: str, user: dict = Depends(require_coach)):
    """Set session status to 'testing', generate mock IoT start signal."""
    db = get_supabase_admin()
    try:
        result = db.table("athlete_sessions").update({"status": "testing"}).eq("id", session_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get event type for IoT signal
        session = result.data[0]
        event = db.table("test_events").select("test_type").eq("id", session["test_event_id"]).execute()
        test_type = event.data[0]["test_type"] if event.data else "20m_sprint"

        # Generate mock IoT start signal
        iot_signal = generate_mock_timing(test_type)

        return {
            "session": result.data[0],
            "iot_start_signal": {
                "gate_start": iot_signal["gate_start"],
                "device_id": iot_signal["device_id"],
                "signal_strength": iot_signal["signal_strength"],
                "simulated": True,
            },
            "message": "Test started",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{session_id}/complete")
async def complete_session(session_id: str, req: CompleteSessionRequest, user: dict = Depends(require_coach)):
    """Accept result_value, store result, mark session complete."""
    db = get_supabase_admin()

    try:
        # Get session details
        session_result = db.table("athlete_sessions").select(
            "*, test_events(test_type)"
        ).eq("id", session_id).execute()

        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")

        session = session_result.data[0]
        event = session.get("test_events", {}) or {}
        test_type = event.get("test_type", "20m_sprint")

        # Optionally generate IoT simulation payload
        iot_payload = None
        result_value = req.result_value
        if req.use_simulation:
            iot_payload = generate_mock_timing(test_type)
            result_value = iot_payload["elapsed_seconds"]

        # Store test result
        result_insert = db.table("test_results").insert({
            "athlete_session_id": session_id,
            "athlete_id": session["athlete_id"],
            "test_event_id": session["test_event_id"],
            "result_value": result_value,
            "unit": "seconds",
            "raw_iot_payload": iot_payload,
        }).execute()

        # Mark session as completed
        db.table("athlete_sessions").update({"status": "completed"}).eq("id", session_id).execute()

        # Fetch athlete personal best for comparison
        all_results = db.table("test_results").select("result_value").eq(
            "athlete_id", session["athlete_id"]
        ).eq("test_event_id", session["test_event_id"]).execute()

        values = [r["result_value"] for r in (all_results.data or [])]
        personal_best = min(values) if values else result_value
        is_pb = result_value <= personal_best

        return {
            "result": result_insert.data[0] if result_insert.data else {},
            "result_value": result_value,
            "personal_best": personal_best,
            "is_personal_best": is_pb,
            "iot_payload": iot_payload,
            "message": "Test completed successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
