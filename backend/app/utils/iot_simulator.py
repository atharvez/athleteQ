import random
from datetime import datetime, timedelta


BASE_TIMES = {
    "20m_sprint": (2.8, 4.5),
    "30m_sprint": (3.8, 5.8),
    "agility": (8.5, 14.0),
}


def generate_mock_timing(test_type: str) -> dict:
    """Generate a simulated IoT timing gate payload."""
    lo, hi = BASE_TIMES.get(test_type, (3.0, 6.0))
    elapsed_ms = int(random.uniform(lo, hi) * 1000)
    start = datetime.utcnow()
    end = start + timedelta(milliseconds=elapsed_ms)
    return {
        "gate_start": start.isoformat() + "Z",
        "gate_end": end.isoformat() + "Z",
        "elapsed_ms": elapsed_ms,
        "elapsed_seconds": round(elapsed_ms / 1000, 3),
        "simulated": True,
        "device_id": "mock-gate-001",
        "signal_strength": random.randint(85, 100),
    }
