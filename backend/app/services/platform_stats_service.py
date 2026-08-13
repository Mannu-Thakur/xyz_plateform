import asyncio
import json
import re
import time
from typing import Any, Optional
import httpx

# In-memory cache: (platform, username) -> (timestamp, data)
_CACHE_TTL = 900  # 15 minutes
_stats_cache: dict[tuple[str, str], tuple[float, dict[str, Any]]] = {}


INVALID_HANDLES = {'profile', 'user', 'u', 'account', 'settings', 'edit', 'home', 'main', 'null', 'undefined'}


def extract_handle(input_val: Optional[str], platform: str) -> Optional[str]:
    """Extract username from full URL or handle string."""
    if not input_val:
        return None
    val = input_val.strip().rstrip('/')
    if not val:
        return None

    # Strip query parameters or trailing hashes
    val = re.sub(r'[\?#].*$', '', val).rstrip('/')

    parts = [p for p in val.split('/') if p]
    skip_keywords = {
        'http:', 'https:', 'www.leetcode.com', 'leetcode.com', 'u', 'user', 'profile',
        'www.codeforces.com', 'codeforces.com', 'geeksforgeeks.org', 'auth.geeksforgeeks.org',
        'www.geeksforgeeks.org', 'account', 'settings', 'edit', 'home', 'null', 'undefined'
    }

    extracted = None
    for part in reversed(parts):
        cleaned_part = part.lstrip('@').strip()
        if cleaned_part.lower() not in skip_keywords and not cleaned_part.startswith('http'):
            extracted = cleaned_part
            break

    if not extracted or '/' in extracted or extracted.lower() in INVALID_HANDLES:
        return None

    return extracted


async def fetch_leetcode_stats(handle: str) -> dict[str, Any]:
    cache_key = ("leetcode", handle.lower())
    now = time.time()
    if cache_key in _stats_cache:
        ts, cached = _stats_cache[cache_key]
        if now - ts < _CACHE_TTL:
            return cached

    url = "https://leetcode.com/graphql"
    query = """
    query userProblemsSolved($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
          starRating
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        contest {
          title
        }
      }
    }
    """

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://leetcode.com"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.post(url, json={"query": query, "variables": {"username": handle}}, headers=headers)
            if resp.status_code != 200:
                return {"connected": False, "error": f"LeetCode returned status {resp.status_code}"}

            data = resp.json()
            matched = data.get("data", {}).get("matchedUser")
            if not matched:
                return {"connected": False, "error": "User not found on LeetCode"}

            stats_list = matched.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
            solved_map = {item.get("difficulty"): item.get("count", 0) for item in stats_list}

            profile = matched.get("profile", {}) or {}

            lc_history_raw = data.get("data", {}).get("userContestRankingHistory", []) or []
            rating_history = []
            for item in lc_history_raw:
                if item.get("attended") and item.get("rating"):
                    rating_history.append({
                        "rating": int(round(item["rating"])),
                        "label": item.get("contest", {}).get("title", "")
                    })

            result = {
                "connected": True,
                "platform": "LeetCode",
                "username": handle,
                "profile_url": f"https://leetcode.com/u/{handle}/",
                "total_solved": solved_map.get("All", 0),
                "easy_solved": solved_map.get("Easy", 0),
                "medium_solved": solved_map.get("Medium", 0),
                "hard_solved": solved_map.get("Hard", 0),
                "ranking": profile.get("ranking", 0),
                "reputation": profile.get("reputation", 0),
                "star_rating": profile.get("starRating", 0),
                "rating_history": rating_history[-10:],
            }
            if result.get("connected"):
                _stats_cache[cache_key] = (now, result)
            return result
    except Exception as e:
        return {"connected": False, "error": f"Failed to connect: {str(e)}", "username": handle}


async def fetch_codeforces_stats(handle: str) -> dict[str, Any]:
    if not handle or handle.lower() in INVALID_HANDLES:
        return {"connected": False, "platform": "Codeforces"}

    cache_key = ("codeforces", handle.lower())
    now = time.time()
    if cache_key in _stats_cache:
        ts, cached = _stats_cache[cache_key]
        if now - ts < _CACHE_TTL:
            return cached

    url = f"https://codeforces.com/api/user.info?handles={handle}"
    status_url = f"https://codeforces.com/api/user.status?handle={handle}&from=1&count=500"
    rating_url = f"https://codeforces.com/api/user.rating?handle={handle}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return {"connected": False, "error": f"Codeforces returned status {resp.status_code}"}

            data = resp.json()
            if data.get("status") != "OK" or not data.get("result"):
                return {"connected": False, "error": "User not found on Codeforces"}

            user_info = data["result"][0]

            # Try to count unique solved problems
            solved_count = 0
            try:
                status_resp = await client.get(status_url, headers=headers)
                if status_resp.status_code == 200:
                    status_data = status_resp.json()
                    if status_data.get("status") == "OK":
                        solved_problems = set()
                        for sub in status_data.get("result", []):
                            if sub.get("verdict") == "OK" and "problem" in sub:
                                prob = sub["problem"]
                                prob_id = f"{prob.get('contestId', '')}{prob.get('index', '')}"
                                solved_problems.add(prob_id)
                        solved_count = len(solved_problems)
            except Exception:
                pass

            # Rating History
            cf_history = []
            try:
                rating_resp = await client.get(rating_url, headers=headers)
                if rating_resp.status_code == 200:
                    r_data = rating_resp.json()
                    if r_data.get("status") == "OK":
                        for r in r_data.get("result", []):
                            cf_history.append({
                                "rating": r.get("newRating", 0),
                                "label": r.get("contestName", "")
                            })
            except Exception:
                pass

            result = {
                "connected": True,
                "platform": "Codeforces",
                "username": handle,
                "profile_url": f"https://codeforces.com/profile/{handle}",
                "rating": user_info.get("rating", 0),
                "max_rating": user_info.get("maxRating", 0),
                "rank": user_info.get("rank", "unrated"),
                "max_rank": user_info.get("maxRank", "unrated"),
                "total_solved": solved_count,
                "avatar": user_info.get("titlePhoto", ""),
                "contribution": user_info.get("contribution", 0),
                "rating_history": cf_history[-10:],
            }
            _stats_cache[cache_key] = (now, result)
            return result
    except Exception as e:
        return {"connected": False, "error": f"Failed to connect: {str(e)}", "username": handle}


