import time
import uuid
import json
import random
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Primary emotions list matching the TS client
PRIMARY_EMOTIONS = [
  'Anger', 'Enraged', 'Jealous', 'Resentful', 'Exasperated', 'Irritable', 'Annoyed', 'Aggravated',
  'Disgust', 'Revolted', 'Disappointed', 'Nauseated', 'Disapproving', 'Contemptuous', 'Disrespectful', 'Scornful',
  'Fear', 'Terrified', 'Panicked', 'Horrified', 'Insecure', 'Nervous', 'Anxious', 'Worried',
  'Happiness', 'Content', 'Elated', 'Proud', 'Excited', 'Cheerful', 'Playful', 'Optimistic', 'Nostalgic',
  'Surprise', 'Startled', 'Amazed', 'Stunned', 'Moved', 'Confused', 'Disillusioned', 'Perplexed',
  'Sadness', 'Hurt', 'Mournful', 'Depressed', 'Lonely', 'Ashamed', 'Guilty', 'Regretful',
]

# Telemetry logs storage
run_logs = []

def add_log(chain_name, input_data, prompt_schema, rendered_prompt, raw_response, parsed_response, latency_ms, success, is_mock=False, error=None):
    run_logs.insert(0, {
        "id": f"run_{int(time.time() * 1000)}_{uuid.uuid4().hex[:5]}",
        "chainName": chain_name,
        "timestamp": int(time.time() * 1000),
        "input": input_data,
        "promptSchema": prompt_schema,
        "renderedPrompt": rendered_prompt,
        "rawResponse": raw_response,
        "parsedResponse": parsed_response,
        "latencyMs": latency_ms,
        "success": success,
        "isMock": is_mock,
        "error": error
    })
    if len(run_logs) > 30:
        run_logs.pop()

def get_logs():
    return run_logs

# Pydantic schemas for LangChain structured outputs
class EmotionMapping(BaseModel):
    emotion: str = Field(description="The mapped primary emotion matching one of the allowed vocabulary words")
    confidence: float = Field(description="Confidence score between 0 and 1 representing the similarity")

class Refinement(BaseModel):
    emotion: str = Field(description="The chosen single dominant emotion from the candidate list")

class Continuations(BaseModel):
    continuations: list[str] = Field(description="List of exactly 3 different story continuation options")

# Model getter helper
def get_model(api_key: str, model_name: str, max_tokens: int):
    return ChatGroq(
        api_key=api_key,
        model=model_name or "llama-3.3-70b-versatile",
        max_tokens=max_tokens,
        temperature=0.7
    )

# 1. Custom Emotion Mapping
async def map_custom_emotion(raw_label: str, enabled: bool, api_key: str, model_name: str) -> dict:
    start_time = time.time()
    prompt_schema = """System: You map a user-described emotion to the nearest entry in a fixed vocabulary.
Vocabulary: {vocabulary}
Human: Map this emotion: "{raw_label}" """
    
    vocabulary = ", ".join(PRIMARY_EMOTIONS)
    
    if not enabled or not api_key:
        # Mock behavior
        lowercase = raw_label.lower()
        mapped_to = "Melancholy"
        confidence = 0.4
        for emotion in PRIMARY_EMOTIONS:
            if emotion.lower() in lowercase:
                mapped_to = emotion
                confidence = 0.9
                break
                
        mock_result = {
            "rawLabel": raw_label,
            "mappedTo": mapped_to,
            "confidence": confidence,
            "source": "api"
        }
        
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Custom Emotion Mapping Chain",
            {"rawLabel": raw_label, "vocabularySize": len(PRIMARY_EMOTIONS)},
            prompt_schema,
            f"System: Vocabulary: {vocabulary}\nHuman: Map emotion: \"{raw_label}\"",
            json.dumps({"emotion": mapped_to, "confidence": confidence}),
            mock_result,
            latency,
            True,
            is_mock=True
        )
        return mock_result

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You map a user-described emotion to the nearest entry in a fixed vocabulary.\nVocabulary: {vocabulary}"),
            ("human", 'Map this emotion: "{raw_label}"')
        ])
        
        model = get_model(api_key, model_name, 1024)
        structured_model = model.with_structured_output(EmotionMapping, method="json_mode")
        chain = prompt | structured_model
        
        rendered_prompt = prompt.format(vocabulary=vocabulary, raw_label=raw_label)
        response = chain.invoke({"vocabulary": vocabulary, "raw_label": raw_label})
        
        matched = next((e for e in PRIMARY_EMOTIONS if e.lower() == response.emotion.lower()), "Melancholy")
        result = {
            "rawLabel": raw_label,
            "mappedTo": matched,
            "confidence": max(0.0, min(1.0, response.confidence or 0.5)),
            "source": "api"
        }
        
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Custom Emotion Mapping Chain",
            {"rawLabel": raw_label},
            prompt_schema,
            rendered_prompt,
            json.dumps({"emotion": response.emotion, "confidence": response.confidence}),
            result,
            latency,
            True
        )
        return result
        
    except Exception as err:
        fallback = {
            "rawLabel": raw_label,
            "mappedTo": "Melancholy",
            "confidence": 0.4,
            "source": "api"
        }
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Custom Emotion Mapping Chain (Error)",
            {"rawLabel": raw_label},
            prompt_schema,
            f"Error occurred: {str(err)}",
            "",
            fallback,
            latency,
            False,
            error=str(err)
        )
        return fallback

