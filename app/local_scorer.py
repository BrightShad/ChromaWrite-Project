import re

# Keyword Dictionary: [keyword, weight]
KEYWORDS = {
    "Anger": [
        ["anger", 4], ["angry", 3], ["rage", 3], ["fury", 3], ["furious", 3], ["mad", 3], ["hate", 3], ["hostil", 3], ["bitter", 2], ["outrage", 2]
    ],
    "Enraged": [
        ["enrag", 2], ["seethe", 2], ["boil", 2]
    ],
    "Jealous": [
        ["jealous", 2], ["envy", 2]
    ],
    "Resentful": [
        ["resent", 2], ["spite", 2], ["grudge", 2]
    ],
    "Exasperated": [
        ["exasperat", 2], ["weary", 2]
    ],
    "Irritable": [
        ["irritab", 3], ["cranky", 3]
    ],
    "Annoyed": [
        ["annoy", 3], ["bother", 3], ["pest", 2]
    ],
    "Aggravated": [
        ["aggravat", 2], ["frustrat", 3]
    ],
    "Disgust": [
        ["disgust", 4], ["sick", 3], ["gross", 3], ["foul", 2], ["distaste", 2], ["cringe", 3]
    ],
    "Revolted": [
        ["revolt", 2], ["revulsion", 3], ["appall", 2]
    ],
    "Disappointed": [
        ["disappoint", 3], ["let down", 2], ["dismay", 2]
    ],
    "Nauseated": [
        ["nauseat", 2], ["queasy", 2], ["gag", 2]
    ],
    "Disapproving": [
        ["disapprov", 2], ["frown", 2], ["judge", 3]
    ],
    "Contemptuous": [
        ["contempt", 2], ["loath", 2]
    ],
    "Disrespectful": [
        ["disrespect", 3], ["mock", 2]
    ],
    "Scornful": [
        ["scorn", 3], ["sneer", 3]
    ],
    "Fear": [
        ["fear", 4], ["afraid", 4], ["scared", 4], ["threat", 3], ["danger", 2]
    ],
    "Terrified": [
        ["terrifi", 2], ["fright", 2], ["petrifi", 2]
    ],
    "Panicked": [
        ["panic", 3], ["frantic", 3]
    ],
    "Horrified": [
        ["horrif", 2], ["horror", 2]
    ],
    "Insecure": [
        ["insecure", 2], ["doubt", 3], ["unsure", 3]
    ],
    "Nervous": [
        ["nervous", 3], ["trembl", 3], ["shak", 3], ["jitter", 2]
    ],
    "Anxious": [
        ["anxious", 3], ["tension", 3], ["stress", 2]
    ],
    "Worried": [
        ["worried", 3], ["worry", 2]
    ],
    "Happiness": [
        ["happ", 4], ["joy", 4], ["smile", 3], ["laugh", 3], ["glad", 2], ["peace", 2], ["warm", 2], ["bliss", 3]
    ],
    "Content": [
        ["content", 2], ["satis", 3], ["peaceful", 2]
    ],
    "Elated": [
        ["elat", 3], ["euphori", 3], ["fly", 3]
    ],
    "Proud": [
        ["proud", 3], ["pride", 3], ["honor", 2]
    ],
    "Excited": [
        ["excit", 3], ["thrill", 3], ["pump", 3]
    ],
    "Cheerful": [
        ["cheerful", 2], ["cheer", 2], ["bright", 3]
    ],
    "Playful": [
        ["playful", 2], ["fun", 2], ["joke", 3]
    ],
    "Optimistic": [
        ["optimistic", 3], ["hopeful", 3], ["bright", 3]
    ],
    "Nostalgic": [
        ["nostalgi", 2], ["memory", 2], ["past", 3], ["reminisc", 3]
    ],
    "Surprise": [
        ["surpris", 4], ["sudden", 3], ["unexpected", 3], ["what", 3]
    ],
    "Startled": [
        ["startle", 3], ["jump", 3], ["jolt", 2]
    ],
    "Amazed": [
        ["amaz", 2], ["astound", 2], ["wonder", 2]
    ],
    "Stunned": [
        ["stun", 3], ["dumbfound", 2], ["speechless", 3]
    ],
    "Moved": [
        ["moved", 2], ["touch", 2]
    ],
    "Confused": [
        ["confus", 2], ["baffle", 2]
    ],
    "Disillusioned": [
        ["disillusion", 3], ["cynical", 2]
    ],
    "Perplexed": [
        ["perplex", 3], ["puzzle", 2]
    ],
    "Sadness": [
        ["sad", 4], ["sadness", 4], ["cry", 3], ["tear", 3], ["weep", 2], ["sorrow", 3], ["loss", 2], ["lost", 2], ["gloom", 2]
    ],
    "Hurt": [
        ["hurt", 2], ["pain", 2], ["ache", 2], ["wound", 3]
    ],
    "Mournful": [
        ["mourn", 2], ["grief", 2], ["tragic", 3]
    ],
    "Depressed": [
        ["depress", 2], ["despair", 3], ["heavy", 2]
    ],
    "Lonely": [
        ["lonely", 3], ["alone", 2], ["isolat", 3]
    ],
    "Ashamed": [
        ["ashamed", 3], ["shame", 2], ["embarrass", 3]
    ],
    "Guilty": [
        ["guilt", 3], ["fault", 3], ["blame", 2]
    ],
    "Regretful": [
        ["regret", 3], ["wish", 3]
    ],
}

