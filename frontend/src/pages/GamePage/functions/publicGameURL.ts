import { publicServerURL } from "./onlineLinks";

/** Static builds use the public server for room play. */
export const publicGameURL = (() => {
  const configured = import.meta.env.VITE_PUBLIC_GAME_URL?.trim();
  if (!configured) return publicServerURL;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : publicServerURL;
  } catch {
    return publicServerURL;
  }
})();
