import type { Band } from "../objects/Band";
import type { Move } from "../objects/Move";

/**
 * Registry validation. Runs when the band registry loads, so a malformed band
 * fails immediately in the browser, the JVM kernel and the check script.
 */
export function validateBands(bands: Band[]): Band[] {
  if (!bands.length) throw new Error("At least one band must be registered");
  const ids = new Set<string>();
  for (const band of bands) {
    if (ids.has(band.id)) throw new Error(`Duplicate band id: ${band.id}`);
    ids.add(band.id);
  }
  const sorted = [...bands].sort(
    (a, b) => (a.characters[0]?.id ?? 0) - (b.characters[0]?.id ?? 0),
  );
  const seenIds = new Map<number, string>();
  const seenKeys = new Set<string>();
  for (const band of sorted) {
    for (const character of band.characters) {
      const id = character.id;
      if (id === undefined)
        throw new Error(`Band ${band.id} has a character without an id`);
      const owner = seenIds.get(id);
      if (owner)
        throw new Error(
          `Character id ${id} is claimed by both ${owner} and ${band.id}`,
        );
      seenIds.set(id, band.id);
      if (character.bandId !== band.id)
        throw new Error(
          `Character ${id} has bandId ${character.bandId}, expected ${band.id}`,
        );
      if (character.key) {
        if (seenKeys.has(character.key))
          throw new Error(`Duplicate character key: ${character.key}`);
        seenKeys.add(character.key);
      }
    }
    const first = band.characters[0].id!;
    band.characters.forEach((character, index) => {
      if (character.id !== first + index)
        throw new Error(`Band ${band.id} character ids must be consecutive`);
    });
  }
  const all = sorted.flatMap((band) => band.characters.map((c) => c.id!));
  all.forEach((id, index) => {
    if (id !== index)
      throw new Error(
        `Character ids must cover 0..${all.length - 1}; found ${id} at index ${index}`,
      );
  });
  return sorted;
}

/** Cross-band checks that only make sense once the catalog has been assembled. */
export function validateCatalog(
  bands: Band[],
  moves: Record<string, Move>,
): void {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(moves, key);
  for (const band of bands) {
    const ids = new Set(band.characters.map((character) => character.id!));
    for (const [key, move] of Object.entries(band.moves)) {
      if (move.ownerCharacter !== undefined && !ids.has(move.ownerCharacter))
        throw new Error(
          `Move ${key} of ${band.id} owns unknown character ${move.ownerCharacter}`,
        );
      if (move.form !== undefined && !band.forms.includes(move.form))
        throw new Error(
          `Move ${key} of ${band.id} uses form "${move.form}", expected one of ${band.forms.join(", ")}`,
        );
      if (!has(key))
        throw new Error(`Move ${key} of ${band.id} was not merged into the catalog`);
    }
    if (band.transform && !has(band.transform.move))
      throw new Error(
        `Band ${band.id} transform move ${band.transform.move} is missing`,
      );
    for (const character of band.characters) {
      const scheme = band.schemeFor({ character: character.id! });
      const refs = [
        ...scheme.base,
        ...(scheme.super ? [scheme.super] : []),
        ...(scheme.transform ? [scheme.transform] : []),
        ...Object.values(scheme.variants),
      ];
      for (const ref of refs)
        if (!has(ref))
          throw new Error(
            `Band ${band.id} character ${character.id} scheme references missing move "${ref}"`,
          );
      for (const row of band.movesFor(moves, character.id!))
        if (!has(row.key))
          throw new Error(
            `Band ${band.id} character ${character.id} lists missing move "${row.key}"`,
          );
    }
  }
}
