
import queue
import sqlite3
import time
from typing import Optional

from flask_caching import logger


global stats_task_queue
stats_task_queue = queue.Queue()

def update_task_status(task_id: str, status: str, progress: Optional[float] = None, 
                       message: Optional[str] = None) -> bool:
    """Update the status of a statistics calculation task."""
    conn = None
    try:
        conn = get_db_connection('stats.db')
        c = conn.cursor()
        
        # Update task status
        if progress is not None and message is not None:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?, progress = ?, message = ?
                WHERE task_id = ?
            """, (status, progress, message, task_id))
        elif progress is not None:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?, progress = ?
                WHERE task_id = ?
            """, (status, progress, task_id))
        elif message is not None:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?, message = ?
                WHERE task_id = ?
            """, (status, message, task_id))
        else:
            c.execute("""
                UPDATE stats_tasks 
                SET status = ?
                WHERE task_id = ?
            """, (status, task_id))
        
        # If task is completed, update the completed_at timestamp
        if status == 'completed':
            c.execute("""
                UPDATE stats_tasks 
                SET completed_at = CURRENT_TIMESTAMP
                WHERE task_id = ?
            """, (task_id,))
        
        conn.commit()
        
        # Update global status dictionary for quicker access
        # Celery tasks can't access global variables across processes, 
        # so we store them in the database only
        
        return True
    except Exception as e:
        logger.error(f"Error updating task status: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        conn.close()

def get_db_connection(db_name: str) -> sqlite3.Connection:
    """Get a database connection with proper settings."""
    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    return conn

def create_stats_task(table_id, table_name):
    """Create a new statistics calculation task with Celery"""
    task_id = f"stats_{table_id}_{int(time.time())}"
    
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    
    try:
        c.execute("""
            INSERT INTO stats_tasks (task_id, table_id, status, message)
            VALUES (?, ?, ?, ?)
        """, (task_id, table_id, 'pending', 'Task created'))
        
        conn.commit()
        
        # Queue the task for background processing
        stats_task_queue.put({
            'task_id': task_id,
            'table_id': table_id,
            'table_name': table_name
        })
        
        logger.info(f"Created statistics task: {task_id}")
        return task_id
    except Exception as e:
        logger.error(f"Error creating stats task: {str(e)}")
        return None
    finally:
        conn.close()
