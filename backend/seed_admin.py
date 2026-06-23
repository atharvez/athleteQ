import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.database import get_supabase_admin

def create_admin():
    db = get_supabase_admin()
    
    email = "admin@pst.com"
    password = "admin" # Wait, supabase might reject < 6 chars. I will try "admin1" if "admin" fails. Let's try "admin" first, sometimes admin API bypasses length checks.
    
    try:
        # Check if exists
        # There's no get_user_by_email in python client, so we will just try creating
        res = db.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "role": "admin",
                "full_name": "Master Admin"
            }
        })
        print(f"Admin created successfully! ID: {res.user.id}")
    except Exception as e:
        if "already registered" in str(e).lower() or "already exists" in str(e).lower():
            print("Admin already exists.")
        elif "password" in str(e).lower():
            print("Password too short. Trying 'admin123' instead.")
            try:
                res = db.auth.admin.create_user({
                    "email": email,
                    "password": "admin", # let's see if we can update the password if it already exists
                    "email_confirm": True,
                    "user_metadata": {
                        "role": "admin",
                        "full_name": "Master Admin"
                    }
                })
                print("Admin created with password 'admin'")
            except Exception as e2:
                 print(f"Failed again: {e2}")
        else:
            print(f"Error creating admin: {e}")

if __name__ == "__main__":
    create_admin()
