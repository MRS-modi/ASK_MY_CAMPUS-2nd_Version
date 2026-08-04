import sqlite3
conn = sqlite3.connect("ask_my_campus.db")
cursor = conn.cursor()

# Check karo column ka naam kya hai
try:
    cursor.execute("ALTER TABLE comments RENAME COLUMN author_id TO user_id;")
    conn.commit()
    print("Column rename ho gaya: author_id -> user_id")
except Exception as e:
    print(f"Error: {e}")

conn.close()