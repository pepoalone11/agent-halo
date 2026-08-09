# Movement Break contract

## Current exercise set

Movement Break is an optional local Pomodoro completion action designed to interrupt long periods of sitting. After a naturally completed Focus phase it offers two fixed challenges:

- **10 Squats** — lower-body standing → squat depth → standing cycles.
- **10 Overhead Reaches** — both hands below the shoulders → both hands overhead → both hands lowered cycles.

The flow is deliberately user-driven:

1. Focus completes and the ordinary Completion Pet appears.
2. The user opens Pet controls and chooses **Movement Break**. This opens an exercise picker without starting the camera.
3. The user explicitly chooses **10 Squats** or **10 Overhead Reaches**.
4. Only that specific exercise click may request camera permission and start pose analysis.
5. Agent Halo counts one complete exercise-specific cycle at a time.
6. At 10 valid repetitions, the main renderer revalidates and starts the already prepared Short or Long break.

**Start break**, **Later**, and **Close** remain available. Movement Break never blocks a break and never opens automatically. Skip, Restart, Reset all, break completion, app launch, Pet preview, or passive Focus completion cannot start the camera.

## Privacy and camera ownership

- Movement Break is opt-in and defaults Off.
- Opening the exercise picker does not request camera access. Camera access is requested only after the user clicks a specific Squat or Overhead Reach challenge.
- One WebView `getUserMedia` stream feeds both the mirrored preview and bundled MediaPipe Pose Landmarker Lite model locally; preview and detector cannot select different cameras.
- Agent Halo does not record audio, save frames, encode video, retain a camera history, or send camera data over the network.
- The preview is rendered directly from the same in-memory stream used for detection. Frames are never drawn into a persistence/export canvas, encoded, written to disk, copied across native IPC, or sent over the network.
- Camera capture stops on completion, Cancel/Close, Pet disable, Reset all, app exit, session replacement, permission failure, or native error.
- Permission denial remains truthful and recoverable: the user may start the prepared break without exercise, close the surface, or enable Camera access later in macOS System Settings.

The packaged app must include a truthful `NSCameraUsageDescription`. Browser demo mocks can verify UI/state boundaries but cannot prove macOS TCC, WKWebView camera playback, bundled WASM/model loading, or real camera release.

## Pose and count contract

One bundled MediaPipe Pose Landmarker produces the landmark stream for both exercises. `MovementChallenge` owns the single camera/preview/inference lifecycle; exercise-specific trackers consume the same result and cannot open another stream or start Pomodoro directly. The progress guides are exercise-specific and do not judge form or provide medical, injury-prevention, or form-quality advice.

### Squat

Squat deliberately uses only the visible midpoint of the two shoulders. After a short standing calibration, a white line follows the shoulders while the green target stays fixed at 86% of the camera frame; the user adjusts camera framing rather than letting the target drift. The right-side bar reports white-to-green progress.

A repetition counts only after:

- one or both shoulders are visible with adequate confidence;
- seven stable standing samples calibrate the white-line start;
- the shoulder line reaches at least 90% of the green target with a short dwell;
- the user returns to the top 24% zone with another short dwell;
- bottom and return dwell gates prevent duplicate/noisy counts.

Tracking loss pauses the attempt and clears an incomplete repetition. The UI asks only that both shoulders stay visible. Pure shoulder-counter tests own threshold/state-machine regressions; Mahiro's real-camera foreground test remains the acceptance authority for useful counting.

### Overhead Reach

Overhead Reach requires both shoulders and both wrists to remain visible. The white line follows the midpoint of the hands and the green target sits above the current shoulder line. A repetition counts only after:

- both hands begin at least 5% of the normalized camera height below their corresponding shoulders;
- both hands reach at least 8% above their corresponding shoulders with a short dwell;
- both hands return below the shoulders with another short dwell;
- one raised hand cannot count as a completed reach.

Tracking loss clears an incomplete reach and requires both hands to return below the shoulders before another attempt. Pure counter tests own threshold/state-machine regressions; Mahiro's real-camera foreground test remains the acceptance authority for useful counting and camera framing.

## Ownership and action safety

`App` and `usePomodoro` remain the only Pomodoro owner.

```text
main Pomodoro state
  -> Completion Pet summon
  -> camera-free exercise picker
  -> explicit Squat or Overhead Reach action
  -> one local preview + bundled pose tracker
  -> selected exercise counter
  -> one bounded movement-complete action
  -> main renderer validates completion id + prepared phase
  -> main renderer starts the break
```

The movement surface cannot mount `App`, write Pomodoro storage, schedule/cancel notifications, or start a timer directly. A completed challenge carries the active summon id and expected prepared phase through the same bounded Pet action queue as **Start break**. The main renderer accepts it only when the Pomodoro is still idle on the matching post-Focus break.

The existing 3-second Pet/notification handoff is unchanged. Camera permission and local pose-model startup occur later, after Pet already owns completion delivery, and never participate in fallback cancellation.

## Window and focus

- Passive Focus completion shows only the existing non-focusable Completion Pet.
- A deliberate Pet click may focus Pet controls.
- A deliberate **10 Squats** or **10 Overhead Reaches** click may resize that same Pet window into the exercise surface and request camera access. Opening or closing the exercise picker cannot.
- The exercise surface is `600 × 420` logical px so the mirrored 4:3 live view, white tracked line, green exercise target, repetition count, and live progress bar remain readable.
- Pose updates, permission callbacks, repetition completion, and errors must not reactivate Agent Halo or steal focus.
- Closing the surface leaves the prepared break idle and removes any transparent hitbox.

## Settings

Setup → Pet owns one **Movement break** On/Off preference, default Off. The preference applies to future Completion Pet summons; changing it does not dismiss a Pet that already owns completion delivery or remove its notification replacement. Both current exercises stay fixed at 10 repetitions rather than adding premature exercise/cadence configuration. The setting copy must state that the camera opens only after a specific exercise click and processing stays on this Mac.

## Verification

- No passive path invokes camera start or permission request.
- Opening the exercise picker does not mount the camera surface or create a native movement attempt.
- Pet preview never exposes Movement Break.
- Start break, Later, and Close remain available with Movement Break enabled.
- Camera denial/failure never corrupts Pomodoro state and still allows Start break.
- Squat still requires its calibrated down/up traversal; Overhead Reach requires both hands to complete a down/up/down traversal.
- Only a complete 10-repetition session queues `movement-complete`, exactly once, regardless of selected exercise.
- Main revalidates summon id, completed Focus, idle status, and prepared break before starting.
- Cancel, hide, disable, Reset all, app exit, stale replacement, and completion stop capture.
- The Pet WebView command allowlist still blocks main-window commands.
- Release promotion requires TypeScript, targeted Playwright tests, Rust unit tests/check, bundle checks, packaged `Info.plist` inspection, release install, focus smoke, and permission smoke to pass. Useful real Squat/Overhead Reach counting remains a separate Mahiro-owned foreground acceptance gate.
