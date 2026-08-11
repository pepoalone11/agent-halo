import { Clock3, Dumbbell, Timer } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { MovementLauncher } from "../movement/movement-launcher";
import type { MovementExerciseId } from "../movement/types";
import { PomodoroPanel } from "../pomodoro/components";
import type { IUsePomodoroResult } from "../pomodoro/usePomodoro";
import { StopwatchPanel } from "../stopwatch/components";
import type { IUseStopwatchResult } from "../stopwatch/useStopwatch";

const FOCUS_TOOL_STORAGE_KEY = "agent-halo.focus-tool";
type FocusTool = "pomodoro" | "stopwatch" | "move";

const FOCUS_TOOLS: readonly FocusTool[] = ["pomodoro", "stopwatch", "move"];

export interface IFocusToolsPanelProps {
  pomodoro: IUsePomodoroResult;
  stopwatch: IUseStopwatchResult;
  nativeAvailable: boolean;
  onResetAllPomodoro: () => void;
  onShowCompanion: () => Promise<boolean>;
  onStartMovement: (exerciseId: MovementExerciseId) => Promise<boolean>;
}

const readFocusTool = (stopwatch: IUseStopwatchResult): FocusTool => {
  try {
    const stored = window.localStorage.getItem(FOCUS_TOOL_STORAGE_KEY);
    if (FOCUS_TOOLS.includes(stored as FocusTool)) return stored as FocusTool;
  } catch {
    // Fall through to the current activity-aware default.
  }
  return stopwatch.state.status === "idle" ? "pomodoro" : "stopwatch";
};

const writeFocusTool = (tool: FocusTool): void => {
  try {
    window.localStorage.setItem(FOCUS_TOOL_STORAGE_KEY, tool);
  } catch {
    // Runtime selection remains authoritative when storage is unavailable.
  }
};

export const FocusToolsPanel = ({ nativeAvailable, onResetAllPomodoro, onShowCompanion, onStartMovement, pomodoro, stopwatch }: IFocusToolsPanelProps) => {
  const [activeTool, setActiveTool] = useState<FocusTool>(() => readFocusTool(stopwatch));

  const selectTool = (tool: FocusTool): void => {
    setActiveTool(tool);
    writeFocusTool(tool);
  };

  const handleToolKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: FocusTool): void => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = FOCUS_TOOLS.indexOf(current);
    const next: FocusTool = event.key === "Home"
      ? FOCUS_TOOLS[0]
      : event.key === "End"
        ? FOCUS_TOOLS[FOCUS_TOOLS.length - 1]
        : FOCUS_TOOLS[(currentIndex + (event.key === "ArrowRight" ? 1 : -1) + FOCUS_TOOLS.length) % FOCUS_TOOLS.length];
    selectTool(next);
    window.requestAnimationFrame(() => document.getElementById(`focus-tool-${next}`)?.focus());
  };

  return (
    <div className="focus-tools-panel">
      <div className="focus-tool-tabs" role="tablist" aria-label="Focus tools">
        <button id="focus-tool-pomodoro" type="button" role="tab" aria-selected={activeTool === "pomodoro"} aria-controls="focus-tool-panel-pomodoro" tabIndex={activeTool === "pomodoro" ? 0 : -1} onClick={() => selectTool("pomodoro")} onKeyDown={(event) => handleToolKeyDown(event, "pomodoro")} data-tauri-drag-region="false">
          <Timer size={12} strokeWidth={2.3} />
          <span>Pomodoro</span>
          {pomodoro.state.status !== "idle" || pomodoro.completionVisible ? <small>{pomodoro.completionVisible ? "Done" : pomodoro.countdownLabel}</small> : null}
        </button>
        <button id="focus-tool-stopwatch" type="button" role="tab" aria-selected={activeTool === "stopwatch"} aria-controls="focus-tool-panel-stopwatch" tabIndex={activeTool === "stopwatch" ? 0 : -1} onClick={() => selectTool("stopwatch")} onKeyDown={(event) => handleToolKeyDown(event, "stopwatch")} data-tauri-drag-region="false">
          <Clock3 size={12} strokeWidth={2.3} />
          <span>Stopwatch</span>
          {stopwatch.state.status !== "idle" ? <small>{stopwatch.compactElapsedLabel}</small> : null}
        </button>
        <button id="focus-tool-move" type="button" role="tab" aria-selected={activeTool === "move"} aria-controls="focus-tool-panel-move" tabIndex={activeTool === "move" ? 0 : -1} onClick={() => selectTool("move")} onKeyDown={(event) => handleToolKeyDown(event, "move")} data-tauri-drag-region="false">
          <Dumbbell size={12} strokeWidth={2.3} />
          <span>Move</span>
        </button>
      </div>

      {activeTool === "pomodoro" ? (
        <div id="focus-tool-panel-pomodoro" role="tabpanel" aria-labelledby="focus-tool-pomodoro">
          <PomodoroPanel pomodoro={pomodoro} onResetAll={onResetAllPomodoro} />
        </div>
      ) : activeTool === "stopwatch" ? (
        <div id="focus-tool-panel-stopwatch" role="tabpanel" aria-labelledby="focus-tool-stopwatch">
          <StopwatchPanel stopwatch={stopwatch} />
        </div>
      ) : (
        <div id="focus-tool-panel-move" role="tabpanel" aria-labelledby="focus-tool-move">
          <MovementLauncher nativeAvailable={nativeAvailable} onShowCompanion={onShowCompanion} onStartMovement={onStartMovement} />
        </div>
      )}
    </div>
  );
};
