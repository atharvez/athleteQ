import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import get_supabase_admin

def clear_db():
    try:
        db = get_supabase_admin()
        
        print("Clearing scan_logs...")
        res_logs = db.table("scan_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared {len(res_logs.data) if res_logs.data else 0} logs.")
        
        print("Clearing test_results...")
        res_results = db.table("test_results").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared {len(res_results.data) if res_results.data else 0} results.")
        
        print("Clearing athlete_sessions...")
        res_queue = db.table("athlete_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared {len(res_queue.data) if res_queue.data else 0} sessions.")
        
        print("Clearing test_events...")
        res_events = db.table("test_events").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"Cleared {len(res_events.data) if res_events.data else 0} events.")
        
        print("Database cleared successfully!")
    except Exception as e:
        print(f"Error clearing database: {e}")

if __name__ == "__main__":
    clear_db()
