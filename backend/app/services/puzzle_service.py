import os
import json
import random
import re
import textwrap
from typing import Dict, Any, List
from openai import OpenAI
import httpx
from PIL import Image, ImageDraw, ImageFont
import io
import base64

# ===============================
# CONFIG API ESPRIT
# ===============================
API_KEY = "sk-2b35d13282404b80b68cb9104273d435"
API_BASE = "https://tokenfactory.esprit.tn/api"

http_client = httpx.Client(verify=False)
client = OpenAI(
    api_key=API_KEY,
    base_url=API_BASE,
    http_client=http_client
)

MODEL = "hosted_vllm/Llama-3.1-70B-Instruct"

# ===============================
# SYSTEM PROMPT
# ===============================
SYSTEM_PROMPT = """
You are an expert in emotional psychology and personal development.
You analyze a user's QCM responses and infer:
- dimension (name of the dimension)
- score 0-100
- dominant emotion
- symbolic color
- symbolic shape (e.g., "gentle", "angry", "fragile", "dynamic")
- key advice

Reply strictly in JSON with double quotes.
"""

# ===============================
# QUESTIONS QCM - IN ENGLISH
# ===============================
QUESTIONS = {
    "Self-Confidence": [
        ("When criticized, I:", [
            "completely question myself",
            "listen but it affects me deeply",
            "take what's useful and ignore the rest",
            "remain calm and centered"
        ]),
        ("When making an important decision, I:", [
            "ask everyone's opinion first",
            "hesitate for a long time",
            "decide with caution after reflection",
            "decide with confidence"
        ]),
        ("Facing failure, I tend to:", [
            "lose all confidence",
            "feel deeply disappointed",
            "take time to recover",
            "learn and move forward quickly"
        ])
    ],
    "Emotional Management": [
        ("When overwhelmed, I:", [
            "lose control completely",
            "withdraw and isolate",
            "take time to breathe and wait",
            "understand what I'm feeling"
        ]),
        ("Facing my own anger, I:", [
            "explode or react instantly",
            "keep everything bottled inside",
            "walk away to cool down",
            "express it calmly and clearly"
        ]),
        ("When anxious, my first instinct is to:", [
            "panic and imagine the worst",
            "freeze and do nothing",
            "distract myself",
            "identify the source and address it"
        ])
    ],
    "Inner Communication": [
        ("When I make a mistake, I:", [
            "criticize myself very harshly",
            "feel deeply disappointed in myself",
            "try to learn from it",
            "talk to myself with kindness and understanding"
        ]),
        ("My self-talk is generally:", [
            "very critical and negative",
            "doubtful and uncertain",
            "neutral and factual",
            "supportive and encouraging"
        ]),
        ("When facing difficulties, I tell myself:", [
            "I can't do this",
            "I'm not good enough",
            "I'll figure this out",
            "I'm capable and strong"
        ])
    ],
    "Resilience": [
        ("After a setback, I:", [
            "give up completely",
            "doubt myself for a long time",
            "try again slowly and cautiously",
            "bounce back quickly"
        ]),
        ("When facing obstacles, I see them as:", [
            "proof I can't succeed",
            "barriers I can't overcome",
            "challenges to learn from",
            "opportunities to grow"
        ]),
        ("My recovery time after disappointment is:", [
            "very long, I dwell on it",
            "fairly long",
            "moderate",
            "short, I adapt quickly"
        ])
    ],
    "Mental Clarity": [
        ("When thinking about my future, I feel:", [
            "it's blurry and stressful",
            "afraid of the unknown",
            "I can see some possible paths",
            "aligned and clear about my direction"
        ]),
        ("My ability to focus and concentrate is:", [
            "very poor, I'm easily distracted",
            "weak, my mind wanders",
            "decent, with some distractions",
            "excellent, I'm very focused"
        ]),
        ("My thoughts and emotions are usually:", [
            "chaotic and overwhelming",
            "confused and unclear",
            "mostly organized",
            "clear and well-ordered"
        ])
    ],
    "Sociability": [
        ("In social gatherings, I usually:", [
            "stay in the corner or leave early",
            "stick to people I know well",
            "mingle occasionally with new people",
            "love meeting everyone and socializing"
        ]),
        ("Meeting new people makes me feel:", [
            "anxious and drained",
            "somewhat uncomfortable",
            "neutral or curious",
            "energized and excited"
        ]),
        ("My ideal weekend involves:", [
            "complete solitude to recharge",
            "a quiet activity with one person",
            "hanging out with a small group",
            "a big social event or gathering"
        ])
    ],
    "Expression of Emotions": [
        ("When I feel a strong emotion, I:", [
            "hide it completely from everyone",
            "try to suppress it quickly",
            "share it only with very close friends",
            "express it openly and naturally"
        ]),
        ("Expressing my feelings to others is:", [
            "terrifying and avoided at all costs",
            "difficult and rare for me",
            "manageable with some effort",
            "easy, natural, and liberating"
        ]),
        ("My face and body language usually:", [
            "reveal nothing of what I feel",
            "show only what I want to show",
            "give some hints about my state",
            "clearly express my inner emotional state"
        ])
    ],
    "Self-Compassion": [
        ("When I'm struggling, I treat myself:", [
            "with criticism and judgment",
            "with indifference",
            "with some kindness",
            "with deep compassion and understanding"
        ]),
        ("I believe I deserve:", [
            "suffering and punishment",
            "basic respect but not much more",
            "good things when I earn them",
            "goodness and happiness unconditionally"
        ]),
        ("My relationship with myself is:", [
            "very harsh and judgmental",
            "cold and distant",
            "neutral",
            "warm and supportive"
        ])
    ]
}

