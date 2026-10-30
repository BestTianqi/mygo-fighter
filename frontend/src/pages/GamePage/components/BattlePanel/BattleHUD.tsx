import { bandPortrait } from "../../../../assets/bandArt";
import type { Assets } from "../../../../assets/objects/Assets";
import { teamSizeFor } from "../../../../game/battleRules";
import { ROSTER } from "../../../../game/engine";
import type { GameView } from "../../objects/GameView";

export function BattleHUD({
  view,
  assets,
  mobile,
  fullField,
}: {
  view: GameView;
  assets: Assets;
  mobile: boolean;
  fullField: boolean;
}) {
  const brawl = view.config?.format === "3ffa";
  return (
    <div
      aria-label="对战状态"
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 grid ${brawl ? "grid-cols-3" : "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"} items-start gap-2 bg-linear-to-b from-slate-950/95 via-slate-950/65 to-transparent text-white ${
        fullField
          ? "px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[calc(max(0.5rem,env(safe-area-inset-top))+3.25rem)] pb-6 portrait:pt-3 sm:gap-6"
          : mobile
            ? "px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-6 pb-8"
            : "p-3 pt-8 pb-12 sm:gap-6 sm:p-6 sm:pt-9 sm:pb-16"
      }`}
    >
      {brawl ? (
        <>
          <div
            className="col-span-3 flex items-center justify-center gap-2 text-[10px] text-slate-200"
            aria-label="混战剩余时间"
          >
            <span>三人混战 · 每人 3 角色</span>
            <strong className="font-mono text-base text-white">
              {view.config?.rules?.infiniteTime
                ? "∞"
                : Math.ceil(view.remaining / 1000)}
            </strong>
          </div>
          {view.fighters.map((_, side) => (
            <FighterHUD
              key={side}
              side={side}
              view={view}
              assets={assets}
              mobile={mobile}
            />
          ))}
        </>
      ) : (
        <>
          {view.fighters[0] && (
            <FighterHUD side={0} view={view} assets={assets} mobile={mobile} />
          )}
          <div className="text-center">
            <p
              aria-label={
                view.config?.rules?.infiniteTime ? "无限时间" : "剩余时间"
              }
              className={`font-mono text-2xl font-bold text-white ${mobile ? "" : "sm:text-4xl"}`}
            >
              {view.config?.rules?.infiniteTime
                ? "∞"
                : Math.ceil(view.remaining / 1000)
                    .toString()
                    .padStart(2, "0")}
            </p>
            <small className="whitespace-nowrap text-[9px] text-slate-200 sm:text-[10px]">
              第 {view.round} 回合
            </small>
            {view.config?.rules?.oneHitKO && (
              <p className="mt-1 text-[9px] font-semibold text-amber-200">
                一击决胜
              </p>
            )}
          </div>
          {view.fighters[1] && (
            <FighterHUD side={1} view={view} assets={assets} mobile={mobile} />
          )}
        </>
      )}
    </div>
  );
}

function FighterHUD({
  side,
  view,
  assets,
  mobile,
}: {
  side: number;
  view: GameView;
  assets: Assets;
  mobile: boolean;
}) {
  const fighter = view.fighters[side];
  const brawl = view.config?.format === "3ffa";
  const reverse = !brawl && side === 1;
  const remaining = view.teamRemaining[side] ?? 0;
  const respawn = view.respawnMs[side] ?? 0;
  const lineup = view.config?.teams?.[side] ?? [];
  const currentSlot = lineup.length - remaining;
  const label =
    view.network.room || view.config?.mode === "duel" || side === 0
      ? `${side + 1}P`
      : brawl
        ? `CPU ${side}`
        : "CPU";
  return (
    <div
      aria-label={`${label} · ${fighter.name}${view.network.room && view.network.side === side ? " · 你" : ""}`}
      className={`min-w-0 bg-slate-950/55 p-1.5 sm:p-2 ${reverse ? "text-right" : ""} ${brawl && remaining === 0 ? "opacity-55" : ""}`}
    >
      <div
        className={`mb-1.5 flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}
      >
        {!mobile && (
          <img
            src={
              bandPortrait(assets, fighter.character)?.face ??
              assets.characters[fighter.character].portrait
            }
            alt=""
            className="hidden size-9 rounded-none object-cover object-top sm:block"
          />
        )}
        <div className="min-w-0">
          <p
            className={`mb-0.5 text-[9px] font-bold ${side === 0 ? "text-pink-200" : side === 1 ? "text-cyan-200" : "text-amber-200"}`}
          >
            {label}
            {view.network.room && view.network.side === side ? " · 你" : ""}
          </p>
          <p
            className={`truncate text-[11px] font-bold ${mobile ? "sm:text-xs" : "sm:text-base"}`}
          >
            {fighter.name}
            {fighter.transformed && (
              <span className="ml-1 text-pink-200">✦</span>
            )}
            {fighter.lifesteal && (
              <span
                aria-label="吸血效果"
                className="ml-2 text-[9px] font-normal text-rose-200 sm:text-xs"
              >
                吸血 {Math.round(fighter.lifesteal.ratio * 100)}% ·{" "}
                {Math.ceil(fighter.lifesteal.ms / 1000)}秒
              </span>
            )}
            {view.config?.rules?.vampire && !fighter.lifesteal && (
              <span className="ml-2 text-[9px] font-normal text-rose-200 sm:text-xs">
                吸血 25%
              </span>
            )}
          </p>
          <p
            className={`whitespace-nowrap font-mono text-[9px] tabular-nums text-slate-100 ${mobile ? "" : "sm:text-xs"}`}
          >
            {Math.max(0, Math.ceil(fighter.hp))} /{" "}
            {view.config?.rules?.maxHealth ?? 200} HP{" "}
            {fighter.beats > 0 && `· ${fighter.beats} 拍`}
          </p>
        </div>
      </div>
      <div
        role="meter"
        aria-label={`${side + 1}P 生命`}
        aria-valuemin={0}
        aria-valuemax={view.config?.rules?.maxHealth ?? 200}
        aria-valuenow={fighter.hp}
        className={`h-2.5 overflow-hidden rounded-none bg-slate-600 ring-1 ring-white/15 ${mobile ? "sm:h-3" : "sm:h-4"}`}
      >
        <div
          className={`h-full transition-[width] duration-75 ${reverse ? "ml-auto" : ""} ${side === 0 ? "bg-pink-200" : side === 1 ? "bg-cyan-200" : "bg-amber-200"}`}
          style={{
            width: `${Math.max(0, Math.min(100, (fighter.hp / (view.config?.rules?.maxHealth ?? 200)) * 100))}%`,
          }}
        />
      </div>
      <div
        role="meter"
        aria-label={`${side + 1}P 共鸣`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fighter.energy}
        className={`mt-1 flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}
      >
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-none bg-slate-700">
          <div
            className={`h-full ${reverse ? "ml-auto" : ""} ${side === 0 ? "bg-pink-100" : side === 1 ? "bg-cyan-100" : "bg-amber-100"}`}
            style={{ width: `${fighter.energy}%` }}
          />
        </div>
        <span
          aria-hidden="true"
          className={`shrink-0 whitespace-nowrap font-mono text-[9px] tabular-nums text-slate-100 ${mobile ? "" : "sm:text-[10px]"}`}
        >
          {view.config?.rules?.infiniteEnergy
            ? "∞ 共鸣"
            : `${Math.round(fighter.energy)} 共鸣`}
        </span>
      </div>
      <p
        className={`mt-1 text-[9px] text-slate-200 ${mobile ? "" : "sm:text-[10px]"}`}
      >
        {brawl
          ? remaining === 0
            ? "已淘汰"
            : respawn > 0
              ? `${Math.ceil(respawn / 1000)} 秒后上场 · 余 ${remaining} 人`
              : `剩余 ${remaining} 人`
          : teamSizeFor(view.config?.format) > 1
            ? `剩余 ${view.teamRemaining[side]} 人`
            : `胜 ${view.wins[side] ?? 0} 回合`}{" "}
        {fighter.combo > 1 && (
          <span className="ml-2 text-white">{fighter.combo} HITS</span>
        )}
      </p>
      {brawl && !mobile && (
        <div
          className="mt-1 flex min-w-0 gap-1"
          aria-label={`${label} 出场顺序`}
        >
          {lineup.map((id, slot) => (
            <div
              key={slot}
              className={`relative min-w-0 flex-1 overflow-hidden ${slot < currentSlot ? "opacity-25 grayscale" : ""}`}
            >
              <img
                src={
                  bandPortrait(assets, id)?.face ??
                  assets.characters[id].portrait
                }
                alt={ROSTER[id]?.name ?? "角色"}
                className="h-5 w-full object-cover object-center sm:h-7"
              />
              <span className="absolute bottom-0 inset-x-0 bg-slate-950/75 text-center text-[7px] text-white">
                {slot < currentSlot
                  ? "退场"
                  : slot === currentSlot
                    ? respawn > 0
                      ? "待登场"
                      : "出战"
                    : "替补"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