NEGATION_WORDS = {
    "not", "never", "no", "without", "lack", "none",
    "hardly", "barely", "n't", "no longer", "nothing"
}

CONFLICT_THRESHOLD = 20
BLEND_MIN_SCORE = 15
CYCLE_WORDS = 15

def tokenise(text: str) -> list[str]:
    # Replace em-dashes and strip punctuation, keeping words lowercase
    cleaned = text.lower()
    cleaned = cleaned.replace("—", " ").replace("–", " ")
    cleaned = re.sub(r"[^\w\s']", " ", cleaned)
    return [w for w in cleaned.split() if w]

def is_negated(tokens: list[str], match_index: int) -> bool:
    start = max(0, match_index - 3)
    window = tokens[start:match_index]
    return any(t in NEGATION_WORDS for t in window)

def score_text(tokens: list[str]) -> dict[str, int]:
    scores = {emotion: 0 for emotion in KEYWORDS}
    joined = " ".join(tokens)

    for emotion, pairs in KEYWORDS.items():
        for keyword, weight in pairs:
            search_from = 0
            while True:
                idx = joined.find(keyword, search_from)
                if idx == -1:
                    break
                
                # Estimate token index by splitting substring
                tokens_before = len(joined[:idx].split())
                if not is_negated(tokens, tokens_before):
                    scores[emotion] += weight
                
                search_from = idx + len(keyword)
                
    return scores

def normalise(raw: dict[str, int]) -> list[dict]:
    values = list(raw.values())
    max_val = max(values) if values else 0
    max_val = max(max_val, 1)

    normalized = []
    for emotion, score in raw.items():
        score_norm = round((score / max_val) * 100)
        normalized.append({
            "emotion": emotion,
            "score": score_norm,
            "confidence": score / max_val
        })
    
    # Sort descending
    normalized.sort(key=lambda x: x["score"], reverse=True)
    return normalized