# ===============================
# ANALYSE LLM - INTELLIGENT SCORING
# ===============================
def analyze_qcm(responses: Dict[str, str]) -> Dict[str, Any]:
    """Analyze QCM responses with intelligent LLM-generated scores based on actual responses"""
    prompt = f"""
    You are an expert in emotional psychology. Analyze this user's QCM responses.

    The responses are indexed 0-3 (0=very low, 3=excellent).

    Responses:
    {json.dumps(responses, indent=2)}

    IMPORTANT: Generate INTELLIGENT SCORES based on the actual analysis of the responses, NOT predefined scores.

    For EACH dimension, analyze the responses and return STRICTLY in JSON:
    {{
      "Self-Confidence": {{
        "score": 75,
        "analysis": "Responses showing moderate confidence but some doubts remaining",
        "emotion": "optimistic",
        "advice": "Trust your gut feeling more often."
      }},
      "Emotional Management": {{
        "score": 45,
        "analysis": "Difficulties managing intense emotions",
        "emotion": "anxious",
        "advice": "Practice deep breathing exercises."
      }}
    }}

    Scoring rules:
    - 90-100: Radiant (Caribbean Green)
    - 80-89: Confident (Sky Blue)
    - 70-79: Serene (Soft Violet)
    - 60-69: Balanced (Vibrant Yellow)
    - 50-59: Neutral (Warm Orange)
    - 40-49: Concerned (Soft Red)
    - 30-39: Anxious (Red)
    - 20-29: Struggling (Deep Red)
    - 0-19: Distressed (Dark Pink)

    Return ONLY valid JSON, no additional text.
    """
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role":"system", "content":SYSTEM_PROMPT},
            {"role":"user","content":prompt}
        ],
        temperature=0.7
    )
    content = response.choices[0].message.content.strip()

    try:
        start = content.index("{")
        end = content.rindex("}") + 1
        json_text = content[start:end]
        data = json.loads(json_text)
        
        # Validate and clean data
        validated_data = {}
        for dimension, analysis in data.items():
            if isinstance(analysis, dict):
                # Ensure score is an int between 0-100
                score = int(analysis.get("score", 50))
                score = max(0, min(100, score))
                
                validated_data[dimension] = {
                    "score": score,
                    "analysis": analysis.get("analysis", ""),
                    "emotion": analysis.get("emotion", "neutral"),
                    "advice": analysis.get("advice", "")
                }
        
        print(f"DEBUG: Validated analysis: {json.dumps(validated_data, indent=2)}")
        return validated_data
    except (ValueError, json.JSONDecodeError) as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw content: {content}")
        return {}

def generate_global_report(responses: Dict[str, str]) -> str:
    """Generate a motivating personality report based on responses"""
    prompt = f"""
    Act as a kind life coach and expert in positive psychology.
    Write a personality analysis for this user based on their responses.

    User responses:
    {json.dumps(responses, indent=2)}

    Instructions:
    1. Start STRICTLY with the phrase "Your personality..."
    2. Adopt a motivating, warm, and non-judgmental tone.
    3. Highlight the strengths (even hidden ones) revealed by the responses.
    4. Suggest 1 or 2 gentle paths for growth.
    5. Be concise (max 150 words).
    6. Do not mention numerical scores, talk about trends and potentials.
    7. WRITE IN ENGLISH.

    Text only, no markdown, no titles.
    """
    
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a kind and supportive coach."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating report: {e}")
        return "Your personality is unique and constantly evolving. Keep exploring your strengths."

