"""
Router for evaluation endpoints - allows running Opik evaluations and viewing results.

Endpoints:
- POST /api/v1/evaluations/confusion-dataset - Create dataset from confusion points
- POST /api/v1/evaluations/run - Run evaluation
- GET /api/v1/evaluations/results/{evaluation_id} - Get evaluation results
- GET /api/v1/evaluations/trends - Get confusion trends
- GET /api/v1/evaluations/report - Get comprehensive report
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import logging

from app.services.observability.opik_evaluation import (
    get_evaluation_service,
    ConfusionPoint,
    EvaluationMetrics,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["evaluations"])


@router.post("/confusion-dataset")
async def create_confusion_dataset(
    confusion_points: List[dict],
):
    """
    Create a confusion points evaluation dataset.

    Args:
        confusion_points: List of confusion point objects

    Returns:
        Dataset ID and metadata
    """
    try:
        service = get_evaluation_service()

        # Convert dicts to ConfusionPoint objects
        points = [
            ConfusionPoint(
                session_id=cp["session_id"],
                checkpoint_id=cp["checkpoint_id"],
                checkpoint_title=cp["checkpoint_title"],
                student_input=cp["student_input"],
                interruption_count=cp["interruption_count"],
                teacher_response=cp["teacher_response"],
                resolved=cp.get("resolved", False),
            )
            for cp in confusion_points
        ]

        dataset_id = service.create_confusion_dataset(points)

        if not dataset_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to create evaluation dataset",
            )

        return {
            "dataset_id": dataset_id,
            "confusion_points_count": len(points),
            "created_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to create dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run")
async def run_evaluation(
    dataset_id: str,
):
    """
    Run evaluation on a confusion points dataset.

    Args:
        dataset_id: ID of the confusion dataset to evaluate

    Returns:
        Evaluation results with scores and metrics
    """
    try:
        service = get_evaluation_service()
        results = service.run_confusion_evaluation(dataset_id)

        if not results:
            raise HTTPException(
                status_code=500,
                detail="Evaluation failed",
            )

        return results

    except Exception as e:
        logger.error(f"Failed to run evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends")
async def get_trends(
    days: int = Query(7, ge=1, le=90),
):
    """
    Get confusion point trends over time.

    Args:
        days: Number of days to analyze

    Returns:
        Trends, patterns, and improvement recommendations
    """
    try:
        service = get_evaluation_service()
        trends = service.get_confusion_trends(days=days)

        if not trends:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve trends",
            )

        return {
            "analysis_period_days": days,
            "trends": trends,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report")
async def get_report(
    days: int = Query(7, ge=1, le=90),
):
    """
    Get comprehensive evaluation report.

    Includes:
    - Summary statistics
    - Top confusion points
    - Recommendations
    - Next steps for improvement

    Args:
        days: Report period

    Returns:
        Full evaluation report
    """
    try:
        # Get confusion points (from database in production)
        # For now, return a placeholder report
        metrics = EvaluationMetrics()
        metrics.total_sessions = 42
        metrics.total_interruptions = 87
        metrics.avg_interruptions_per_session = 2.07
        metrics.resolution_rate = 0.76
        metrics.avg_response_quality = 0.78

        confusion_points = []

        report = get_evaluation_service().generate_report(
            confusion_points, metrics
        )

        return {
            "report": report,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def compare_evaluations(
    before_dataset_id: str,
    after_dataset_id: str,
):
    """
    Compare evaluation results before/after improvements.

    Useful for measuring impact of teaching improvements.

    Args:
        before_dataset_id: Evaluation before improvements
        after_dataset_id: Evaluation after improvements

    Returns:
        Comparison metrics and improvement analysis
    """
    try:
        # Placeholder comparison
        return {
            "before": {
                "dataset_id": before_dataset_id,
                "avg_quality": 0.72,
                "confusion_points": 45,
            },
            "after": {
                "dataset_id": after_dataset_id,
                "avg_quality": 0.81,
                "confusion_points": 28,
            },
            "improvement": {
                "quality_gain": 0.09,
                "confusion_reduction": "37.8%",
                "recommendation": "Improvements effective! Deploy to production.",
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to compare: {e}")
        raise HTTPException(status_code=500, detail=str(e))
