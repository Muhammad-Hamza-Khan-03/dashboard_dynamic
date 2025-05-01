import logging
import sqlite3
from backend import connection_pool

def init_db():
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    -- username TEXT NOT NULL,
    -- email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
              ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  user_files 
              (file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(user_id),
    filename TEXT NOT NULL,
    file_type TEXT, --CHECK(file_type IN ('csv', 'xlsx','xls', 'db', 'tsv', 'doc', 'docx', 'txt', 'xml','pdf')),
    is_structured BOOLEAN,
    sheet_table TEXT, -- For Excel sheets or DB tables
    unique_key TEXT,  -- Random unique identifier for structured data storage table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
              ''')
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    # Check if parent_file_id column exists
    c.execute("PRAGMA table_info(user_files)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'parent_file_id' not in columns:
        # Add parent_file_id column
        c.execute('''ALTER TABLE user_files 
                    ADD COLUMN parent_file_id INTEGER 
                    REFERENCES user_files(file_id)''')
    
    c.execute('''
    CREATE TABLE IF NOT EXISTS  structured_file_storage (
    unique_key TEXT PRIMARY KEY,
    file_id INTEGER REFERENCES user_files(file_id),
    table_name TEXT NOT NULL, -- Name of dynamically created table for each file
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
              ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  unstructured_file_storage (
    file_id INTEGER REFERENCES user_files(file_id),
    file_path TEXT,
    unique_key TEXT PRIMARY KEY,
    content BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_text TEXT,
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
    ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  dashboard_store (
        dashboard_id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER REFERENCES user_files(file_id),
        dashboard_data BLOB,
              user_id TEXT REFERENCES users(user_id),
        dashboardname TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')
    c.execute('''CREATE TABLE IF NOT EXISTS graph_cache (
        graph_id TEXT PRIMARY KEY,
        html_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Check if the column 'dashboard_name' exists before adding it
    c.execute("PRAGMA table_info(graph_cache)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'dashboard_name' not in columns:
        c.execute('''ALTER TABLE graph_cache ADD COLUMN dashboard_name TEXT''')
    
    if 'image_blob' not in columns:
        c.execute('''ALTER TABLE graph_cache ADD COLUMN image_blob BLOB''')
    
    if 'isImageSuccess' not in columns:
        c.execute('''ALTER TABLE graph_cache ADD COLUMN isImageSuccess INTEGER DEFAULT 0''')
    
    c.execute('''CREATE INDEX IF NOT EXISTS idx_graph_cache_dashboard 
        ON graph_cache(dashboard_name, isImageSuccess);
     ''')
    c.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_exports (
                export_id TEXT PRIMARY KEY,
                user_id TEXT,
                dashboard_ids TEXT,
                export_name TEXT,
                export_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    c.execute("""
            CREATE TABLE IF NOT EXISTS dashboards (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT,
                charts TEXT,
                textboxes TEXT,
                datatables TEXT,
                statcards TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
    
    # Add document processing tables
    with connection_pool.get_connection() as conn:
        c = conn.cursor()
        
        # Table for document chunks and embeddings
        c.execute('''
            CREATE TABLE IF NOT EXISTS document_chunks (
                chunk_id TEXT PRIMARY KEY,
                file_id INTEGER,
                doc_id TEXT,
                chunk_type TEXT NOT NULL,
                content TEXT,
                content_compressed BLOB,
                embedding BLOB,
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (file_id) REFERENCES user_files(file_id) ON DELETE CASCADE
            )
        ''')
        
        # Table for document images
        c.execute('''
            CREATE TABLE IF NOT EXISTS document_images (
                image_id TEXT PRIMARY KEY,
                file_id INTEGER,
                doc_id TEXT,
                image_data BLOB,
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (file_id) REFERENCES user_files(file_id) ON DELETE CASCADE
            )
        ''')
        
        c.execute('''
    CREATE TABLE IF NOT EXISTS document_processing (
        process_id TEXT PRIMARY KEY,
        file_id INTEGER,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0,
        message TEXT,
        verbose_output TEXT,  -- New column for verbose output
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES user_files(file_id) ON DELETE CASCADE
    )
''')
        
        # Create indexes for efficient querying
        c.execute('CREATE INDEX IF NOT EXISTS idx_doc_chunks_file_id ON document_chunks(file_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_id ON document_chunks(doc_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_doc_chunks_type ON document_chunks(chunk_type)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_doc_images_file_id ON document_images(file_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_doc_processing_file_id ON document_processing(file_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_doc_processing_status ON document_processing(status)')
    # if conn:
    #     conn.commit()
    #     conn.close()

def init_stats_db():
    """Initialize the stats database structure"""
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    
    # Table for column-level statistics
    c.execute('''CREATE TABLE IF NOT EXISTS column_stats (
        stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL,
        column_name TEXT NOT NULL,
        data_type TEXT NOT NULL,
        basic_stats TEXT,
        distribution TEXT,
        shape_stats TEXT,
        outlier_stats TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(table_id, column_name)
    )''')
    
    # Table for dataset-level statistics
    c.execute('''CREATE TABLE IF NOT EXISTS dataset_stats (
        stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL UNIQUE,
        correlation_matrix TEXT,
        parallel_coords TEXT,
        violin_data TEXT,
        heatmap_data TEXT,
        scatter_matrix TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Table for tracking task status
    c.execute('''CREATE TABLE IF NOT EXISTS stats_tasks (
        task_id TEXT PRIMARY KEY,
        table_id TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0.0,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    )''')
    c.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_exports (
                export_id TEXT PRIMARY KEY,
                user_id TEXT,
                dashboard_ids TEXT,
                export_name TEXT,
                export_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    c.execute("""
            CREATE TABLE IF NOT EXISTS dashboards (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT,
                charts TEXT,
                textboxes TEXT,
                datatables TEXT,
                statcards TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
    conn.commit()
    conn.close()
    logging.info("Stats database initialized")
