import { KEYS1, KEYS2 } from "../../../game/controls";
import {
  actions,
  type Direction,
  type Input,
} from "../../../game/objects/Input";
export class InputController {
  private readonly held = new Set<string>();
  private readonly ids = new Map<string, number>();
  private readonly gestures = new Map<string, Direction>();
  private readonly taps = new Set<string>();
  private readonly touched = new Set<string>();
  private readonly abort = new AbortController();
  constructor(
    private readonly changed: () => void,
    private readonly pause: () => void,
    private readonly help: () => void,
  ) {
    const options = { signal: this.abort.signal };
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.code === "F1") {
          event.preventDefault();
          this.help();
          return;
        }
        if (
          (event.target as HTMLElement)?.closest(
            'input,select,textarea,dialog,[role="dialog"]',
          )
        )
          return;
        if (
          !(
            [...Object.values(KEYS1), ...Object.values(KEYS2)] as string[]
          ).includes(event.code)
        )
          return;
        event.preventDefault();
        if (!event.repeat) this.press(event.code);
      },
      options,
    );
    window.addEventListener(
      "keyup",
      (event) => this.release(event.code),
      options,
    );
    window.addEventListener(
      "blur",
      () => {
        this.clear();
        this.pause();
      },
      options,
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          this.clear();
          this.pause();
        }
      },
      options,
    );
  }
  press(code: string, touch = false) {
    if (this.held.has(code)) return;
    this.held.add(code);
    this.taps.add(code);
    if (touch) this.touched.add(code);
    this.ids.set(code, (this.ids.get(code) ?? 0) + 1);
    const keys = (Object.values(KEYS2) as string[]).includes(code)
      ? KEYS2
      : KEYS1;
    this.gestures.set(code, {
      left: this.held.has(keys.left),
      right: this.held.has(keys.right),
      crouch: this.held.has(keys.crouch),
      jump: this.held.has(keys.jump),
    });
    this.changed();
  }
  release(code: string) {
    const wasHeld = this.held.delete(code);
    this.touched.delete(code);
    if (wasHeld) this.changed();
  }

  input(side: number): Input {
    const keys = side === 1 ? KEYS2 : KEYS1;
    const values = Object.fromEntries(
      actions.map((action) => [
        action,
        this.held.has(keys[action]) || this.taps.has(keys[action]),
      ]),
    );
    return {
      ...values,
      unified: true,
      touchLight: this.touched.has(keys.light),
      pressIds: Object.fromEntries(
        actions.map((action) => [action, this.ids.get(keys[action]) ?? 0]),
      ),
      pressDirections: Object.fromEntries(
        actions.map((action) => [
          action,
          this.gestures.get(keys[action]) ?? {},
        ]),
      ),
    };
  }
  clear() {
    this.held.clear();
    this.taps.clear();
    this.touched.clear();
    this.gestures.clear();
    this.changed();
  }
  consumed() {
    this.taps.clear();
  }
  dispose() {
    this.abort.abort();
    this.clear();
  }
}
