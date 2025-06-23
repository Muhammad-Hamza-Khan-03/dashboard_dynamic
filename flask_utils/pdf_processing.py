import sqlite3
import threading
from contextlib import contextmanager

class ConnectionPool:
    def __init__(self, db_path, max_connections=10):
        self.db_path = db_path
        self.max_connections = max_connections
        self.local = threading.local()
        
        # Setup database with optimized settings
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=10000")
        conn.execute("PRAGMA temp_store=MEMORY")
        conn.commit()
        conn.close()

    @contextmanager
    def get_connection(self):
        # Create a new connection for this thread each time
        # This is the safest approach with SQLite
        connection = sqlite3.connect(self.db_path)
        connection.execute("PRAGMA foreign_keys = ON")
        
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
    def close_all(self):
        pass
