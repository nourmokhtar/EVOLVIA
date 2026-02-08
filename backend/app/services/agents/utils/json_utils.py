import json
import re
import logging

logger = logging.getLogger(__name__)

def parse_json_robustly(content: str) -> dict:
    """
    Attempts to extract and parse JSON from a string that might contain 
    additional text, markdown blocks, or minor formatting errors.
    """
    if not content or not isinstance(content, str):
        return {}

    # Clean the content
    content = content.strip()

    # 1. Try direct parsing first
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 2. Try to extract from markdown blocks
    # Looking for ```json ... ``` or just ``` ... ```
    json_blocks = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
    if json_blocks:
        for block in json_blocks:
            try:
                return json.loads(block.strip())
            except json.JSONDecodeError:
                continue

    # 3. Try regex to find the first '{' and last '}'
    match = re.search(r"(\{.*\})", content, re.DOTALL)
    if match:
        potential_json = match.group(1).strip()
        try:
            return json.loads(potential_json)
        except json.JSONDecodeError:
            # Try some common cleanup: unescaping quotes if needed
            # or fixing common trailing comma issues
            try:
                # Basic cleanup for trailing commas before closing braces/brackets
                cleaned = re.sub(r",\s*([\]}])", r"\1", potential_json)
                return json.loads(cleaned)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse extracted JSON: {e}\nContent: {potential_json[:200]}...")
    
    logger.error(f"Could not extract valid JSON from content: {content[:200]}...")
    return {}
