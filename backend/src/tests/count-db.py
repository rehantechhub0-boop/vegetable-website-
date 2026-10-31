import sqlite3
import sys

db_path = sys.argv[1] if len(sys.argv) > 1 else "prisma/dev.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM "Order"')
orders = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM "User"')
users = cur.fetchone()[0]
conn.close()

print(f"{orders},{users}")
