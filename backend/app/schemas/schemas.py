from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict, List
from datetime import datetime, date


# ─── AUTH ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "athlete"          # 'athlete' | 'coach'
    sport: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# ─── ATHLETES ────────────────────────────────────────────────────────────────

class AthleteProfile(BaseModel):
    id: str
    user_id: str
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    sport: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    qr_token: str
    created_at: str


class AthleteUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    sport: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None


# ─── EVENTS ──────────────────────────────────────────────────────────────────

class CreateEventRequest(BaseModel):
    name: str
    test_type: str       # '20m_sprint' | '30m_sprint' | 'agility'


class TestEvent(BaseModel):
    id: str
    name: str
    test_type: str
    status: str
    created_by: Optional[str] = None
    created_at: str


# ─── QR ──────────────────────────────────────────────────────────────────────

class QRValidateRequest(BaseModel):
    qr_token: str
    test_event_id: str


class QRValidateResponse(BaseModel):
    athlete_id: str
    full_name: str
    sport: Optional[str]
    session_id: str
    status: str
    already_enrolled: bool = False
    result_value: Optional[float] = None
    speed_kmh: Optional[float] = None


# ─── SESSIONS ────────────────────────────────────────────────────────────────

class CompleteSessionRequest(BaseModel):
    result_value: float
    use_simulation: bool = False


class SessionStatus(BaseModel):
    id: str
    athlete_id: str
    athlete_name: Optional[str] = None
    test_event_id: str
    status: str
    scanned_at: str


# ─── RESULTS ─────────────────────────────────────────────────────────────────

class TestResult(BaseModel):
    id: str
    athlete_id: str
    test_event_id: str
    result_value: float
    unit: str
    raw_iot_payload: Optional[Dict[str, Any]] = None
    recorded_at: str


# ─── SIMULATE ────────────────────────────────────────────────────────────────

class SimulateTimingResponse(BaseModel):
    gate_start: str
    gate_end: str
    elapsed_ms: int
    elapsed_seconds: float
    simulated: bool
    device_id: str
    signal_strength: int
