import os
import pytest

# Set all required env vars BEFORE any app imports so pydantic-settings can load them
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-testing-only")
os.environ.setdefault("REFRESH_SECRET_KEY", "test-refresh-secret-key-for-pytest-testing")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SEED_ADMIN_EMAIL", "admin@entra-rbac.com")
os.environ.setdefault("SEED_ADMIN_PASSWORD", "AdminPass123!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.core.database import Base, get_db
from app.core.seeder import seed_database
from app.main import app

# Use SQLite for isolated, fast local tests (no PostgreSQL required)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_database(session)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
