"""Test Postgres connectivity using project settings.

Run locally after installing requirements and setting .env appropriately.

Usage:
    python scripts/test_db_connections.py
"""
import sys
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings


def test_postgres():
    url = settings.POST_DATABASE_URL
    print(f"Testing Postgres URL: {url}")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("Postgres: OK")
            return True
    except SQLAlchemyError as e:
        print("Postgres: Connection failed:", e, file=sys.stderr)
        return False
    except Exception as e:
        print("Postgres: Unexpected error:", e, file=sys.stderr)
        return False


def main():
    ok_pg = test_postgres()
    if ok_pg:
        print("Postgres check passed")
        sys.exit(0)
    else:
        print("Postgres check failed", file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
