import os

# The service requires a database URL at import time. Tests use isolated SQLite
# sessions and never connect to the configured production database.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
