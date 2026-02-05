from langchain.tools import tool
import base64
import numpy as np
import cv2
import json
try:
    import mediapipe as mp
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False

@tool
def analyze_posture(video_frame_base64: str) -> dict:
    """
    Analyzes body language metrics from a base64 encoded video frame using MediaPipe.
    Focuses on Presenter cues: Head Lift (Projecting), Alignment, and Hand Visibility.
    """
    if not HAS_MEDIAPIPE:
        return {
            "error": "MediaPipe not installed",
            "posture_score": 50,
            "feedback": "Please install mediapipe: pip install mediapipe"
        }

    try:
        # Decode image
        img_data = base64.b64decode(video_frame_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Could not decode image", "posture_score": 0}

        # Initialize MediaPipe Pose
        mp_pose = mp.solutions.pose
        with mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2, # Higher complexity for better accuracy
            enable_segmentation=False,
            min_detection_confidence=0.5
        ) as pose:
            
            results = pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            
            if not results.pose_landmarks:
                return {
                    "error": "No person detected", 
                    "posture_score": 0,
                    "status": "No landmarks found"
                }

            lm = results.pose_landmarks.landmark
            
            # Helper to access coordinates
            def get_point(idx):
                return lm[idx]

            # 1. LANDMARKS
            nose = get_point(mp_pose.PoseLandmark.NOSE)
            l_shoulder = get_point(mp_pose.PoseLandmark.LEFT_SHOULDER)
            r_shoulder = get_point(mp_pose.PoseLandmark.RIGHT_SHOULDER)
            l_ear = get_point(mp_pose.PoseLandmark.LEFT_EAR)
            r_ear = get_point(mp_pose.PoseLandmark.RIGHT_EAR)
            l_wrist = get_point(mp_pose.PoseLandmark.LEFT_WRIST)
            r_wrist = get_point(mp_pose.PoseLandmark.RIGHT_WRIST)

            # 2. CALCULATIONS
            
            # A. Shoulder Width (Reference Unit)
            # We use this to normalize other distances so metrics work for any camera distance
            shoulder_width = abs(l_shoulder.x - r_shoulder.x)
            if shoulder_width == 0: shoulder_width = 0.001

            # B. Head Lift / Neck Visibility (The "Head Up" Metric)
            # Distance from Nose Y to Midpoint of Shoulders Y
            shoulder_mid_y = (l_shoulder.y + r_shoulder.y) / 2
            neck_height = shoulder_mid_y - nose.y # Positive means nose is above shoulders
            
            # Normalize by shoulder width
            # Typical correct posture: Neck height is roughly 0.3 - 0.6 of shoulder width
            # Looking down/Hunched: Ratio drops < 0.2
            neck_ratio = neck_height / shoulder_width
            
            # Adjusted Formula: More lenient. 0.25 is okay (50%), 0.4 is perfect (100%)
            # Maps 0.15 -> 0, 0.4 -> 100
            head_lift_score = min(100, max(0, (neck_ratio - 0.15) * 400))
            
            # C. Head Alignment (Rotation/Tilt)
            # Nose X should be centered between Ears X
            ear_mid_x = (l_ear.x + r_ear.x) / 2
            # Deviation from center
            head_yaw_error = abs(nose.x - ear_mid_x)
            # Adjusted Formula: Less sensitive.
            alignment_score = max(0, 100 - (head_yaw_error / shoulder_width * 200)) 

            # D. Shoulder Levelness
            shoulder_y_diff = abs(l_shoulder.y - r_shoulder.y)
            shoulder_symmetry_score = max(0, 100 - (shoulder_y_diff / shoulder_width * 200))

            # E. Hand Visibility (Presenter Energy)
            # Check if wrists are in frame (0 < x < 1, 0 < y < 1) and visible
            hands_visible = 0
            if (0.0 < l_wrist.x < 1.0 and 0.0 < l_wrist.y < 1.0): hands_visible += 1
            if (0.0 < r_wrist.x < 1.0 and 0.0 < r_wrist.y < 1.0): hands_visible += 1
            
            # 3. COMPOSITE SCORE
            # Presenters need: Good Alignment (20%), Head Up (50%), Level Shoulders (20%), Hands (10%)
            posture_score = (
                (alignment_score * 0.2) + 
                (head_lift_score * 0.5) + 
                (shoulder_symmetry_score * 0.2)
            )
            
            # Bonus for hands (up to 10 points)
            if hands_visible > 0:
                posture_score += (hands_visible * 5)
            
            posture_score = min(100, int(posture_score))

            metrics = {
                "head_lift_score": int(head_lift_score),
                "neck_ratio": round(neck_ratio, 2),
                "alignment_score": int(alignment_score),
                "shoulder_symmetry": int(shoulder_symmetry_score),
                "hands_visible": hands_visible
            }
            # Add print for debugging
            print(f"DEBUG METRICS: {metrics}")

            return {
                "posture_score": posture_score,
                "metrics": metrics,
                "status": "Analysis Complete"
            }

    except Exception as e:
        print(f"MediaPipe Analysis Error: {e}")
        return {
            "error": str(e),
            "posture_score": 50
        }
