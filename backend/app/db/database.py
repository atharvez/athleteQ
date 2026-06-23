import os
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


@lru_cache()
def get_supabase() -> Client:
    """Returns Supabase client with anon key (respects RLS)."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("Supabase URL and ANON key must be set in .env")
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@lru_cache()
def get_supabase_admin() -> Client:
    """Returns Supabase client with service role key (bypasses RLS)."""
    key = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY  # fallback to anon in dev
    if not SUPABASE_URL or not key:
        raise RuntimeError("Supabase URL and SERVICE key must be set in .env")
    return create_client(SUPABASE_URL, key)
