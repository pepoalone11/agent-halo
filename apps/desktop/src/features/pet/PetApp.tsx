import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HaloPet } from "../session/HaloPet";
import { DEFAULT_HALO_PET_MOTION_MAPPING } from "../session/petMotion";
import type { ActivityKind, ISessionSummary } from "../session/types";
import type { CompletionPetSize } from "./preferences";
import { buildCompanionProjection } from "./companionProjection";
import type { ICompanionProjection, ICompletionPetNativeState, ICompletionPetSummon } from "./types";

const POLL_MS = 200;
const DRAG_THRESHOLD_PX = 4;
const SEARCH_PARAMS = new URLSearchParams(window.location.search);
const DEMO_PET = SEARCH_PARAMS.has("demoPet");
const DEMO_PET_SIZE = ((value: string | null): CompletionPetSize => value === "small" || value === "medium" ? value : "large")(SEARCH_PARAMS.get("demoPetSize"));

const DEMO_SUMMON = {
  schemaVersion: 2,
  id: "demo-focus-complete",
  purpose: "focus-completion",
  pet: "haloform",
  petSize: DEMO_PET_SIZE,
  movementBreakEnabled: false,
  nextPhase: "short-break",
} satisfies ICompletionPetSummon;

const DEMO_PROJECTION: ICompanionProjection = buildCompanionProjection({
  summon: DEMO_SUMMON,
  sessionStatus: "done",
  activityKind: "done",
  motionMapping: DEFAULT_HALO_PET_MOTION_MAPPING,
  replayId: "demo-focus-complete:done",
});

const isNative = (): boolean => typeof window.__TAURI_INTERNALS__ !== "undefined";

export const PetApp = () => {
  const [summon, setSummon] = useState<ICompletionPetSummon | null>(DEMO_PET ? DEMO_SUMMON : null);
  const [projection, setProjection] = useState<ICompanionProjection | null>(DEMO_PET ? DEMO_PROJECTION : null);
  const [expanded, setExpanded] = useState(SEARCH_PARAMS.has("demoPetExpanded"));
  const [busy, setBusy] = useState(false);
  const [rebaseOffset, setRebaseOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const closeActionRef = useRef<HTMLButtonElement | null>(null);
  const companionRef = useRef<HTMLButtonElement | null>(null);
  const previousSummonIdRef = useRef<string | null>(summon?.id ?? null);
  const rebaseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (DEMO_PET || !isNative()) return undefined;
    let disposed = false;
    const refresh = async () => {
      try {
        const snapshot = await invoke<ICompletionPetNativeState>("completion_pet_state");
        if (!disposed) {
          setSummon(snapshot.summon);
          setProjection(snapshot.projection ?? null);
        }
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
    setProjection((current) => current?.summon.id === summon?.id ? current : null);
    setExpanded(false);
    setBusy(false);
  }, [summon?.id]);

  const setBubbleOpen = async (open: boolean): Promise<void> => {
    if (isNative()) {
      try {
        if (open) await invoke("activate_completion_pet");
        await invoke("set_completion_pet_expanded", { expanded: open });
      } catch {
        setExpanded(false);
        return;
      }
    }
    setExpanded(open);
  };

  const hide = async (): Promise<void> => {
    setSummon(null);
    setProjection(null);
    setExpanded(false);
    setBusy(false);
    if (DEMO_PET || !isNative()) return;
    await invoke("hide_completion_pet").catch(() => undefined);
  };

  const submit = async (action: "dismiss"): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await invoke("submit_completion_pet_action", { action });
      setSummon(null);
      setProjection(null);
      setExpanded(false);
      setBusy(false);
    } catch {
      setBusy(false);
    }
  };

  const beginPointer = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (expanded || event.button !== 0) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePointer = (event: ReactPointerEvent<HTMLDivElement>): void => {
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

  const currentProjection = projection?.summon.id === summon.id ? projection : null;
  const visualSessionStatus: ISessionSummary["status"] = currentProjection?.sessionStatus ?? "idle";
  const visualActivityKind: ActivityKind = currentProjection?.activityKind ?? "session";
  const visualMotionMapping = currentProjection?.motionMapping ?? DEFAULT_HALO_PET_MOTION_MAPPING;
  const visualReplayId = currentProjection?.replayId ?? `${summon.id}:idle`;
  const visualReplayKey = `${visualReplayId}:${visualSessionStatus}:${visualActivityKind}:steady`;

  return (
    <main className="completion-pet-root" data-visible="true" data-expanded={expanded ? "true" : "false"} data-pet-size={summon.petSize} data-purpose={summon.purpose} data-preview={summon.purpose === "setup-preview" ? "true" : undefined} data-projection-replay-id={visualReplayId}>
      <div className="pet-surface" onPointerDown={beginPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}>
        <button ref={companionRef} className="pet-target" type="button" aria-label="Agent Companion. Click to toggle actions" onClick={() => { if (!suppressClickRef.current) void setBubbleOpen(!expanded); }} data-tauri-drag-region="false">
          <HaloPet
            activityKind={visualActivityKind}
            className="completion-pet-visual"
            key={visualReplayKey}
            loadout={summon.loadout}
            motionMapping={visualMotionMapping}
            pet={summon.pet}
            status={visualSessionStatus}
          />
        </button>
      </div>

      {expanded ? (
        <div className="pet-bubble" role="dialog" aria-label="Companion Actions">
          <div className="pet-bubble-head">
            <span>Agent Companion</span>
            <button ref={closeActionRef} className="bubble-close-btn" type="button" aria-label="Hide companion" onClick={() => void hide()} data-tauri-drag-region="false">
              <X size={12} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
};

