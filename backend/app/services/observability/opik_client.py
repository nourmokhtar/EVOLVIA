"""
Opik observability client - centralized tracing and evaluation logging.

This module wraps Opik SDK and provides a clean API for:
1. Configuring Opik once at startup
2. Logging traces for each teacher turn
3. Running evaluations offline
4. Monitoring learning session quality
"""

import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class OpikConfig:
    """Opik configuration"""
    enabled: bool
    api_key: Optional[str] = None
    workspace: Optional[str] = None
    project_name: str = "evolvia"
    url: Optional[str] = None  # For self-hosted


class OpikClient:
    """
    Centralized Opik client for tracing and evaluation.
    
    Configuration:
    - Reads from environment variables (OPIK_API_KEY, OPIK_WORKSPACE, etc.)
    - Can be configured once at startup
    - Handles both Comet-hosted and self-hosted Opik
    
    Usage:
        opik_client.configure()
        opik_client.log_teacher_turn(turn)
        opik_client.get_evaluation_dataset("confusion-points")
    """

    def __init__(self):
        self.config: Optional[OpikConfig] = None
        self._opik_module = None  # Will hold the Opik SDK if installed
        self._is_configured = False

    def configure(self, config: Optional[OpikConfig] = None) -> None:
        """
        Configure Opik from environment or explicit config.
        
        Args:
            config: Optional OpikConfig. If None, reads from env vars.
        """
        if config:
            self.config = config
        else:
            self.config = OpikConfig(
                enabled=os.getenv("OPIK_ENABLED", "false").lower() == "true",
                api_key=os.getenv("OPIK_API_KEY"),
                workspace=os.getenv("OPIK_WORKSPACE"),
                project_name=os.getenv("OPIK_PROJECT", "evolvia"),
                url=os.getenv("OPIK_URL"),
            )

        if not self.config.enabled:
            logger.info("Opik tracing disabled (OPIK_ENABLED=false)")
            return

        try:
            import opik

            self._opik_module = opik

            # Initialize Opik
            if self.config.url:
                # Self-hosted
                opik.configure(
                    api_key=self.config.api_key,
                    workspace=self.config.workspace,
                    base_url=self.config.url,
                )
            else:
                # Comet-hosted
                opik.configure(
                    api_key=self.config.api_key,
                    workspace=self.config.workspace,
                )

            self._is_configured = True
            logger.info(
                f"Opik configured for project '{self.config.project_name}' "
                f"in workspace '{self.config.workspace or 'default'}'"
            )
        except ImportError:
            logger.warning(
                "Opik SDK not installed. Install with: pip install opik"
            )
            self.config.enabled = False
        except Exception as e:
            logger.error(f"Failed to configure Opik: {e}")
            self.config.enabled = False

    def log_teacher_turn(self, turn: "TeacherTurn") -> None:
        """
        Log a single teacher turn (user input → teacher response) as a trace.
        
        This is called after every teacher response generation.
        The trace captures:
        - Input: student question, lesson context, difficulty level
        - Output: teacher speech and board actions
        - Metadata: session ID, step, interruption count
        
        Args:
            turn: TeacherTurn object with full context
        """
        if not self.config or not self.config.enabled:
            return

        try:
            from opik import track

            @track(project_name=self.config.project_name)
            def _log_turn(turn_data: Dict[str, Any]) -> Dict[str, Any]:
                """Wrapped function to track this teacher turn"""
                return {
                    "speech_length": len(turn_data["speech_text"]),
                    "board_actions_count": len(turn_data["board_actions"]),
                    "difficulty_level": turn_data["difficulty_level"],
                }

            # Prepare turn data
            turn_data = {
                "session_id": turn.session_id,
                "step_id": turn.step_id,
                "lesson_id": turn.lesson_id,
                "model": turn.model_name,
                "prompt": turn.prompt_input,
                "lesson_context": turn.lesson_context,
                "student_input": turn.student_input,
                "checkpoint": turn.last_checkpoint,
                "speech_text": turn.speech_text,
                "board_actions": [
                    {
                        "kind": action.kind.value,
                        "payload": action.payload,
                    }
                    for action in turn.board_actions
                ],
                "interruption_count": turn.interruption_count,
                "difficulty_level": turn.difficulty_level,
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Log via Opik
            _log_turn(turn_data)
            logger.debug(f"Logged teacher turn for session {turn.session_id}")

        except Exception as e:
            logger.error(f"Failed to log teacher turn: {e}")

    def start_span(self, name: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Start a new Opik span for nested tracing.
        
        Use this for breaking down complex operations.
        
        Example:
            with opik_client.start_span("lesson_load", {"lesson_id": "123"}):
                # ... do work ...
        """
        if not self.config or not self.config.enabled or not self._opik_module:
            # Return a no-op context manager
            class NoOpSpan:
                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    pass

            return NoOpSpan()

        try:
            from opik import track

            span = self._opik_module.track(
                name=name,
                project_name=self.config.project_name,
            )
            return span

        except Exception as e:
            logger.error(f"Failed to create span: {e}")
            # Return no-op
            class NoOpSpan:
                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    pass

            return NoOpSpan()

    def create_evaluation_dataset(
        self,
        name: str,
        examples: List[Dict[str, Any]],
    ) -> None:
        """
        Create or update an evaluation dataset in Opik.
        
        This is used for offline evaluation of teacher prompts.
        
        Args:
            name: Dataset name (e.g., "confusion-points", "ma-fhemtch-moments")
            examples: List of {input, expected_output} dicts
                     e.g., {"student_input": "...", "lesson_context": "..."}
        """
        if not self.config or not self.config.enabled or not self._opik_module:
            logger.warning("Opik not enabled, cannot create dataset")
            return

        try:
            from opik import Client

            client = Client(
                api_key=self.config.api_key,
                workspace=self.config.workspace,
                base_url=self.config.url,
            )

            # Create dataset
            dataset = client.create_dataset(
                name=name,
                description=f"Evaluation dataset for {name}",
                project_name=self.config.project_name,
            )

            # Add examples
            for example in examples:
                dataset.insert(example)

            logger.info(f"Created dataset '{name}' with {len(examples)} examples")

        except Exception as e:
            logger.error(f"Failed to create evaluation dataset: {e}")

    def get_experiment_runs(
        self,
        dataset_name: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent experiment runs for a dataset.
        
        Useful for comparing different prompt versions.
        
        Args:
            dataset_name: Name of the dataset to query
            limit: Max results
            
        Returns:
            List of experiment run metadata
        """
        if not self.config or not self.config.enabled:
            return []

        try:
            from opik import Client

            client = Client(
                api_key=self.config.api_key,
                workspace=self.config.workspace,
                base_url=self.config.url,
            )

            # Query experiments (method depends on Opik version)
            # This is a placeholder—adjust based on actual Opik API
            logger.info(f"Fetching experiments for dataset: {dataset_name}")
            return []

        except Exception as e:
            logger.error(f"Failed to fetch experiment runs: {e}")
            return []


# Singleton instance - use this throughout the app
opik_client = OpikClient()


# Late import to avoid circular dependency
def get_teacher_turn_type():
    """Import TeacherTurn type (avoids circular import at module level)"""
    from app.schemas.learn import TeacherTurn

    return TeacherTurn
