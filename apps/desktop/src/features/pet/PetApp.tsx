import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, ArrowUp, Clock3, Dumbbell, Play, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createInitialMovementSnapshot, getMovementExercise, MOVEMENT_EXERCISES } from "../movement/exercises";
import type { IMovementPoseSnapshot, MovementExerciseId } from "../movement/types";
import { HaloPet } from "../session/HaloPet";
import type { CompletionPetSize } from "./preferences";
import type { CompletionPetAction, ICompletionPetNativeState, ICompletionPetSummon } from "./types";

const POLL_MS = 200;
const DRAG_THRESHOLD_PX = 4;
const SEARCH_PARAMS = new URLSearchParams(window.location.search);
const DEMO_PET = SEARCH_PARAMS.has("demoPet");
const DEMO_PET_SIZE = ((value: string | null): CompletionPetSize => value === "small" || value === "medium" ? value : "large")(SEARCH_PARAMS.get("demoPetSize"));
const MovementChallenge = lazy(async () => {
  const module = await import("../movement/MovementChallenge");
  return { default: module.MovementChallenge };
});

const DEMO_SUMMON: ICompletionPetSummon = {
  schemaVersion: 1,
  id: "demo-focus-complete",
  pet: "haloform",
  petSize: DEMO_PET_SIZE,
  preview: false,
  movementBreakEnabled: true,
  nextPhase: "short-break",
  title: "Focus complete",
  actionLabel: "Start Short break",
};

const INITIAL_MOVEMENT_SNAPSHOT = createInitialMovementSnapshot();

const isNative = (): boolean => typeof window.__TAURI_INTERNALS__ !== "undefined";

