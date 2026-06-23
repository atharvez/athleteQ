from fastapi import APIRouter, Query
from app.utils.iot_simulator import generate_mock_timing

router = APIRouter(prefix="/simulate", tags=["simulate"])

VALID_TEST_TYPES = ["20m_sprint", "30m_sprint", "agility"]


@router.post("/timing")
async def simulate_timing(test_type: str = Query(default="20m_sprint", enum=VALID_TEST_TYPES)):
    """Generate mock IoT timing payload for a given test type."""
    payload = generate_mock_timing(test_type)
    return payload