# 2. Creative Nudge
async def get_tier2_nudge(recent_text: str, dominant: str, enabled: bool, api_key: str, model_name: str) -> str | None:
    start_time = time.time()
    words = recent_text.strip().split()
    text_window = " ".join(words[-300:])
    
    prompt_schema = """System: You are a creative writing companion. Read the writing excerpt and provide one specific dramatic nudge. Focus on: {dominant}.
Human: Story context: {text_window}"""

    if not enabled or not api_key:
        mock_nudges = {
            "Happiness": [
                "What quiet doubt lingers behind this joy?",
                "How does the character show their happiness without saying a word?"
            ],
            "Sadness": [
                "What sensory detail in the room mirrors this sadness?",
                "Is there a small memory of comfort that makes this loss feel heavier?"
            ],
            "Fear": [
                "What physical sensation of panic starts to build in their chest?",
                "What sound from the darkness breaks the silence?"
            ],
            "default": [
                "What does the character notice in their immediate surroundings right now?",
                "What is the unspoken conflict that both characters are avoiding?"
            ]
        }
        nudges = mock_nudges.get(dominant, mock_nudges["default"])
        nudge = random.choice(nudges)
        
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Creative Nudge Chain",
            {"dominant": dominant, "textLength": len(text_window)},
            prompt_schema,
            f"System: Nudge writer for {dominant}\nHuman: context: {text_window[:50]}...",
            nudge,
            nudge,
            latency,
            True,
            is_mock=True
        )
        return nudge

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a thoughtful creative writing companion.\n"
                       "Read the excerpt and give ONE specific, gentle dramatic nudge — a single sentence or short question.\n"
                       "Do NOT continue the story. Do NOT give generic advice.\n"
                       "Focus on what is happening emotionally and what could shift, deepen, or complicate it.\n"
                       "The detected emotional tone is: {dominant}.\n"
                       "Respond with only the nudge, no preamble. The response must start with a capital letter and end with punctuation."),
            ("human", "{text_window}")
        ])
        
        model = get_model(api_key, model_name, 1024)
        chain = prompt | model | StrOutputParser()
        
        rendered_prompt = prompt.format(dominant=dominant, text_window=text_window)
        nudge = chain.invoke({"dominant": dominant, "text_window": text_window})
        
        nudge = nudge.strip()
        if nudge and nudge[-1] not in {".", "!", "?"}:
            nudge += "."
        if nudge:
            nudge = nudge[0].upper() + nudge[1:]
            
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Creative Nudge Chain",
            {"dominant": dominant},
            prompt_schema,
            rendered_prompt,
            nudge,
            nudge,
            latency,
            True
        )
        return nudge
        
    except Exception as err:
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Creative Nudge Chain (Error)",
            {"dominant": dominant},
            prompt_schema,
            f"Error occurred: {str(err)}",
            "",
            None,
            latency,
            False,
            error=str(err)
        )
        return None

