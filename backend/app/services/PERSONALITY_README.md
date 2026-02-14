# Personality Service — Workflow Overview

This document describes the personality analysis workflow implemented in the `personality_service` module and explains how the pieces fit together.

## Purpose

The Personality Service analyzes short user text inputs and estimates how those inputs would change a user's psychological trait scores. The output is used to update a user's personality profile (radar chart / scores) and to provide brief analysis feedback.

## High-level workflow

1. Validate Input
   - Ensure the incoming prompt is not empty and meets basic sanity checks.

2. Analyze Traits
   - The service constructs a structured analysis prompt and sends it to a configured LLM provider via a generic model interface.
   - The provider returns a textual response containing JSON with per-trait deltas and a short explanation.

3. Parse Response
   - Extract JSON from the model response and convert values to numeric deltas (clamped to expected ranges).

4. Finalize & Persist
   - Apply deltas to the user's existing personality profile (clamped to [0,100]).
   - Record timestamps and streak updates, and persist changes to the database.

## Key components

- `API` / Router — receives `POST` requests from the frontend.
- `Processing` — orchestrates validation, model invocation, parsing, and business logic.
- `Model Interface` — thin adapter that invokes the configured LLM provider (abstracted so providers can be swapped via settings).
- `Database` — stores user profiles and updated personality scores.

## Observability and Orchestration

- The implementation uses a workflow/orchestration layer (state graph) to model steps as nodes and edges.
- Execution traces and observability hooks are present so runs can be tracked (configurable via environment).

## Configuration

- LLM provider and related endpoints/keys are configured through application settings. The service checks feature flags at startup and initializes the selected provider.

## Usage (code pointers)

- Implementation: [backend/app/services/personality_service.py](backend/app/services/personality_service.py)
- Primary entry points:
  - `analyze_and_update_personality(user, user_prompt)` — full flow that analyzes input and updates the user profile.
  - `analyze_user_input_with_ollama(user_prompt)` — invokes the workflow and returns trait deltas and analysis (provider name in the method reflects historical naming; providers are configurable).

## Expected response format from the model

The model is expected to return JSON similar to:

```
{
  "Communication": -2,
  "Empathy": +3,
  "Conflict Res": 0,
  "Collaboration": +1,
  "Confidence": -1,
  "Adaptability": +2,
  "analysis": "Brief explanation"
}
```

Values are interpreted as deltas in the range [-10, 10] before being applied to the user's 0–100 profile.

## Notes and maintenance tips

- Keep the model prompt and parsing logic aligned: if the model output format changes, update the prompt template and the parser.
- Feature flags allow switching providers for testing; verify initialization logs at startup to confirm which provider is active.
- If you change trait names or add new traits, update `PERSONALITY_TRAITS` in the implementation and review storage schema compatibility.

---
Generated based on the `personality_service` implementation. For code details, see the source file referenced above.
