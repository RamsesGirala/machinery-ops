import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "machinery_ops.settings")
application = get_wsgi_application()
