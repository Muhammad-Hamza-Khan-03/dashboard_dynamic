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

# class ConnectionPool:
#     def __init__(self, db_path, max_connections=10):
#         self.db_path = db_path
#         self.max_connections = max_connections
#         # Use thread-local storage to ensure each thread gets its own connection
#         self.local = threading.local()
        
#         # Initialize WAL mode for better concurrency
#         conn = sqlite3.connect(self.db_path)
#         conn.execute("PRAGMA journal_mode=WAL")
#         conn.execute("PRAGMA synchronous=NORMAL")
#         conn.execute("PRAGMA cache_size=10000")
#         conn.execute("PRAGMA temp_store=MEMORY")
#         conn.commit()
#         conn.close()

#     @contextmanager
#     def get_connection(self):
#         # Check if this thread already has a connection
#         if not hasattr(self.local, 'connection'):
#             # Create a new connection for this thread
#             self.local.connection = sqlite3.connect(self.db_path)
#             # Enable foreign keys
#             self.local.connection.execute("PRAGMA foreign_keys = ON")
        
#         try:
#             # Return the thread-local connection
#             yield self.local.connection
#         except Exception as e:
#             # If an error occurs, roll back any changes
#             self.local.connection.rollback()
#             raise
#         finally:
#             # We don't close the connection here, just commit any changes
#             # Connections will be thread-specific and reused
#             if hasattr(self.local, 'connection'):
#                 self.local.connection.commit()
    
#     def close_all(self):
#         # Close the connection for this thread if it exists
#         # if hasattr(self.local, 'connection'):
#         #     self.local.connection.close()
#         #     delattr(self.local, 'connection')