# ===============================
# COLOR AND EMOTION MAPPING
# ===============================
EMOTION_COLORS = {
    "joy": (255, 223, 0),           # Yellow
    "sadness": (65, 105, 225),      # Blue
    "anger": (220, 20, 60),         # Crimson
    "fear": (128, 0, 128),          # Purple
    "surprise": (255, 165, 0),      # Orange
    "disgust": (34, 139, 34),       # Forest Green
    "trust": (0, 128, 128),         # Teal
    "anticipation": (255, 192, 203),# Pink
    "neutral": (169, 169, 169)      # Gray
}

EMOTION_SHAPES = {
    "joy": "smile",
    "sadness": "sad",
    "anger": "angry",
    "fear": "fearful",
    "surprise": "surprised",
    "disgust": "disgusted",
    "trust": "confident",
    "anticipation": "hopeful",
    "neutral": "neutral"
}

# ===============================
# DRAWING PERSONALITY FACETS - BEAUTIFUL PUZZLE DESIGN
# ===============================

def get_emotion_from_score(score: int) -> tuple:
    """Generate emotion and color based on ACTUAL SCORE with MODERN VIBRANT PALETTE
    Returns (emotion_name, color_rgb)
    """
    # Modern Vibrant Palette (Aesthetic Red-to-Green)
    if score >= 90:
        return ("radiant", (0, 201, 167))    # Caribbean Green (Vibrant Teal-Green)
    elif score >= 80:
        return ("confident", (0, 191, 255))  # Deep Sky Blue (Bright Blue)
    elif score >= 70:
        return ("serene", (132, 94, 247))    # Soft Violet (Modern Purple)
    elif score >= 60:
        return ("balanced", (255, 212, 59))  # Vibrant Yellow (Optimistic)
    elif score >= 50:
        return ("neutral", (255, 146, 43))   # Warm Orange (Active)
    elif score >= 40:
        return ("concerned", (255, 107, 107)) # Soft Red (Concern)
    elif score >= 30:
        return ("anxious", (250, 82, 82))    # Red (Anxiety)
    elif score >= 20:
        return ("struggling", (201, 42, 42)) # Deep Red (Struggle)
    else:
        return ("distressed", (166, 30, 77)) # Dark Pink/Red (Distress)

def parse_emotion_color(color_str: str) -> tuple:
    """Parse color string from LLM (e.g., 'orange', '#FF5733', 'rgb(255, 87, 51)') to RGB tuple"""
    color_str = color_str.strip().lower()
    
    # Common color names
    colors = {
        'red': (220, 20, 60),
        'orange': (255, 140, 0),
        'yellow': (255, 215, 0),
        'green': (34, 139, 34),
        'blue': (30, 144, 255),
        'purple': (138, 43, 226),
        'pink': (255, 105, 180),
        'teal': (0, 128, 128),
        'cyan': (0, 206, 209),
        'gray': (128, 128, 128),
        'brown': (139, 69, 19),
        'indigo': (75, 0, 130),
        'violet': (238, 130, 238)
    }
    
    if color_str in colors:
        return colors[color_str]
    
    # Try hex format
    if color_str.startswith('#'):
        try:
            hex_str = color_str.lstrip('#')
            return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
        except:
            pass
    
    # Default to teal if parsing fails
    return (0, 128, 128)