async def fetch_gfg_stats(handle: str) -> dict[str, Any]:
    if not handle or handle.lower() in INVALID_HANDLES:
        return {"connected": False, "platform": "GeeksForGeeks"}

    cache_key = ("gfg", handle.lower())
    now = time.time()
    if cache_key in _stats_cache:
        ts, cached = _stats_cache[cache_key]
        if now - ts < _CACHE_TTL:
            return cached

    url = f"https://www.geeksforgeeks.org/user/{handle}/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return {"connected": False, "error": f"GFG returned status {resp.status_code}"}

            html = resp.text

            # Try to extract NEXT_DATA JSON
            next_data_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
            total_solved = 0
            coding_score = 0
            monthly_score = 0
            institute_rank = "N/A"
            streak = 0

            if next_data_match:
                try:
                    data = json.loads(next_data_match.group(1))
                    page_props = data.get("props", {}).get("pageProps", {})
                    user_info = page_props.get("userInfo", {}) or page_props.get("userProfileData", {}) or {}

                    total_solved = (
                        user_info.get("total_problems_solved") or
                        user_info.get("total_solved") or
                        user_info.get("totalProblemsSolved", 0)
                    )
                    coding_score = (
                        user_info.get("score") or
                        user_info.get("coding_score") or
                        user_info.get("overall_score", 0)
                    )
                    monthly_score = user_info.get("monthly_score", 0)
                    streak = user_info.get("current_streak", 0)
                    institute_rank = user_info.get("institute_rank") or user_info.get("campus_rank", "N/A")
                except Exception:
                    pass

            # Fallback regex search on HTML if Next.js data not found
            if not total_solved:
                solved_match = re.search(r'Problems Solved</span>\s*<[^>]+>\s*(\d+)', html, re.IGNORECASE)
                if solved_match:
                    total_solved = int(solved_match.group(1))
                else:
                    solved_match = re.search(r'total_problems_solved["\']?\s*:\s*(\d+)', html)
                    if solved_match:
                        total_solved = int(solved_match.group(1))

            if not coding_score:
                score_match = re.search(r'Overall Coding Score</span>\s*<[^>]+>\s*(\d+)', html, re.IGNORECASE)
                if score_match:
                    coding_score = int(score_match.group(1))
                else:
                    score_match = re.search(r'coding_score["\']?\s*:\s*(\d+)', html)
                    if score_match:
                        coding_score = int(score_match.group(1))

            result = {
                "connected": True,
                "platform": "GeeksForGeeks",
                "username": handle,
                "profile_url": f"https://www.geeksforgeeks.org/user/{handle}/",
                "total_solved": int(total_solved or 0),
                "coding_score": int(coding_score or 0),
                "monthly_score": int(monthly_score or 0),
                "streak": int(streak or 0),
                "rank": str(institute_rank),
            }
            _stats_cache[cache_key] = (now, result)
            return result
    except Exception as e:
        return {"connected": False, "error": f"Failed to connect: {str(e)}", "username": handle}


async def fetch_user_platform_stats(user: Any) -> dict[str, Any]:
    """Fetch live stats for all connected platforms for a user."""
    lc_handle = extract_handle(getattr(user, "leetcode_username", None) or getattr(user, "leetcode_url", None), "leetcode")
    cf_handle = extract_handle(getattr(user, "codeforces_username", None) or getattr(user, "codeforces_url", None), "codeforces")
    gfg_handle = extract_handle(getattr(user, "gfg_username", None) or getattr(user, "gfg_url", None), "gfg")

    tasks = []

    if lc_handle:
        tasks.append(fetch_leetcode_stats(lc_handle))
    else:
        tasks.append(asyncio.sleep(0, result={"connected": False, "platform": "LeetCode"}))

    if cf_handle:
        tasks.append(fetch_codeforces_stats(cf_handle))
    else:
        tasks.append(asyncio.sleep(0, result={"connected": False, "platform": "Codeforces"}))

    if gfg_handle:
        tasks.append(fetch_gfg_stats(gfg_handle))
    else:
        tasks.append(asyncio.sleep(0, result={"connected": False, "platform": "GeeksForGeeks"}))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    def clean_res(res, platform_name):
        if isinstance(res, Exception):
            return {"connected": False, "platform": platform_name, "error": str(res)}
        return res

    return {
        "leetcode": clean_res(results[0], "LeetCode"),
        "codeforces": clean_res(results[1], "Codeforces"),
        "gfg": clean_res(results[2], "GeeksForGeeks"),
    }
