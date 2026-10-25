/** Optional public server link. Static builds never assume that their own host has a backend. */
export const publicGameURL = (() => {
  const configured = import.meta.env.VITE_PUBLIC_GAME_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
})();
