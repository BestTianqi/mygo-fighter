import type { Assets } from "../../../../assets/objects/Assets";
import { bandFor } from "../../../../game/combatData";
import { schemeFor } from "../../../../game/controls";
import type { FighterIdentity } from "../../../../game/objects/Fighter";
import type { MatchConfig } from "../../../../game/objects/MatchOptions";
import { presentationFor } from "../../functions/presentationFor";
import { ultimateFinishFor } from "../../functions/ultimateFinishFor";
import { backgroundVideoEnabled } from "./backgroundVideoEnabled";

function videoUrls(assets: Assets, config: MatchConfig) {
  const urls = new Set<string>();
  if (config.rules?.disableSupers || !backgroundVideoEnabled()) return urls;
  for (const character of new Set(config.teams?.flat() ?? config.characters)) {
    const forms: FighterIdentity[] = [{ character }];
    if (!config.rules?.disableTransform) {
      if (character === 2) forms.push({ character, penguin: true });
      if (bandFor(character).transform)
        forms.push({ character, stageForm: true });
    }
    for (const form of forms) {
      const src = presentationFor(
        assets,
        form,
        schemeFor(form).super ?? null,
      )?.video;
      if (src) urls.add(src);
      const finish = ultimateFinishFor(assets, form)?.video;
      if (finish) urls.add(finish);
    }
  }
  return urls;
}

function loadVideo(url: string, signal: AbortSignal) {
  return new Promise<HTMLVideoElement | null>((resolve) => {
    if (signal.aborted) {
      resolve(null);
      return;
    }
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const finish = (ready: boolean) => {
      signal.removeEventListener("abort", failed);
      video.removeEventListener("loadeddata", loaded);
      video.removeEventListener("error", failed);
      if (!ready) {
        video.removeAttribute("src");
        video.load();
      }
      resolve(ready ? video : null);
    };
    const loaded = () => finish(true);
    const failed = () => finish(false);
    signal.addEventListener("abort", failed, { once: true });
    video.addEventListener("loadeddata", loaded, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.src = url;
    video.load();
  });
}

/** Retain the element that decoded the first frame for the actual cast. */
export async function prepareSuperVideos(
  assets: Assets,
  config: MatchConfig,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
) {
  const urls = [...videoUrls(assets, config)];
  const videos = new Map<string, HTMLVideoElement>();
  const deadline = new AbortController();
  const cancel = () => deadline.abort();
  const timeout = setTimeout(cancel, 12000);
  signal.addEventListener("abort", cancel, { once: true });
  let next = 0;
  let completed = 0;
  const worker = async () => {
    while (!deadline.signal.aborted && next < urls.length) {
      const url = urls[next++];
      const video = await loadVideo(url, deadline.signal);
      if (video) videos.set(url, video);
      onProgress(++completed / urls.length);
    }
  };
  try {
    if (!signal.aborted)
      await Promise.all(
        Array.from({ length: Math.min(3, urls.length) }, worker),
      );
    onProgress(1);
    return videos;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}