def draw_beautiful_face(emotion: str, score: int, size: int = 140) -> Image.Image:
    """Draw a beautiful emoji-style face that REFLECTS THE ACTUAL SCORE
    Score determines the expression, not emotion strings
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Get color and emotion based on SCORE
    emotion_name, color = get_emotion_from_score(score)
    
    # Main face circle with gradient effect (simulated by darker outline)
    margin = 5
    face_bbox = [margin, margin, size - margin, size - margin]
    
    # Draw face with shadow effect
    shadow_offset = 3
    draw.ellipse([face_bbox[0] + shadow_offset, face_bbox[1] + shadow_offset, 
                  face_bbox[2] + shadow_offset, face_bbox[3] + shadow_offset], 
                 fill=(0, 0, 0, 80))
    
    # Main face color
    draw.ellipse(face_bbox, fill=color, outline=(40, 40, 40), width=3)
    
    # Highlight on face (to make it look 3D)
    highlight_size = size // 5
    highlight_x = size // 4
    highlight_y = size // 4
    draw.ellipse([highlight_x - highlight_size//2, highlight_y - highlight_size//2,
                  highlight_x + highlight_size//2, highlight_y + highlight_size//2],
                 fill=(255, 255, 255, 200))
    
    # Eye positions
    eye_y = size // 2 - 15
    left_eye_x = size // 3
    right_eye_x = 2 * size // 3
    eye_radius = 10
    
    # Draw eyes based on SCORE
    if score >= 90:  # Radiant - happy closed eyes
        draw.arc([left_eye_x - eye_radius, eye_y - eye_radius, left_eye_x + eye_radius, eye_y + eye_radius], 
                 180, 360, fill="black", width=2)
        draw.arc([right_eye_x - eye_radius, eye_y - eye_radius, right_eye_x + eye_radius, eye_y + eye_radius], 
                 180, 360, fill="black", width=2)
    elif score >= 80:  # Confident - open happy eyes
        draw.ellipse([left_eye_x - eye_radius, eye_y - eye_radius, left_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([left_eye_x - 5, eye_y - 3, left_eye_x + 5, eye_y + 3], fill="black")
        
        draw.ellipse([right_eye_x - eye_radius, eye_y - eye_radius, right_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([right_eye_x - 5, eye_y - 3, right_eye_x + 5, eye_y + 3], fill="black")
    elif score >= 60:  # Serene/Balanced - neutral open eyes
        draw.ellipse([left_eye_x - eye_radius, eye_y - eye_radius, left_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([left_eye_x - 4, eye_y - 2, left_eye_x + 4, eye_y + 2], fill="black")
        
        draw.ellipse([right_eye_x - eye_radius, eye_y - eye_radius, right_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([right_eye_x - 4, eye_y - 2, right_eye_x + 4, eye_y + 2], fill="black")
    elif score >= 40:  # Neutral/Concerned - slightly worried eyes
        draw.ellipse([left_eye_x - eye_radius, eye_y - eye_radius, left_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([left_eye_x - 5, eye_y - 4, left_eye_x + 5, eye_y], fill="black")
        # Worried brow
        draw.line([left_eye_x - 12, eye_y - 12, left_eye_x + 12, eye_y - 8], fill="black", width=2)
        
        draw.ellipse([right_eye_x - eye_radius, eye_y - eye_radius, right_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([right_eye_x - 5, eye_y - 4, right_eye_x + 5, eye_y], fill="black")
        # Worried brow
        draw.line([right_eye_x - 12, eye_y - 8, right_eye_x + 12, eye_y - 12], fill="black", width=2)
    else:  # Anxious/Struggling/Distressed - sad eyes with tears or frown
        draw.ellipse([left_eye_x - eye_radius, eye_y - eye_radius, left_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([left_eye_x - 5, eye_y + 2, left_eye_x + 5, eye_y + 8], fill="black")
        
        draw.ellipse([right_eye_x - eye_radius, eye_y - eye_radius, right_eye_x + eye_radius, eye_y + eye_radius], 
                     fill="white", outline="black", width=2)
        draw.ellipse([right_eye_x - 5, eye_y + 2, right_eye_x + 5, eye_y + 8], fill="black")
        
        if score < 20: # Tear for distressed
             draw.ellipse([left_eye_x - 3, eye_y + eye_radius + 8, left_eye_x + 3, eye_y + eye_radius + 14], 
                         fill=(100, 200, 255))
    
    # Mouth based on SCORE
    mouth_y = size * 2 // 3 + 10
    mouth_width = 35
    mouth_height = 25
    
    if score >= 90:  # Radiant - big smile
        draw.arc([size // 2 - mouth_width, mouth_y - mouth_height, size // 2 + mouth_width, mouth_y + mouth_height],
                 0, 180, fill="black", width=4)
    elif score >= 80:  # Confident - smile
        draw.arc([size // 2 - mouth_width, mouth_y - mouth_height + 5, size // 2 + mouth_width, mouth_y + mouth_height - 5],
                 0, 180, fill="black", width=3)
    elif score >= 60:  # Serene/Balanced - slight smile/neutral
        draw.arc([size // 2 - mouth_width, mouth_y - mouth_height + 10, size // 2 + mouth_width, mouth_y + mouth_height - 10],
                 0, 180, fill="black", width=2)
    elif score >= 40:  # Neutral/Concerned - straight line
        draw.line([size // 2 - mouth_width, mouth_y, size // 2 + mouth_width, mouth_y], fill="black", width=3)
    elif score >= 30:  # Anxious - slight frown
        draw.arc([size // 2 - mouth_width, mouth_y - mouth_height + 10, size // 2 + mouth_width, mouth_y + mouth_height - 10],
                 180, 360, fill="black", width=3)
    else:  # Struggling/Distressed - frown
        draw.arc([size // 2 - mouth_width, mouth_y - mouth_height, size // 2 + mouth_width, mouth_y + mouth_height],
                 180, 360, fill="black", width=4)
    
    return img

def draw_personality_facet(dimension: str, analysis: Dict[str, Any], size: int = 280) -> Image.Image:
    """Draw a beautiful personality puzzle piece reflecting ACTUAL SCORE with larger size"""
    img = Image.new("RGB", (size, size), (245, 240, 235))  # Wooden background
    draw = ImageDraw.Draw(img)
    
    # Wood texture borders (dark frame)
    border_width = 10
    draw.rectangle([0, 0, size - 1, size - 1], fill=(210, 180, 140), outline=(80, 60, 40), width=border_width)
    
    # Inner content area
    inner_border = border_width
    
    # Light inner background
    draw.rectangle([inner_border, inner_border, size - inner_border, size - inner_border], 
                   fill=(250, 245, 240))
    
    # Get analysis data
    score = int(analysis.get("score", 50))
    
    # Draw face - NOW BASED ON SCORE
    face_size = 150
    face_x = (size - face_size) // 2
    face_y = inner_border + 15
    
    # Draw face
    face_img = draw_beautiful_face("", score, face_size)  # emotion not needed
    img.paste(face_img, (face_x, face_y), face_img)
    
    # Fonts
    try:
        font_dim = ImageFont.truetype("arial.ttf", 16)
        font_score = ImageFont.truetype("arial.ttf", 14)
    except:
        font_dim = ImageFont.load_default()
        font_score = ImageFont.load_default()
    
    # Dimension name - Wrapped
    # Use textwrap to wrap at ~20 chars (adjust based on font width)
    lines = textwrap.wrap(dimension, width=22)
    
    # Calculate text height for vertical centering
    # Approximate height per line
    line_height = 18 
    total_text_height = len(lines) * line_height
    
    text_start_y = face_y + face_size + 10
    
    current_y = text_start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_dim)
        line_width = bbox[2] - bbox[0]
        draw.text(((size - line_width) // 2, current_y), line, fill=(40, 40, 40), font=font_dim)
        current_y += line_height
    
    # Score bar - Adjusted based on text lines
    score_bar_y = current_y + 10
    bar_width = 160
    bar_height = 16
    bar_x = (size - bar_width) // 2
    
    # Get color based on score
    emotion_name, color = get_emotion_from_score(score)
    
    # Background bar
    draw.rectangle([bar_x, score_bar_y, bar_x + bar_width, score_bar_y + bar_height], 
                   fill=(220, 220, 220), outline=(100, 100, 100), width=1)
    
    # Filled bar based on score
    filled_width = int(bar_width * score / 100)
    draw.rectangle([bar_x, score_bar_y, bar_x + filled_width, score_bar_y + bar_height], 
                   fill=color)
    
    # Score text - below bar
    score_text = f"{score}%"
    bbox = draw.textbbox((0, 0), score_text, font=font_score)
    score_width = bbox[2] - bbox[0]
    draw.text(((size - score_width) // 2, score_bar_y + bar_height + 5), score_text, fill=(80, 80, 80), font=font_score)
    
    return img

# ===============================
# DRAW REAL PUZZLE (Like the image)
# ===============================

def reassess_dimension_score(dimension: str, journal_entries: List[str], current_score: int) -> Dict[str, Any]:
    """
    Re-assess a dimension score based on user's journal entries from the improvement program.
    Returns: { "new_score": int, "analysis": str, "improvement": int }
    """
    prompt = f"""
    You are an expert psychological coach. The user has completed a 30-day improvement program for the dimension '{dimension}'.
    
    Previous Score: {current_score}/100
    
    Here are their daily journal reflectons:
    {json.dumps(journal_entries, indent=2)}
    
    Analyze their progress based on:
    1. Consistency of effort.
    2. Depth of reflection (from "Observer" phase to "Appearance" phase).
    3. Mindset shift (negative to positive/growth).
    
    Return STRICTLY JSON:
    {{
      "new_score": 0-100 (Be realistic but encouraging. If they did the work, score should go up),
      "improvement": (difference between new and old),
      "analysis": "Brief encouraging analysis of their journey."
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        # Clean markdown
        content = re.sub(r'```json', '', content)
        content = re.sub(r'```', '', content)
        
        return json.loads(content)
        
    except Exception as e:
        print(f"Error reassessing score: {e}")
        # Fallback: moderate improvement
        return {
            "new_score": min(100, current_score + 10),
            "improvement": 10,
            "analysis": "Great effort! Consistency is key."
        }

def draw_real_puzzle(data: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
    # ... (rest of the function remains the same, just inserting above it)
    """
    Draw a real personality puzzle like the image.
    Returns: (base64_image, highlight_metadata)
    """
    if not data:
        print("WARNING: Empty data passed to draw_real_puzzle")
        # Create empty placeholder
        placeholder_img = Image.new("RGB", (600, 300), (220, 210, 195))
        draw = ImageDraw.Draw(placeholder_img)
        draw.text((50, 130), "No personality data available", fill=(100, 100, 100))
        buffer = io.BytesIO()
        placeholder_img.save(buffer, format="PNG")
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{img_base64}", {}
    
    # 1. Identify which dimension has the lowest score to highlight it
    min_score = 101
    min_dim = None
    
    for dim, analysis in data.items():
        if isinstance(analysis, dict):
            s = int(analysis.get("score", 50))
            if s < min_score:
                min_score = s
                min_dim = dim
                
    # Determine grid layout based on number of items
    total_facets = len(data)
    if total_facets <= 4:
        cols = 2
        rows = 2
    elif total_facets <= 6:
        cols = 3
        rows = 2
    else:
        # For 8 dimensions found in the new data
        cols = 4
        rows = (total_facets + 3) // 4
    
    # Sizes
    base_size = 280
    highlight_size = 360  # Even Larger as requested
    
    # Grid cell size must accommodate the largest possible piece
    cell_size = highlight_size 
    padding = 20
    
    width = cols * (cell_size + padding) + padding
    height = rows * (cell_size + padding) + padding
    
    # Create canvas with light beige background (like wood)
    puzzle_img = Image.new("RGB", (width, height), (220, 210, 195))
    
    highlight_info = {}
    
    # Draw each personality facet
    facet_idx = 0
    for row in range(rows):
        for col in range(cols):
            if facet_idx >= total_facets:
                break
            
            # Get dimension and analysis
            dimension = list(data.keys())[facet_idx]
            analysis = data[dimension]
            
            if isinstance(analysis, dict) and "score" in analysis:
                try:
                    # Determine size for this piece
                    is_lowest = (dimension == min_dim)
                    current_size = highlight_size if is_lowest else base_size
                    
                    # Draw facet
                    facet_img = draw_personality_facet(dimension, analysis, current_size)
                    
                    # Calculate center position within the cell
                    cell_x = padding + col * (cell_size + padding)
                    cell_y = padding + row * (cell_size + padding)
                    
                    # Center offset
                    offset_x = (cell_size - current_size) // 2
                    offset_y = (cell_size - current_size) // 2
                    
                    x = cell_x + offset_x
                    y = cell_y + offset_y
                    
                    # Paste facet onto main image
                    puzzle_img.paste(facet_img, (x, y))
                    
                    # Save metadata for the highlighted piece
                    if is_lowest:
                        highlight_info = {
                            "dimension": dimension,
                            "x": x,
                            "y": y,
                            "width": current_size,
                            "height": current_size,
                            "total_width": width,
                            "total_height": height
                        }
                    
                except Exception as e:
                    print(f"Error drawing facet {dimension}: {e}")
            
            facet_idx += 1
    
    # Convert to base64
    buffer = io.BytesIO()
    puzzle_img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_base64}", highlight_info


def get_questions() -> Dict[str, Any]:
    """Return QCM questions"""
    return QUESTIONS