from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routes import auth, athletes, qr, events, sessions, simulate

app = FastAPI(
    title="Sports Performance OS — API",
    description="QR-based athlete testing platform backend",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Expo app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(athletes.router)
app.include_router(qr.router)
app.include_router(events.router)
app.include_router(sessions.router)
app.include_router(simulate.router)


@app.get("/")
async def root():
    return {
        "message": "Sports Performance OS API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