# 3. Ambiguous Detection Refinement
async def refine_detection(recent_text: str, top_candidates: list[str], enabled: bool, api_key: str, model_name: str) -> str | None:
    start_time = time.time()
    words = recent_text.strip().split()
    text_window = " ".join(words[-150:])
    candidates = ", ".join(top_candidates[:4])
    
    prompt_schema = """System: Select exactly one emotional tone from this candidate list: {candidates}.
Human: Text: {text_window}"""

    if not enabled or not api_key:
        fallback = top_candidates[0] if top_candidates else "Happiness"
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Emotion Refinement Chain",
            {"candidates": candidates, "textLength": len(text_window)},
            prompt_schema,
            f"System: Select candidate from {candidates}\nHuman: context: {text_window[:50]}...",
            fallback,
            fallback,
            latency,
            True,
            is_mock=True
        )
        return fallback

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You identify the dominant emotional tone in a writing excerpt.\n"
                       "Choose EXACTLY ONE word from this list of candidates: {candidates}.\n"
                       "Do not explain your choice. Return it structured in JSON."),
            ("human", "{text_window}")
        ])
        
        model = get_model(api_key, model_name, 1024)
        structured_model = model.with_structured_output(Refinement, method="json_mode")
        chain = prompt | structured_model
        
        rendered_prompt = prompt.format(candidates=candidates, text_window=text_window)
        response = chain.invoke({"candidates": candidates, "text_window": text_window})
        
        matched = next((e for e in PRIMARY_EMOTIONS if e.lower() == response.emotion.lower()), None)
        final_emotion = matched or (top_candidates[0] if top_candidates else None)
        
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Emotion Refinement Chain",
            {"candidates": candidates},
            prompt_schema,
            rendered_prompt,
            json.dumps({"emotion": response.emotion}),
            final_emotion,
            latency,
            True
        )
        return final_emotion
        
    except Exception as err:
        fallback = top_candidates[0] if top_candidates else None
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Emotion Refinement Chain (Error)",
            {"candidates": candidates},
            prompt_schema,
            f"Error occurred: {str(err)}",
            "",
            fallback,
            latency,
            False,
            error=str(err)
        )
        return fallback

# 4. Session Fingerprint
async def generate_fingerprint(dominant_emotion: str, shift_count: int, word_count: int, distribution: dict, enabled: bool, api_key: str, model_name: str) -> str | None:
    start_time = time.time()
    sorted_dist = sorted(distribution.items(), key=lambda x: x[1] or 0, reverse=True)
    dist_summary = ", ".join([f"{e}: {pct}%" for e, pct in sorted_dist[:4]])
    
    prompt_schema = """System: Write a single evocative sentence capturing the emotional fingerprint of a writing session.
Human: dominant: {dominant_emotion}, shifts: {shift_count}, wordCount: {word_count}, distribution: {dist_summary}"""

    if not enabled or not api_key:
        mock_fingerprints = {
            "Happiness": "A story woven with luminous threads of joy and bright resolutions.",
            "Sadness": "A quiet path tracing through shadows of grief, leaving soft imprints of memory.",
            "Fear": "A narrative pulse quickened by tension and lingering in the dark spaces between words.",
            "default": "An intricate emotional tapestry tracing a journey through changing tides of creative prose."
        }
        fp = mock_fingerprints.get(dominant_emotion, mock_fingerprints["default"])
        
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Session Fingerprint Chain",
            {"dominant": dominant_emotion, "shifts": shift_count, "wordCount": word_count},
            prompt_schema,
            f"System: evocative sentence\nHuman: Stats: dominant={dominant_emotion}, shifts={shift_count}",
            fp,
            fp,
            latency,
            True,
            is_mock=True
        )
        return fp

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You write a single evocative sentence capturing the emotional fingerprint of a writing session.\n"
                       "It should feel like a description of the story's soul — poetic, precise, not generic.\n"
                       "Do not mention statistics. Write as though describing what the story feels like to read.\n"
                       "Respond with only the sentence, nothing else."),
            ("human", "Dominant emotion: {dominant_emotion}\n"
                      "Emotional shifts: {shift_count}\n"
                      "Word count: {word_count}\n"
                      "Emotion distribution: {dist_summary}")
        ])
        
        model = get_model(api_key, model_name, 1024)
        chain = prompt | model | StrOutputParser()
        
        rendered_prompt = prompt.format(
            dominant_emotion=dominant_emotion,
            shift_count=shift_count,
            word_count=word_count,
            dist_summary=dist_summary
        )
        fp = chain.invoke({
            "dominant_emotion": dominant_emotion,
            "shift_count": shift_count,
            "word_count": word_count,
            "dist_summary": dist_summary
        })
        
        fp = fp.strip()
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Session Fingerprint Chain",
            {"dominant": dominant_emotion},
            prompt_schema,
            rendered_prompt,
            fp,
            fp,
            latency,
            True
        )
        return fp
        
    except Exception as err:
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Session Fingerprint Chain (Error)",
            {"dominant": dominant_emotion},
            prompt_schema,
            f"Error occurred: {str(err)}",
            "",
            None,
            latency,
            False,
            error=str(err)
        )
        return None

