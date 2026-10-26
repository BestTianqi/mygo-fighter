/** One code module per band; ids are independent of the display label. */
export type BandId = "mygo" | "mujica" | "mewtype";

/** Display labels are data, so a band can show a sub-band name (e.g. Fairy Bouquet). */
export const BAND_LABEL: Record<string, string> = {
  mygo: "MYGO!!!!!",
  mujica: "AVE MUJICA",
  mewtype: "夢限大 MEWTYPE",
  fairybouquet: "FAIRY BOUQUET",
};
