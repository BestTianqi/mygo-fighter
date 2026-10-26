import { useEffect, useState } from "react";

const coarsePointer = "(pointer: coarse)";

/**
 * Phones and tablets play the battle on an immersive, full-viewport stage.
 * Desktop windows keep the scrollable review layout even when they are narrow.
 */
export function useMobilePlay() {
  const [mobile, setMobile] = useState(
    () => window.matchMedia(coarsePointer).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(coarsePointer);
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return mobile;
}