# 5. Three Continuation Options
async def get_three_continuations(recent_text: str, dominant: str, story_context: str, enabled: bool, api_key: str, model_name: str) -> list[str] | None:
    start_time = time.time()
    words = recent_text.strip().split()
    text_window = " ".join(words[-200:])
    
    prompt_schema = """System: You are a creative writing assistant. Write exactly 3 brief continuation options (exactly 3 sentences each) for dominant: {dominant}.
Human: Context opening: {story_context}
Current text window: {text_window}"""

    if not enabled or not api_key:
        mock_continuations = {
            "Happiness": [
                "A warm wave of relief washed over them as they smiled. The worst was finally behind them. The sun began to break through the clouds, casting golden rays of light.",
                "They stepped out into the bright morning air, feeling lighter. The path ahead looked open and welcoming. A gentle breeze hummed through the green trees.",
                "A quiet smile tugged at the corners of their mouth. It felt like the house could breathe again. Voices and laughter echoed warmly from the next room."
            ],
            "Sadness": [
                "The silence of the room settled in, heavy and cold. They watched the rain slide slowly down the glass. Shadows stretched across the floor as day turned to dusk.",
                "Every corner of the house held a fragment of the past. They closed their eyes and let the quiet wash over them. There was nothing left but memory.",
                "The street outside was empty and grey under the winter sky. Some answers would never arrive. They folded the paper and put it away in silence."
            ],
            "Fear": [
                "A sudden creak echoed from the stairs. They reached for the handle, their fingers trembling in the dark. A shadow moved silently underneath the closed door.",
                "The shadows on the wall shifted and grew taller. They held their breath, waiting in the silence. The floorboards creaked under an unseen weight.",
                "A cold draft blew through the cracks, extinguishing the candle. In the dark, they froze in terror. A soft scratching sound began on the windowpane."
            ],
            "default": [
                "They hesitated for a moment before stepping forward. The light in the room shifted silently. An unfamiliar path stretched before them into the deep forest.",
                "The clock ticked steadily, measuring out the quiet tension. A shadow fell across the threshold. They slowly rose, prepared for whatever was to come next.",
                "They looked at the map, tracing lines that led nowhere. The road ahead was shrouded in thick mist. It was a leap into the unknown."
            ]
        }
        result = mock_continuations.get(dominant, mock_continuations["default"])
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Creative Continuations Chain",
            {"dominant": dominant, "textLength": len(text_window)},
            prompt_schema,
            f"System: 3 sentence continuation for {dominant}\nHuman: context: {text_window[:50]}...",
            json.dumps({"continuations": result}),
            result,
            latency,
            True,
            is_mock=True
        )
        return result

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a creative writing assistant. Based on the story excerpt, write exactly 3 brief continuation options.\n"
                       "Each option must be exactly 3 sentences long, written in the same voice and style as the existing text.\n"
                       "The dominant emotion is: {dominant}.\n"
                       "Story opening for context: {story_context}\n\n"
                       "Rules:\n"
                       "- Each option must feel like a natural continuation of the text.\n"
                       "- Each option must be exactly 3 sentences (3 lines format).\n"
                       "- The options must be different from each other in tone and direction.\n"
                       "- Write in the same prose style — do not use quotes, numbers, or labels.\n"
                       "- Return the results structured in JSON with a 'continuations' array containing exactly 3 strings."),
            ("human", "{text_window}")
        ])
        
        model = get_model(api_key, model_name, 2048)
        structured_model = model.with_structured_output(Continuations, method="json_mode")
        chain = prompt | structured_model
        
        rendered_prompt = prompt.format(
            dominant=dominant,
            story_context=story_context[:300],
            text_window=text_window
        )
        response = chain.invoke({
            "dominant": dominant,
            "story_context": story_context[:300],
            "text_window": text_window
        })
        
        options = response.continuations or []
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Creative Continuations Chain",
            {"dominant": dominant},
            prompt_schema,
            rendered_prompt,
            json.dumps({"continuations": options}),
            options,
            latency,
            True
        )
        return options
        
    except Exception as err:
        latency = int((time.time() - start_time) * 1000)
        add_log(
            "Creative Continuations Chain (Error)",
            {"dominant": dominant},
            prompt_schema,
            f"Error occurred: {str(err)}",
            "",
            None,
            latency,
            False,
            error=str(err)
        )
        return None

# 6. Image telemetry logger helper
def log_image_generation(recent_text: str, dominant: str, mood_hex: str, story_title: str, url: str):
    start_time = time.time()
    words = recent_text.strip().split()
    words_window = " ".join(words[-120:])
    safe_title = story_title[:80]
    prompt = (
        f"painterly literary illustration, \"{safe_title}\", "
        f"mood {dominant}, palette {mood_hex}, "
        f"{words_window[:280]}, "
        f"atmospheric literary art, no text, painterly"
    )
    
    add_log(
        "Pollinations Image Generation Pipeline",
        {"dominant": dominant, "moodHex": mood_hex, "storyTitle": story_title, "wordsCount": len(words)},
        "Static Prompt Template String",
        prompt,
        url,
        {"url": url},
        int((time.time() - start_time) * 1000),
        True
    )
