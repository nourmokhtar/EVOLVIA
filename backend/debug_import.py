import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

print(f"CWD: {os.getcwd()}")
print(f"Sys Path: {sys.path}")

try:
    import app.models.learning_session
    print("SUCCESS: app.models.learning_session imported")
except ImportError as e:
    print(f"FAILURE: {e}")

try:
    from app.models.learning_session import LearningSessionModel
    print("SUCCESS: LearningSessionModel imported")
except ImportError as e:
    print(f"FAILURE: {e}")
