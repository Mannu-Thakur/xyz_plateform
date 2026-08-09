from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, status
from app.core.deps import get_current_user
from app.models.user import User
from app.services.resume_service import ResumeService

router = APIRouter()

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: str = Form("Software Engineer"),
    user_api_key: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes an uploaded resume PDF or text file using AI / dynamic resume parser.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024: # 10MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    result = await ResumeService.analyze(
        file_bytes=content,
        filename=file.filename,
        target_role=target_role,
        user_api_key=user_api_key
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=422,
            detail=result.get("error", "Failed to parse or analyze resume content.")
        )

    return result
