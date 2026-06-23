import httpx
import random
import asyncio

SPORTS = ['Football', 'Basketball', 'Athletics', 'Swimming', 'Rugby', 'Cricket', 'Tennis', 'Cycling', 'Other']
GENDERS = ['male', 'female', 'other']

FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

async def seed():
    print("Starting database seed...")
    async with httpx.AsyncClient(base_url="http://localhost:8005") as client:
        # Create 1 demo coach
        coach_data = {
            "email": "coach@test.com",
            "password": "password123",
            "full_name": "Demo Coach",
            "role": "coach"
        }
        res = await client.post("/auth/register", json=coach_data)
        if res.status_code == 200:
            print("✅ Created Demo Coach (coach@test.com / password123)")
        else:
            print(f"⚠️ Coach creation skipped or failed: {res.text}")

        # Create demo athlete
        athlete_data = {
            "email": "athlete@test.com",
            "password": "password123",
            "full_name": "Demo Athlete",
            "role": "athlete",
            "sport": "Athletics",
            "gender": "male",
            "height_cm": 180,
            "weight_kg": 75
        }
        res = await client.post("/auth/register", json=athlete_data)
        if res.status_code == 200:
            print("✅ Created Demo Athlete (athlete@test.com / password123)")
        else:
            print(f"⚠️ Demo athlete creation skipped or failed: {res.text}")
            
        print("\nCreating 20 random players...")
        # Create 20 athletes
        for i in range(20):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            email = f"player{i+1}_{first.lower()}_{last.lower()}@test.com"
            data = {
                "email": email,
                "password": "password123",
                "full_name": f"{first} {last}",
                "role": "athlete",
                "sport": random.choice(SPORTS),
                "gender": random.choice(GENDERS),
                "height_cm": random.randint(160, 200),
                "weight_kg": random.randint(60, 100)
            }
            res = await client.post("/auth/register", json=data)
            if res.status_code == 200:
                print(f"✅ Created Player {i+1}: {data['full_name']} ({email})")
            else:
                print(f"❌ Failed to create Player {i+1}: {res.text}")

if __name__ == "__main__":
    asyncio.run(seed())
