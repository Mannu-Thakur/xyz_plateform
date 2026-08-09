import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.services.resume_service import ResumeService

@pytest.mark.asyncio
async def test_resume_service_text_extraction():
    sample_text = "Experienced Software Engineer with Python, React, FastAPI, Docker, and PostgreSQL skills."
    file_bytes = sample_text.encode("utf-8")
    result = await ResumeService.analyze(file_bytes, "resume.txt", target_role="Software Engineer")
    
    assert result["success"] is True
    assert result["ats_score"] > 0
    assert "python" in result["identified_skills"]
    assert "react" in result["identified_skills"]
    assert "fastapi" in result["identified_skills"]

@pytest.mark.asyncio
async def test_resume_analyze_api_unauthorized():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/resume/analyze")
        # Should return 401 Unauthorized without auth header
        assert res.status_code == 401
