import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.database import get_supabase_admin

def test_list():
    db = get_supabase_admin()
    try:
        result = db.table("athletes").select("*").execute()
        print("Athletes:", len(result.data))
        
        auth_users = db.auth.admin.list_users()
        for u in auth_users:
            print("User:", getattr(u, 'email', None), getattr(u, 'user_metadata', None))
    except Exception as e:
        print("ERROR:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_list()
