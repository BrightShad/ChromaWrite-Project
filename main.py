import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn

# Import local modules
from app.local_scorer import detect_emotion
from app.langchain_client import (
    map_custom_emotion,
    get_tier2_nudge,
    refine_detection,
    generate_fingerprint,
    get_three_continuations,
    log_image_generation,
    get_logs
)

# Load environment variables
load_dotenv()

app = FastAPI(title="ChromaWrite NLP Backend API")

# Configure CORS so React frontend can call it directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request & Response Data Models
class ConfigCheckResponse(BaseModel):
    enabled: bool
    apiKey: str | None

class CustomEmotionRequest(BaseModel):
    rawLabel: str
    apiKey: str | None = None
    model: str = "llama-3.3-70b-versatile"

class AnalyzeRequest(BaseModel):
    text: str
    wordOffset: int
    apiKey: str | None = None
    model: str = "llama-3.3-70b-versatile"
    apiEnabled: bool = False
    currentDominant: str | None = None

class NudgeRequest(BaseModel):
    recentText: str
    dominant: str
    apiKey: str | None = None
    model: str = "llama-3.3-70b-versatile"
    apiEnabled: bool = False

class ContinuationsRequest(BaseModel):
    recentText: str
    dominant: str
    storyContext: str
    apiKey: str | None = None
    model: str = "llama-3.3-70b-versatile"
    apiEnabled: bool = False

class FingerprintRequest(BaseModel):
    dominantEmotion: str
    shiftCount: int
    wordCount: int
    distribution: dict
    apiKey: str | None = None
    model: str = "llama-3.3-70b-versatile"
    apiEnabled: bool = False

class LogImageRequest(BaseModel):
    recentText: str
    dominant: str
    moodHex: str
    storyTitle: str
    url: str

# Endpoints

@app.get("/api/config", response_model=ConfigCheckResponse)
def get_config():
    # Read environment key
    env_key = os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    return {
        "enabled": bool(env_key),
        "apiKey": env_key
    }

@app.post("/api/custom-emotion")
async def api_custom_emotion(req: CustomEmotionRequest):
    # Resolve API Key
    api_key = req.apiKey or os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    enabled = bool(api_key)
    
    result = await map_custom_emotion(
        raw_label=req.rawLabel,
        enabled=enabled,
        api_key=api_key,
        model_name=req.model
    )
    return result

@app.post("/api/analyze")
async def api_analyze(req: AnalyzeRequest):
    api_key = req.apiKey or os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    enabled = req.apiEnabled and bool(api_key)
    
    # Run local keyword analysis
    result = detect_emotion(req.text, req.wordOffset, req.currentDominant)
    if not result:
        return None
        
    # If confidence is low and API is enabled, refine using LangChain refinement
    REFINE_THRESHOLD = 0.40
    if result["confidence"] < REFINE_THRESHOLD and enabled:
        top_candidates = [s["emotion"] for s in result["scores"][:4]]
        refined = await refine_detection(
            recent_text=req.text,
            top_candidates=top_candidates,
            enabled=enabled,
            api_key=api_key,
            model_name=req.model
        )
        if refined:
            # Overwrite with refined API result
            result["dominant"] = refined
            result["blendEmotions"] = [refined]
            result["confidence"] = 0.65  # Bump confidence for API refinement
            result["source"] = "api"
            
    return result

@app.post("/api/nudge")
async def api_nudge(req: NudgeRequest):
    api_key = req.apiKey or os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    enabled = req.apiEnabled and bool(api_key)
    
    nudge = await get_tier2_nudge(
        recent_text=req.recentText,
        dominant=req.dominant,
        enabled=enabled,
        api_key=api_key,
        model_name=req.model
    )
    return nudge

@app.post("/api/continuations")
async def api_continuations(req: ContinuationsRequest):
    api_key = req.apiKey or os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    enabled = req.apiEnabled and bool(api_key)
    
    options = await get_three_continuations(
        recent_text=req.recentText,
        dominant=req.dominant,
        story_context=req.storyContext,
        enabled=enabled,
        api_key=api_key,
        model_name=req.model
    )
    return options

@app.post("/api/fingerprint")
async def api_fingerprint(req: FingerprintRequest):
    api_key = req.apiKey or os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
    enabled = req.apiEnabled and bool(api_key)
    
    fp = await generate_fingerprint(
        dominant_emotion=req.dominantEmotion,
        shift_count=req.shiftCount,
        word_count=req.wordCount,
        distribution=req.distribution,
        enabled=enabled,
        api_key=api_key,
        model_name=req.model
    )
    return fp

@app.post("/api/log-image")
def api_log_image(req: LogImageRequest):
    log_image_generation(
        recent_text=req.recentText,
        dominant=req.dominant,
        mood_hex=req.moodHex,
        story_title=req.storyTitle,
        url=req.url
    )
    return {"status": "success"}

@app.get("/api/telemetry-logs")
def api_telemetry_logs():
    return get_logs()

if __name__ == "__main__":
    # Start uvicorn server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