def detect_emotion(text: str, word_offset: int, current_dominant: str | None = None) -> dict | None:
    tokens = tokenise(text)
    if len(tokens) < 5:
        return None

    # Slice windows: 20 tokens for initial check, 40 tokens to confirm
    tokens_20 = tokens[-20:]
    tokens_40 = tokens[-40:] if len(tokens) >= 40 else tokens

    # Score windows
    raw_20 = score_text(tokens_20)
    scores_20 = normalise(raw_20)
    
    raw_40 = score_text(tokens_40)
    scores_40 = normalise(raw_40)

    # If 20-word window has no keywords, do not rubber-band back to full history.
    # Keep the current dominant emotion but desaturate it with low confidence.
    dominant_20 = scores_20[0]
    if dominant_20["score"] == 0:
        if current_dominant and current_dominant.lower() != "neutral":
            return {
                "dominant": current_dominant,
                "scores": [{"emotion": current_dominant, "score": 20, "confidence": 0.2}],
                "isConflict": False,
                "blendEmotions": [current_dominant],
                "confidence": 0.2,
                "wordOffset": word_offset,
                "source": "local",
                "assistantState": {
                    "status": "stable",
                    "message": None,
                    "candidateEmotion": None
                }
            }
        else:
            return None

    dom_20_emotion = dominant_20["emotion"]
    
    # Check for conflict in the primary (20-word) window
    above_threshold = [s for s in scores_20 if s["score"] >= BLEND_MIN_SCORE]
    is_conflict = len(above_threshold) >= 2 and (above_threshold[0]["score"] - above_threshold[1]["score"]) <= CONFLICT_THRESHOLD

    blend_emotions = (
        [s["emotion"] for s in above_threshold[:3]]
        if is_conflict
        else [dom_20_emotion]
    )

    # Verification Logic
    assistant_status = "stable"
    assistant_message = None
    final_dominant = dom_20_emotion
    final_confidence = dominant_20["confidence"]
    final_scores = scores_20

    if is_conflict:
        assistant_status = "transition"
        assistant_message = "Noticing changes... Emotions are blending."

    if current_dominant and current_dominant.lower() != "neutral" and dom_20_emotion != current_dominant:
        # Potential change detected!
        # Confirm strength in 40-word window
        score_in_40 = next((s["score"] for s in scores_40 if s["emotion"] == dom_20_emotion), 0)
        raw_score_in_40 = raw_40.get(dom_20_emotion, 0)

        # Confirm if the emotion is stable and strong in the wider context
        # Or if the story is too short for wider context checks
        is_confirmed = False
        if len(tokens) < 30:
            is_confirmed = True
        elif score_in_40 >= 25 or raw_score_in_40 >= 3:
            is_confirmed = True

        if is_confirmed:
            final_dominant = dom_20_emotion
            assistant_status = "stable"
            assistant_message = f"Confirmed shift to {dom_20_emotion}."
        else:
            # Shift unconfirmed - hold on previous dominant emotion
            final_dominant = current_dominant
            
            # Ensure both current_dominant and dom_20_emotion have positive scores in final_scores
            # so the frontend blends them immediately and beautifully
            prev_score_entry = next((s for s in scores_20 if s["emotion"] == current_dominant), None)
            if prev_score_entry:
                prev_score_entry["score"] = max(prev_score_entry["score"], 50)
                final_confidence = prev_score_entry["confidence"]
            else:
                scores_20.append({
                    "emotion": current_dominant,
                    "score": 50,
                    "confidence": 0.5
                })
                scores_20.sort(key=lambda x: x["score"], reverse=True)
                final_confidence = 0.5
            
            # Mix them immediately in blendEmotions
            blend_emotions = [current_dominant, dom_20_emotion]
            is_conflict = True
            final_scores = scores_20
            
            assistant_status = "transition"
            
            # Map candidate emotion to assistant questions
            questions = {
                "Anger": ["Are we heading for anger?", "Is the story taking a hostile turn?", "Is a conflict brewing?"],
                "Disgust": ["Is the story turning towards disapproval?", "Are we heading for disappointment?", "Is something repulsive ahead?"],
                "Fear": ["Are we heading for fear?", "Is a sense of dread building?", "Is the story taking a dark turn?"],
                "Happiness": ["Is the tone brightening up?", "Are we heading for happiness?", "Is relief on the horizon?"],
                "Surprise": ["Is a twist coming?", "Is the story taking a sudden turn?", "Is something unexpected ahead?"],
                "Sadness": ["Are we heading for grief?", "Is the story taking a sorrowful turn?", "Is loss approaching?"],
            }
            
            # Map sub-emotions to primary categories
            primary_mapped = "Sadness"
            # Anger check
            if dom_20_emotion in ['Anger', 'Enraged', 'Jealous', 'Resentful', 'Exasperated', 'Irritable', 'Annoyed', 'Aggravated']:
                primary_mapped = "Anger"
            elif dom_20_emotion in ['Disgust', 'Revolted', 'Disappointed', 'Nauseated', 'Disapproving', 'Contemptuous', 'Disrespectful', 'Scornful']:
                primary_mapped = "Disgust"
            elif dom_20_emotion in ['Fear', 'Terrified', 'Panicked', 'Horrified', 'Insecure', 'Nervous', 'Anxious', 'Worried']:
                primary_mapped = "Fear"
            elif dom_20_emotion in ['Happiness', 'Content', 'Elated', 'Proud', 'Excited', 'Cheerful', 'Playful', 'Optimistic', 'Nostalgic']:
                primary_mapped = "Happiness"
            elif dom_20_emotion in ['Surprise', 'Startled', 'Amazed', 'Stunned', 'Moved', 'Confused', 'Disillusioned', 'Perplexed']:
                primary_mapped = "Surprise"
            
            q_list = questions.get(primary_mapped, ["Is the story taking a turn?"])
            q_idx = (word_offset // 20) % len(q_list)
            assistant_message = f"Noticing changes... {q_list[q_idx]}"

    return {
        "dominant": final_dominant,
        "scores": final_scores,
        "isConflict": is_conflict,
        "blendEmotions": blend_emotions,
        "confidence": final_confidence,
        "wordOffset": word_offset,
        "source": "local",
        "assistantState": {
            "status": assistant_status,
            "message": assistant_message,
            "candidateEmotion": dom_20_emotion if assistant_status == "transition" else None
        }
    }
