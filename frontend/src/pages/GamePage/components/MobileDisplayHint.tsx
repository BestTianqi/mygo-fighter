import { useState } from "react";
import { canEnterImmersive } from "../functions/immersive";
export function MobileDisplayHint() {
  const [dismissed, setDismissed] = useState(false);
  const standalone =
    window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)")
      .matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (dismissed || standalone || canEnterImmersive()) return null;
  return (
    <aside className="absolute inset-x-3 top-[max(5rem,env(safe-area-inset-top))] z-40 mx-auto max-w-sm rounded-none border border-pink-300/40 bg-slate-950/95 p-3 text-[11px] text-slate-200 shadow-xl">
      <button
        aria-label="关闭全屏提示"
        onClick={() => setDismissed(true)}
        className="float-right -mr-2 -mt-2 grid size-10 place-items-center text-lg"
      >
        ×
      </button>
      <p className="mb-1 font-bold text-pink-200">让舞台再大一点 ↗</p>
      <p>
        横屏游玩更舒适。若浏览器仍显示工具栏，可在浏览器菜单中选择“添加到主屏幕”，再从主屏幕打开游戏。
      </p>
    </aside>
  );
}
