import io
import re
import json
import logging
from typing import Dict, Any, Optional, List
import httpx
from pypdf import PdfReader
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class ResumeService:
    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        """Extract plain text from uploaded file bytes (PDF, TXT, MD)."""
        filename_lower = filename.lower()
        
        if filename_lower.endswith(".pdf"):
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                extracted_pages = []
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_pages.append(text)
                extracted_text = "\n".join(extracted_pages).strip()
                if extracted_text:
                    return extracted_text
            except Exception as e:
                logger.warning(f"pypdf extraction failed: {e}")

        # Fallback to string decoding for plain text / md / docx text buffers
        try:
            return file_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

    @staticmethod
    async def analyze(
        file_bytes: bytes,
        filename: str,
        target_role: str = "Software Engineer",
        user_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        text = ResumeService.extract_text(file_bytes, filename)
        if not text or len(text) < 50:
            return {
                "success": False,
                "error": "Could not extract readable text from the uploaded file. Please ensure the PDF/text is not password-protected or scanned as image-only."
            }

        settings = get_settings()
        api_key = user_api_key or settings.OPENROUTER_API_KEY

        if api_key:
            try:
                return await ResumeService._analyze_with_llm(text, target_role, api_key)
            except Exception as e:
                logger.warning(f"LLM Resume Analysis failed: {e}. Falling back to dynamic rule engine.")

        # Fall back to dynamic text analysis engine (calculated directly from resume text)
        return ResumeService._analyze_dynamically(text, target_role, filename)

    @staticmethod
    async def _analyze_with_llm(text: str, target_role: str, api_key: str) -> Dict[str, Any]:
        prompt = f"""You are an expert Technical Recruiter and ATS (Applicant Tracking System) Specialist.
Analyze the following resume text for a target role of: "{target_role}".

Resume Text (first 4000 chars):
\"\"\"
{text[:4000]}
\"\"\"

Return ONLY valid JSON matching this exact structure:
{{
  "ats_score": number (0-100),
  "formatting_score": number (0-100),
  "impact_score": number (0-100),
  "skills_score": number (0-100),
  "detected_role": "string",
  "summary": "string overview of candidate profile",
  "identified_skills": ["string"],
  "missing_keywords": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "actionable_recommendations": ["string"],
  "bullet_improvements": [
    {{
      "original": "string",
      "improved": "string",
      "reason": "string"
    }}
  ]
}}"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://bugx.platform",
                    "X-Title": "bugX Resume Analyzer"
                },
                json={
                    "model": "meta-llama/llama-3.3-70b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            raw_content = data["choices"][0]["message"]["content"]
            
            # Extract JSON from response
            match = re.search(r"\{[\s\S]+\}", raw_content)
            if match:
                parsed = json.loads(match.group(0))
                parsed["success"] = True
                parsed["source"] = "ai_llm"
                return parsed

            raise ValueError("Failed to parse JSON response from LLM")

    @staticmethod
    def _analyze_dynamically(text: str, target_role: str, filename: str) -> Dict[str, Any]:
        """Dynamic text feature analyzer that evaluates real resume text against engineering patterns."""
        text_lower = text.lower()
        words = set(re.findall(r"\b[a-z0-9+#.-]+\b", text_lower))

        # Core technical skill dictionary
        tech_keywords = {
            "python", "javascript", "typescript", "react", "node", "express", "fastapi", "django",
            "flask", "c++", "cpp", "java", "sql", "postgresql", "mongodb", "redis", "docker",
            "kubernetes", "aws", "gcp", "azure", "git", "github", "ci/cd", "rest", "graphql",
            "html", "css", "tailwind", "redux", "system design", "algorithms", "data structures"
        }
        
        found_skills = sorted(list(tech_keywords.intersection(words)))
        
        # Action verbs
        action_verbs = {
            "developed", "built", "architected", "implemented", "optimized", "scaled", "led",
            "designed", "reduced", "increased", "refactored", "migrated", "automated", "created"
        }
        found_verbs = action_verbs.intersection(words)

        # Numbers / Metrics test
        has_metrics = len(re.findall(r"\b\d+([%kKmM]|\s*percent|\s*ms|\s*users)?\b", text)) > 2

        # Role-specific missing keyword targeting
        role_specific_keywords = {
            "frontend": {"react", "typescript", "javascript", "css", "html", "tailwind", "redux", "next.js"},
            "backend": {"python", "fastapi", "django", "node", "postgresql", "mongodb", "redis", "rest", "graphql", "docker"},
            "full": {"react", "typescript", "node", "postgresql", "python", "fastapi", "docker", "git", "rest"},
            "devops": {"docker", "kubernetes", "aws", "ci/cd", "gcp", "azure", "git", "linux"},
            "data": {"python", "sql", "postgresql", "mongodb", "pandas", "data structures", "algorithms"},
        }
        
        target_lower = target_role.lower()
        role_targets = set()
        for r_key, r_words in role_specific_keywords.items():
            if r_key in target_lower:
                role_targets.update(r_words)

        if not role_targets:
            role_targets = tech_keywords

        missing = sorted(list(role_targets - set(found_skills)))[:6]

        # ATS calculations based on candidate's actual extracted content
        skills_score = min(100, int((len(found_skills) / 12.0) * 100))
        impact_score = min(100, int((len(found_verbs) * 10) + (35 if has_metrics else 10)))
        formatting_score = 85 if len(text) > 350 else 60
        ats_score = int((skills_score * 0.4) + (impact_score * 0.4) + (formatting_score * 0.2))

        strengths = []
        if len(found_skills) >= 6:
            strengths.append(f"Strong technical skill set including {', '.join(found_skills[:4])}.")
        if has_metrics:
            strengths.append("Includes quantifiable metrics and achievements in experience descriptions.")
        if len(found_verbs) >= 3:
            strengths.append("Uses active technical verbs to describe project accomplishments.")
        if not strengths:
            strengths.append("Clear structural layout with recognizable technical experience sections.")

        weaknesses = []
        if len(found_skills) < 6:
            weaknesses.append("Low count of core technical keywords matching industry standards.")
        if not has_metrics:
            weaknesses.append("Lacks quantitative metrics (e.g. '% speedup', 'X users', 'Y% decrease').")
        if len(found_verbs) < 3:
            weaknesses.append("Bullet points could use stronger technical action verbs.")

        recommendations = [
            f"Add relevant keywords missing for {target_role}: {', '.join(missing[:4])}.",
            "Quantify bullet points with impact metrics (e.g. 'Improved API response time by 35%').",
            "Ensure technical skills are explicitly categorized into Languages, Frameworks, and Tools."
        ]

        # Extract real candidate bullet points / experience lines directly from uploaded text
        candidate_bullets = []
        raw_lines = [l.strip() for l in text.split('\n') if l.strip()]
        for line in raw_lines:
            cleaned = re.sub(r'^[•\-\*\u2022\u2023\u25e6\u2043\u2219]\s*', '', line).strip()
            if len(cleaned.split()) >= 5 and len(cleaned) <= 160:
                if not re.match(r'^(education|experience|projects|skills|summary|contact|name|email|phone|linkedin|github|software engineer|developer)', cleaned, re.I):
                    candidate_bullets.append(cleaned)

        bullet_improvements = []
        if candidate_bullets:
            for bullet in candidate_bullets[:2]:
                bullet_skills = [s.capitalize() for s in found_skills if s.lower() in bullet.lower()]
                skill_str = ", ".join(bullet_skills[:2]) if bullet_skills else (found_skills[0].capitalize() if found_skills else "software engineering")
                
                improved = f"Engineered and deployed scalable solutions leveraging {skill_str}, optimizing performance and reducing latency by 35%."
                bullet_improvements.append({
                    "original": bullet,
                    "improved": improved,
                    "reason": "Replaces passive/descriptive phrasing with active engineering verbs and quantified metrics."
                })

        if not bullet_improvements:
            bullet_improvements.append({
                "original": "Worked on backend APIs and database queries.",
                "improved": f"Architected high-throughput RESTful APIs with {found_skills[0].capitalize() if found_skills else 'FastAPI'} and PostgreSQL, reducing query latency by 35%.",
                "reason": "Replaces passive language with active verbs and quantifiable performance metrics."
            })

        return {
            "success": True,
            "source": "dynamic_parser",
            "ats_score": max(35, min(98, ats_score)),
            "formatting_score": formatting_score,
            "impact_score": impact_score,
            "skills_score": skills_score,
            "detected_role": target_role,
            "summary": f"Resume text parsed successfully ({len(text.split())} words extracted from {filename}). Identified {len(found_skills)} core technical skills.",
            "identified_skills": found_skills if found_skills else ["General Programming"],
            "missing_keywords": missing,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "actionable_recommendations": recommendations,
            "bullet_improvements": bullet_improvements
        }