export const PetApp = () => {
  const [summon, setSummon] = useState<ICompletionPetSummon | null>(DEMO_PET ? DEMO_SUMMON : null);
  const [expanded, setExpanded] = useState(SEARCH_PARAMS.has("demoPetExpanded"));
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<MovementExerciseId | null>(null);
  const [movementActive, setMovementActive] = useState(false);
  const [movementSnapshot, setMovementSnapshot] = useState<IMovementPoseSnapshot>(INITIAL_MOVEMENT_SNAPSHOT);
  const [busy, setBusy] = useState(false);
  const [rebaseOffset, setRebaseOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const startActionRef = useRef<HTMLButtonElement | null>(null);
  const closeActionRef = useRef<HTMLButtonElement | null>(null);
  const companionRef = useRef<HTMLButtonElement | null>(null);
  const movementActionRef = useRef<HTMLButtonElement | null>(null);
  const squatActionRef = useRef<HTMLButtonElement | null>(null);
  const reachActionRef = useRef<HTMLButtonElement | null>(null);
  const previousSummonIdRef = useRef<string | null>(summon?.id ?? null);
  const rebaseTimerRef = useRef<number | null>(null);
  const movementActiveRef = useRef(false);
  const movementCompletionSubmittedRef = useRef(false);
  const movementAttemptRef = useRef(0);

  useEffect(() => {
    if (DEMO_PET || !isNative()) return undefined;
    let disposed = false;
    const refresh = async () => {
      try {
        const snapshot = await invoke<ICompletionPetNativeState>("completion_pet_state");
        if (!disposed) setSummon(snapshot.summon);
      } catch {
        // The native window remains hidden when its projection cannot be read.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (rebaseTimerRef.current !== null) window.clearTimeout(rebaseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (summon?.id === previousSummonIdRef.current) return;
    previousSummonIdRef.current = summon?.id ?? null;
    if (rebaseTimerRef.current !== null) window.clearTimeout(rebaseTimerRef.current);
    rebaseTimerRef.current = null;
    setRebaseOffset(null);
    setExpanded(false);
    setExercisePickerOpen(false);
    setSelectedExerciseId(null);
    movementActiveRef.current = false;
    setMovementActive(false);
    setMovementSnapshot(INITIAL_MOVEMENT_SNAPSHOT);
    movementCompletionSubmittedRef.current = false;
    setBusy(false);
  }, [summon?.id]);

  useEffect(() => {
    movementActiveRef.current = movementActive;
  }, [movementActive]);

  const setBubbleOpen = async (open: boolean, focusAction = false): Promise<void> => {
    let beforePetPosition: { x: number; y: number } | null = null;
    const collapsedCenter = { x: 58, y: 44 };
    if (isNative()) {
      try {
        if (open) {
          beforePetPosition = {
            x: window.screenX + collapsedCenter.x,
            y: window.screenY + collapsedCenter.y,
          };
          await invoke("activate_completion_pet");
        }
        await invoke("set_completion_pet_expanded", { expanded: open });
      } catch {
        setExpanded(false);
        return;
      }
    }
    if (open && beforePetPosition) {
      setRebaseOffset({
        x: beforePetPosition.x - (window.screenX + 130),
        y: beforePetPosition.y - (window.screenY + 116),
      });
      if (rebaseTimerRef.current !== null) window.clearTimeout(rebaseTimerRef.current);
      rebaseTimerRef.current = window.setTimeout(() => {
        setRebaseOffset(null);
        rebaseTimerRef.current = null;
      }, 420);
    } else if (!open) {
      setRebaseOffset(null);
    }
    setExpanded(open);
    if (!open) setExercisePickerOpen(false);
    if (open && focusAction) window.requestAnimationFrame(() => (summon?.preview ? closeActionRef.current : startActionRef.current)?.focus());
    if (!open && focusAction) window.requestAnimationFrame(() => companionRef.current?.focus());
  };

  const hide = async (): Promise<void> => {
    movementActiveRef.current = false;
    setMovementActive(false);
    setExercisePickerOpen(false);
    setSummon(null);
    setExpanded(false);
    if (DEMO_PET || !isNative()) return;
    await invoke("hide_completion_pet").catch(() => undefined);
  };

  const submit = async (action: CompletionPetAction): Promise<void> => {
    if (busy) return;
    setBusy(true);
    if (DEMO_PET || !isNative()) {
      window.__AGENT_HALO_PET_ACTIONS__ = [...(window.__AGENT_HALO_PET_ACTIONS__ ?? []), action];
      movementActiveRef.current = false;
      setMovementActive(false);
      setExercisePickerOpen(false);
      setSummon(null);
      return;
    }
    try {
      await invoke("submit_completion_pet_action", { action });
      movementActiveRef.current = false;
      setMovementActive(false);
      setExercisePickerOpen(false);
      setSummon(null);
    } catch {
      setBusy(false);
    }
  };

  const openExercisePicker = (): void => {
    if (busy || summon?.preview || !summon?.movementBreakEnabled) return;
    setExercisePickerOpen(true);
    window.requestAnimationFrame(() => squatActionRef.current?.focus());
  };

  const closeExercisePicker = (): void => {
    setExercisePickerOpen(false);
    window.requestAnimationFrame(() => movementActionRef.current?.focus());
  };

  const startMovement = async (exerciseId: MovementExerciseId): Promise<void> => {
    if (busy || summon?.preview || !summon?.movementBreakEnabled) return;
    const exercise = getMovementExercise(exerciseId);
    setBusy(true);
    setExercisePickerOpen(false);
    setSelectedExerciseId(exercise.id);
    const movementAttempt = movementAttemptRef.current + 1;
    movementAttemptRef.current = movementAttempt;
    movementCompletionSubmittedRef.current = false;
    const initialSnapshot = createInitialMovementSnapshot(exercise.id, `${summon.id}:${movementAttempt}`);
    setMovementSnapshot({ ...initialSnapshot, status: "requesting", guidance: "Waiting for Camera permission…" });
    if (DEMO_PET || !isNative()) {
      setMovementActive(true);
      setExpanded(false);
      setMovementSnapshot({ ...initialSnapshot, status: "tracking", guidance: exercise.initialGuidance });
      setBusy(false);
      return;
    }
    try {
      await invoke("set_completion_pet_movement", { active: true, summonId: summon.id });
      movementActiveRef.current = true;
      setMovementActive(true);
      setExpanded(false);
      setBusy(false);
      if (SEARCH_PARAMS.has("demoMovementCompleted")) {
        setMovementSnapshot({ ...initialSnapshot, status: "completed", repCount: exercise.targetReps, guidance: exercise.completionGuidance, progress: 1 });
      } else if (SEARCH_PARAMS.has("demoCameraOff")) {
        setMovementSnapshot({ ...initialSnapshot, status: "tracking", permission: "authorized", guidance: exercise.initialGuidance });
      }
      return;
    } catch (error) {
      setMovementSnapshot({
        ...initialSnapshot,
        status: "error",
        guidance: "Camera could not start",
        error: error instanceof Error ? error.message : "Could not start the local pose session",
      });
      movementActiveRef.current = false;
      setMovementActive(false);
    } finally {
      setBusy(false);
    }
  };

  const cancelMovement = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    movementActiveRef.current = false;
    setMovementActive(false);
    setExpanded(true);
    setExercisePickerOpen(true);
    const exerciseId = selectedExerciseId ?? movementSnapshot.exerciseId;
    setMovementSnapshot(createInitialMovementSnapshot(exerciseId));
    window.requestAnimationFrame(() => (exerciseId === "overhead-reach" ? reachActionRef.current : squatActionRef.current)?.focus());
    if (DEMO_PET || !isNative()) {
      setBusy(false);
      return;
    }
    try {
      await invoke("set_completion_pet_movement", { active: false, summonId: summon?.id });
    } catch {
      setSummon(null);
      await invoke("hide_completion_pet").catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!movementActive || movementSnapshot.status !== "completed" || movementCompletionSubmittedRef.current) return undefined;
    movementCompletionSubmittedRef.current = true;
    const timer = window.setTimeout(() => void submit("movement-complete"), 1_600);
    return () => window.clearTimeout(timer);
  }, [movementActive, movementSnapshot.status]);

  const beginPointer = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (expanded || event.button !== 0) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePointer = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const origin = dragStartRef.current;
    if (!origin || expanded || draggingRef.current) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < DRAG_THRESHOLD_PX) return;
    draggingRef.current = true;
    suppressClickRef.current = true;
    if (isNative()) void invoke("drag_completion_pet").catch(() => undefined);
  };

  const endPointer = (): void => {
    dragStartRef.current = null;
    if (draggingRef.current) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    draggingRef.current = false;
  };

  if (!summon) return <main className="completion-pet-root" data-visible="false" />;

  if (movementActive) {
    return (
      <main className="completion-pet-root" data-visible="true" data-movement="true">
        <Suspense fallback={<div className="movement-loading" role="status">Preparing local pose…</div>}>
          <MovementChallenge
            snapshot={movementSnapshot}
            busy={busy}
            cameraPreviewEnabled={isNative() && !SEARCH_PARAMS.has("demoCameraOff")}
            demoPoseEnabled={SEARCH_PARAMS.has("demoPose")}
            onCancel={() => void cancelMovement()}
            onRetry={() => void startMovement(selectedExerciseId ?? movementSnapshot.exerciseId)}
            onSnapshot={setMovementSnapshot}
            onStartBreak={() => void submit("start-break")}
          />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="completion-pet-root" data-visible="true" data-expanded={expanded ? "true" : "false"} data-exercise-picker={exercisePickerOpen ? "true" : "false"} data-rebasing={rebaseOffset ? "true" : "false"} data-pet-size={summon.petSize} data-preview={summon.preview ? "true" : "false"} data-movement-option={summon.movementBreakEnabled ? "true" : "false"} style={rebaseOffset ? { "--pet-rebase-x": `${rebaseOffset.x}px`, "--pet-rebase-y": `${rebaseOffset.y}px` } as CSSProperties : undefined} onKeyDown={(event) => {
      if (!expanded || event.key !== "Escape") return;
      event.preventDefault();
      if (exercisePickerOpen) {
        closeExercisePicker();
        return;
      }
      void setBubbleOpen(false, true);
    }}>
      <span className="sr-only" role="status" aria-live="polite">{summon.preview ? "Pet preview." : `Focus complete. ${summon.nextPhase === "long-break" ? "Long break" : "Short break"} ready.`}</span>
      {expanded ? (
        exercisePickerOpen ? (
          <section className="completion-pet-radial completion-pet-exercise-picker" role="dialog" aria-label="Choose movement break exercise" id="completion-pet-actions">
            <span className="completion-pet-orbit" aria-hidden="true" />
            {MOVEMENT_EXERCISES.map((exercise) => (
              <button
                ref={exercise.id === "squat" ? squatActionRef : reachActionRef}
                className="completion-pet-option completion-pet-exercise-option"
                data-exercise={exercise.id}
                type="button"
                disabled={busy}
                onClick={() => void startMovement(exercise.id)}
                aria-label={exercise.actionLabel}
                key={exercise.id}
              >
                {exercise.id === "squat" ? <Dumbbell size={19} strokeWidth={2.3} /> : <ArrowUp size={20} strokeWidth={2.3} />}
                <span>{exercise.pickerLabel}<br /><small>{exercise.pickerDescription}</small></span>
              </button>
            ))}
            <button className="completion-pet-option completion-pet-exercise-back" type="button" disabled={busy} onClick={closeExercisePicker} aria-label="Back to break actions">
              <ArrowLeft size={18} strokeWidth={2.3} />
              <span>Back</span>
            </button>
            <span className="completion-pet-context">Pick one · camera starts next</span>
          </section>
        ) : (
        <section className="completion-pet-radial" role="dialog" aria-label={summon.preview ? "Pet preview controls" : "Focus complete actions"} id="completion-pet-actions">
          <span className="completion-pet-orbit" aria-hidden="true" />
          {summon.preview ? null : (
            <>
              <button ref={startActionRef} className="completion-pet-option completion-pet-start" type="button" disabled={busy} onClick={() => void submit("start-break")} aria-label={summon.actionLabel}>
                <Play size={21} strokeWidth={2.4} />
                <span>{busy ? "…" : <>{summon.nextPhase === "long-break" ? "Long" : "Short"}<br />break</>}</span>
              </button>
              {summon.movementBreakEnabled ? (
                <button ref={movementActionRef} className="completion-pet-option completion-pet-movement" type="button" disabled={busy} onClick={openExercisePicker} aria-label="Choose Movement Break exercise">
                  <Dumbbell size={20} strokeWidth={2.3} />
                  <span>Choose<br />move</span>
                </button>
              ) : null}
              <button className="completion-pet-option completion-pet-later" type="button" disabled={busy} onClick={() => void hide()} aria-label="Not now">
                <Clock3 size={20} strokeWidth={2.2} />
                <span>Later</span>
              </button>
            </>
          )}
          <button ref={closeActionRef} className="completion-pet-option completion-pet-close" type="button" disabled={busy} onClick={() => void hide()} aria-label="Hide completion pet">
            <X size={20} strokeWidth={2.25} />
            <span>Close</span>
          </button>
          <span className="completion-pet-context">{summon.title}</span>
        </section>
        )
      ) : null}

      <div className="completion-pet-dock">
        <button
          ref={companionRef}
          className="completion-pet-companion"
          type="button"
          aria-label={summon.preview ? "Pet preview. Open controls" : "Focus complete. Open break actions"}
          aria-expanded={expanded}
          aria-controls="completion-pet-actions"
          onClick={() => {
            if (suppressClickRef.current) return;
            void setBubbleOpen(!expanded, true);
          }}
          onKeyDown={(event) => {
            if (!expanded && ["Enter", " "].includes(event.key)) {
              event.preventDefault();
              void setBubbleOpen(true, true);
            }
          }}
          onPointerDown={beginPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          data-tauri-drag-region="false"
        >
          <HaloPet className="completion-pet-visual" loadout={summon.loadout} pet={summon.pet} status="working" activityKind="session" surface="completion" />
        </button>
      </div>
    </main>
  );
};

declare global {
  interface Window {
    __AGENT_HALO_PET_ACTIONS__?: CompletionPetAction[];
  }
}
