import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.core.vectorstore import DocumentChunk


@pytest.fixture
def client():
    """TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def mock_vectorstore_search():
    """Mock the vectorstore search method."""
    with patch("app.core.vectorstore.vectorstore.search") as mock_search:
        # Create mock document chunks
        chunks = [
            DocumentChunk(
                text="Albert Einstein was born in 1879 in Germany.",
                metadata={
                    "source": "test.pdf",
                    "source_type": "pdf",
                    "title": "Einstein Biography"
                }
            ),
            DocumentChunk(
                text="Einstein developed the theory of relativity.",
                metadata={
                    "source": "test.pdf",
                    "source_type": "pdf",
                    "title": "Einstein Biography"
                }
            )
        ]
        mock_search.return_value = chunks
        yield mock_search


@pytest.fixture
def mock_openrouter_api():
    """Mock the OpenRouter API call."""
    with patch("app.core.rag.requests.post") as mock_post:
        # Mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Albert Einstein was born in 1879 in Germany and developed the theory of relativity."
                    }
                }
            ]
        }
        mock_post.return_value = mock_response
        yield mock_post


def test_ask_endpoint(client, mock_vectorstore_search, mock_openrouter_api):
    """Test the /ask endpoint."""
    # Make a request to the ask endpoint
    response = client.post(
        "/ask",
        json={"question": "When was Einstein born?"}
    )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert len(data["sources"]) == 2
    
    # Verify the mock was called correctly
    mock_vectorstore_search.assert_called_once()
    mock_openrouter_api.assert_called_once()


def test_ask_endpoint_empty_question(client):
    """Test the /ask endpoint with an empty question."""
    # Make a request with an empty question
    response = client.post(
        "/ask",
        json={"question": ""}
    )
    
    # Check response
    assert response.status_code == 400


def test_ask_endpoint_no_results(client, mock_vectorstore_search, mock_openrouter_api):
    """Test the /ask endpoint with no search results."""
    # Mock empty results
    mock_vectorstore_search.return_value = []
    
    # Make a request
    response = client.post(
        "/ask",
        json={"question": "When was Einstein born?"}
    )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert len(data["sources"]) == 0
    
    # The API shouldn't be called if there are no results
    mock_openrouter_api.assert_not_called()
