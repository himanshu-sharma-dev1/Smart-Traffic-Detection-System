import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app, get_vision_client_dep
from backend.database import Base, get_db
from unittest.mock import MagicMock, patch

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def test_client(db_session):
    def override_get_db():
        yield db_session

    def override_get_vision_client_dep():
        return MagicMock()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_vision_client_dep] = override_get_vision_client_dep

    client = TestClient(app)
    yield client

    del app.dependency_overrides[get_db]
    del app.dependency_overrides[get_vision_client_dep]

@pytest.fixture
def mock_detect_traffic_signs():
    with patch('vision_service.detect_traffic_signs') as mock:
        yield mock
