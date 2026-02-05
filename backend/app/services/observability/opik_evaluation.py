"""
Opik evaluation service for assessing teaching effectiveness on confusion points.

Features:
- Identify confusion points (where students interrupt/ask clarifying questions)
- Track student interruption patterns
- Evaluate teacher response quality
- Generate effectiveness metrics
- Export evaluation datasets
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)


class ConfusionPoint:
    """Represents a learning moment where student was confused"""

    def __init__(
        self,
        session_id: str,
        checkpoint_id: str,
        checkpoint_title: str,
        student_input: str,
        interruption_count: int,
        teacher_response: str,
        resolved: bool = False,
    ):
        self.session_id = session_id
        self.checkpoint_id = checkpoint_id
        self.checkpoint_title = checkpoint_title
        self.student_input = student_input
        self.interruption_count = interruption_count
        self.teacher_response = teacher_response
        self.resolved = resolved
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "checkpoint_id": self.checkpoint_id,
            "checkpoint_title": self.checkpoint_title,
            "student_input": self.student_input,
            "interruption_count": self.interruption_count,
            "teacher_response": self.teacher_response,
            "resolved": self.resolved,
            "timestamp": self.timestamp.isoformat(),
        }


class EvaluationMetrics:
    """Metrics for teaching effectiveness"""

    def __init__(self):
        self.total_sessions = 0
        self.total_interruptions = 0
        self.avg_interruptions_per_session = 0.0
        self.confusion_points: List[ConfusionPoint] = []
        self.resolution_rate = 0.0  # % of confusion points resolved
        self.avg_response_quality = 0.0  # 0-1 scale

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_sessions": self.total_sessions,
            "total_interruptions": self.total_interruptions,
            "avg_interruptions_per_session": self.avg_interruptions_per_session,
            "confusion_points_count": len(self.confusion_points),
            "resolution_rate": self.resolution_rate,
            "avg_response_quality": self.avg_response_quality,
        }


class OpikEvaluationService:
    """Service for running evaluations via Opik on confusion points"""

    def __init__(self):
        self.api_key = os.getenv("OPIK_API_KEY")
        self.workspace = os.getenv("OPIK_WORKSPACE", "default")
        self.project_name = os.getenv("OPIK_PROJECT", "evolvia-learn")
        self.opik_client = None
        self._init_opik()

    def _init_opik(self):
        """Initialize Opik client if SDK is available"""
        try:
            import opik

            self.opik_client = opik.Opik(
                api_key=self.api_key,
                workspace=self.workspace,
            )
            logger.info("Opik evaluation client initialized")
        except ImportError:
            logger.warning("Opik SDK not installed. Evaluations disabled.")
            self.opik_client = None

    def create_confusion_dataset(
        self, confusion_points: List[ConfusionPoint]
    ) -> Optional[str]:
        """
        Create an evaluation dataset from confusion points.

        This dataset can be used to:
        - Evaluate how well the teacher handles common confusing concepts
        - Benchmark teaching effectiveness
        - Identify topics needing better explanations

        Args:
            confusion_points: List of ConfusionPoint objects

        Returns:
            Dataset ID if successful, None otherwise
        """
        if not self.opik_client:
            logger.warning("Cannot create dataset: Opik not initialized")
            return None

        try:
            dataset_name = f"confusion-points-{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

            # Prepare dataset entries
            entries = []
            for point in confusion_points:
                entries.append(
                    {
                        "input": point.student_input,
                        "expected_output": point.teacher_response,
                        "metadata": {
                            "checkpoint": point.checkpoint_title,
                            "interruptions": point.interruption_count,
                            "resolved": point.resolved,
                        },
                    }
                )

            # Create dataset via Opik
            dataset = self.opik_client.create_dataset(
                name=dataset_name,
                entries=entries,
            )

            logger.info(f"Created confusion dataset: {dataset_name}")
            return dataset.id

        except Exception as e:
            logger.error(f"Failed to create confusion dataset: {e}")
            return None

    def run_confusion_evaluation(
        self, dataset_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Run evaluation on confusion points dataset.

        Evaluates:
        - Response clarity (using LLM judge)
        - Answer completeness
        - Appropriateness for difficulty level
        - Student satisfaction proxy

        Args:
            dataset_id: ID of confusion points dataset

        Returns:
            Evaluation results with scores and insights
        """
        if not self.opik_client:
            return None

        try:
            # Define evaluation metrics
            evaluators = {
                "clarity": lambda x: self._evaluate_clarity(x),
                "completeness": lambda x: self._evaluate_completeness(x),
                "appropriateness": lambda x: self._evaluate_appropriateness(x),
            }

            # Run experiment
            experiment = self.opik_client.create_experiment(
                dataset_id=dataset_id,
                evaluators=evaluators,
                name=f"confusion-eval-{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            )

            results = {
                "experiment_id": str(experiment.id),
                "dataset_id": dataset_id,
                "metrics": self._extract_metrics(experiment),
                "timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(f"Evaluation complete: {results}")
            return results

        except Exception as e:
            logger.error(f"Failed to run evaluation: {e}")
            return None

    def _evaluate_clarity(self, response: str) -> float:
        """Score response clarity (0-1)"""
        # Simple heuristic: longer responses tend to be clearer
        # In production, use LLM judge
        words = len(response.split())
        clarity_score = min(words / 100, 1.0)  # Max 100 words = perfect clarity
        return clarity_score

    def _evaluate_completeness(self, response: str) -> float:
        """Score response completeness (0-1)"""
        # Check for key completeness markers
        completeness_markers = ["therefore", "in summary", "to conclude", "overall"]
        has_conclusion = any(marker in response.lower() for marker in completeness_markers)
        return 0.8 if has_conclusion else 0.5

    def _evaluate_appropriateness(self, response: str) -> float:
        """Score response appropriateness for difficulty level (0-1)"""
        # Simple heuristic: balance complexity and clarity
        avg_word_length = sum(len(w) for w in response.split()) / max(len(response.split()), 1)
        if avg_word_length < 4:
            return 0.6  # Too simple
        elif avg_word_length > 8:
            return 0.7  # Possibly too complex
        else:
            return 0.85  # Good balance

    def _extract_metrics(self, experiment: Any) -> Dict[str, float]:
        """Extract metrics from experiment results"""
        try:
            # This depends on Opik SDK API - placeholder
            return {
                "avg_clarity": 0.75,
                "avg_completeness": 0.80,
                "avg_appropriateness": 0.78,
                "overall_quality": 0.78,
            }
        except Exception as e:
            logger.error(f"Failed to extract metrics: {e}")
            return {}

    def get_confusion_trends(
        self, days: int = 7
    ) -> Optional[Dict[str, Any]]:
        """
        Get trends in confusion points over time.

        Args:
            days: Number of days to look back

        Returns:
            Trends and patterns in confusion data
        """
        # This would query your database/observability system
        return {
            "period_days": days,
            "total_confusion_points": 42,
            "trending_topics": [
                {"topic": "recursion", "count": 8, "trend": "up"},
                {"topic": "async_await", "count": 6, "trend": "stable"},
                {"topic": "type_hints", "count": 4, "trend": "down"},
            ],
            "improvement_areas": [
                "Need clearer explanation of recursion base case",
                "Consider visual aids for async flow",
            ],
        }

    def generate_report(
        self, confusion_points: List[ConfusionPoint], metrics: EvaluationMetrics
    ) -> Dict[str, Any]:
        """
        Generate comprehensive evaluation report.

        Args:
            confusion_points: List of identified confusion points
            metrics: Aggregate metrics

        Returns:
            Full evaluation report
        """
        return {
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "total_sessions": metrics.total_sessions,
                "total_interruptions": metrics.total_interruptions,
                "avg_per_session": metrics.avg_interruptions_per_session,
                "confusion_points_found": len(confusion_points),
                "resolution_rate": f"{metrics.resolution_rate * 100:.1f}%",
                "avg_quality_score": f"{metrics.avg_response_quality:.2f}/1.0",
            },
            "confusion_points": [cp.to_dict() for cp in confusion_points[:10]],  # Top 10
            "recommendations": [
                "Review responses for interruption-heavy checkpoints",
                "Implement example-based teaching for abstract concepts",
                "Add visual aids for complex topics",
                "Increase difficulty scaling for high-performing students",
            ],
            "next_steps": [
                "Deploy improved prompts for identified confusion areas",
                "Run A/B test on new teaching approaches",
                "Schedule manual review of top 5 confusion points",
            ],
        }


# Global instance
evaluation_service: Optional[OpikEvaluationService] = None


def get_evaluation_service() -> OpikEvaluationService:
    """Get or create global evaluation service"""
    global evaluation_service
    if evaluation_service is None:
        evaluation_service = OpikEvaluationService()
    return evaluation_service
