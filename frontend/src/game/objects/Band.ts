import type { Match } from "../engine";
import type { BandId } from "./BandId";
import type { Character } from "./Character";
import type { Fighter, FighterIdentity } from "./Fighter";
import type { Input } from "./Input";
import type { Move } from "./Move";
import type { Scheme } from "./Scheme";

export type Stance = "standing" | "crouch" | "air";

/** A move-list row: the move plus the catalog key it was registered under. */
export type MoveRow = Move & { key: string };

/** One row of the in-game command list. */
export interface BindingRow {
  move: string;
  key: string;
  key2: string;
}

/** Band-wide transformation capability (currently only Mujica declares one). */
export interface BandTransform {
  move: string;
  duration: number;
  energy: number;
  damageMultiplier: number;
  speedMultiplier: number;
}

/** Where a band's artwork lives in the runtime manifest; omitted means the base atlas. */
export interface BandPresentation {
  forms?: string;
  portraits?: string;
  idle?: string;
}

/**
 * The contract every band module implements. `defineBand` supplies defaults, so a
 * band with no special mechanics only declares an id, characters and moves.
 */
export interface Band {
  id: BandId;
  label: string;
  characters: Character[];
  moves: Record<string, Move>;
  forms: string[];
  /** True when the band is played with the U/I/O skill scheme instead of a command table. */
  unified: boolean;
  formFor(f: FighterIdentity): string;
  prefixFor(f: FighterIdentity): string;
  normalFor(f: FighterIdentity, button: string, stance?: Stance): string;
  schemeFor(f: FighterIdentity): Scheme;
  movesFor(
    all: Record<string, Move>,
    character: number,
    penguin?: boolean,
  ): MoveRow[];
  owns(f: FighterIdentity, move: Move, name: string): boolean;
  profileFor(f: FighterIdentity): Character;
  /** Whether stance restrictions apply (the classic table never allowed air moves on the ground). */
  stanceLocked(f: FighterIdentity): boolean;
  /** Cancel depth before a fighter can no longer chain attacks. */
  cancelDepth(f: FighterIdentity): number;
  /** Turn a raw button into a move name; null means "not this band's command". */
  command?(
    match: Match,
    f: Fighter,
    requested: string,
    input: Input,
  ): string | null;
  /** Extra unified-mode skill resolution, tried after the scheme. */
  skill?(
    f: Fighter,
    input: Input,
    pressed: (key: string) => boolean,
    airborne: boolean,
  ): string | null | undefined;
  /** Air-only cancel targets (e.g. MyGO's dive). */
  airCancel?(f: Fighter, name: string): boolean;
  /** Extra "this cancel is always legal" rules. */
  extraCancel?(match: Match, f: Fighter, name: string): boolean;
  /** Returns the move to start, which lets a band upgrade a move (e.g. beat boost). */
  beforeStart?(match: Match, f: Fighter, name: string): string | null;
  /** Per-move start effects, after the shared movement setup. */
  onStart?(
    match: Match,
    f: Fighter,
    move: Move,
    name: string,
    ground: boolean,
  ): void;
  /** Band-specific CPU tactics, after the shared navigation logic. */
  ai?(match: Match, side: number, input: Input): Input;
  /** Extra command-list rows inserted before the transform/super rows. */
  extraBindings?(f: FighterIdentity): BindingRow[];
  /** Post-balance move overrides; runs after every band and the shared passes. */
  tune?(moves: Record<string, Move>): void;
  transform?: BandTransform;
  presentation?: BandPresentation;
}
