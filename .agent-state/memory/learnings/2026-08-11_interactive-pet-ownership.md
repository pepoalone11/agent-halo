# Interactive Pet ownership boundaries

Tags: `agent-halo`, `interactive-pet`, `native-window`, `movement`, `camera`, `pomodoro`, `goal-mode`

## Durable lesson

For a persistent companion window, visibility, truth, presentation, and side effects are separate contracts:

- **Visibility ownership:** bind dismissals to the summon/attempt that created them. A stale Focus-completion acknowledgement must never hide a newer manual companion.
- **Truth ownership:** derive semantic state and exact activity from one shared projection owned by the main renderer.
- **Presentation ownership:** replay-safe Done/attention motion may temporarily override body motion, but must not alter state, Signal, persistence, keep-awake, or Pomodoro truth.
- **Side-effect ownership:** keep Pomodoro and notifications in the main renderer; keep the Pet WebView projection-only.
- **Camera ownership:** launchers and choosers stay camera-free. Start one local stream only after an explicit exercise choice, and prove cleanup on completion, cancel, and error.
- **Focus replay:** identical Open Focus actions need a monotonically changing request identity so native foreground focus and DOM focus can be requested again.
- **Human gates:** record Mahiro's direct acceptance as user evidence, but never convert it into an agent claim when the criterion is human-owned.

## Reuse trigger

Apply this model whenever Agent Halo adds another persistent floating surface, replay acknowledgement, or manual workflow that shares native window ownership with an automatic lifecycle.

