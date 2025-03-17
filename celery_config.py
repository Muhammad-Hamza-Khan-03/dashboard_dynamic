import os
from celery import Celery

# Celery configuration variables
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Create Celery app
celery_app = Celery('stats_worker', 
                   broker=CELERY_BROKER_URL,
                   backend=CELERY_RESULT_BACKEND)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,  # Prevent worker from prefetching too many tasks
    task_acks_late=True,  # Only acknowledge task after it's completed
    task_time_limit=3600,  # 1 hour timeout
    task_soft_time_limit=3000,  # 50 minutes soft timeout
    broker_transport_options={'visibility_timeout': 3600},
    result_expires=86400,  # Results expire after 1 day
    worker_max_tasks_per_child=200,  # Restart worker after 200 tasks to prevent memory leaks
)

# Include tasks
celery_app.autodiscover_tasks(['stats_worker'])