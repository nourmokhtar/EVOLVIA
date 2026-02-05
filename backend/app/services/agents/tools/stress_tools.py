import re
from langchain.tools import tool

@tool
def analyze_filler_words(transcript: str):
    """
    Counts common filler words in the transcript that indicate nervousness or lack of preparation.
    """
    filler_words = ["um", "uh", "err", "like", "actually", "basically", "you know", "i mean"]
    found_fillers = {}
    total_count = 0
    
    # Simple regex to find words regardless of case
    for word in filler_words:
        matches = re.findall(r'\b' + re.escape(word) + r'\b', transcript, re.IGNORECASE)
        if matches:
            count = len(matches)
            found_fillers[word] = count
            total_count += count
            
    # Calculate a "fluency score"
    word_count = len(transcript.split())
    filler_percentage = (total_count / max(1, word_count)) * 100
    
    # 0% fillers = 100 score, 10% fillers = 0 score (roughly)
    fluency_score = max(0, 100 - (filler_percentage * 10))

    return {
        "fluency_score": fluency_score,
        "total_filler_count": total_count,
        "filler_details": found_fillers,
        "filler_percentage": round(filler_percentage, 2),
        "status": "High usage of fillers" if filler_percentage > 5 else "Fluent delivery"
    }
