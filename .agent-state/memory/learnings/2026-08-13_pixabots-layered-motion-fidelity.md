# Pixabots layered motion fidelity

Tags: `agent-halo`, `pixabots`, `motion`, `layered-assets`, `visual-acceptance`

When a modular sprite family is migrated from precomposed strips to runtime layers, preserve the source's **motion ownership**, not merely its appearance and timing.

- Do not replace per-layer character motion with a generic `transform` on the whole character container.
- For Pixabots Idle, animate Top, Head/Eyes, and Body independently using the upstream eight-frame bounce; run blink/sequence playback inside each moving layer so transforms do not overwrite sheet animation.
- For semantic state extensions such as Working, translate the approved layer offsets into explicit per-layer keyframes. Avoid whole-body rotation unless the accepted source itself does that.
- Structure DOM with an outer layer-motion wrapper and an inner sheet-playback element when both transforms and `background-position` animation must coexist.
- Tests must assert which element owns each animation, plus reduced-motion behavior, rather than checking only an animation name or visible asset path.
- Mechanical PASS does not prove motion quality. Install the real app and treat Mahiro's direct visual verdict as the final motion acceptance gate.
