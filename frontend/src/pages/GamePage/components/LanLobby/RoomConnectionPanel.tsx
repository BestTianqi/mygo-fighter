import { Button } from "../../../../components/ui/Button";

import type { LanLobbyModel } from "./hooks/useLanLobby";

export function RoomConnectionPanel({ model }: { model: LanLobbyModel }) {
  const { working, code, setCode, pendingLabel } = model;
  return (
    <div className="space-y-4" aria-busy={working}>
      <section className="bg-panel p-4 sm:p-5" aria-label="创建房间">
        <p className="mb-4 text-xs leading-5 text-muted">
          创建房间，邀请朋友开战。
        </p>
        <Button
          primary
          disabled={working}
          onClick={model.createRoom}
          className="w-full"
        >
          {working && pendingLabel === "正在创建房间…"
            ? pendingLabel
            : "创建房间"}
        </Button>
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === 6 && !working) model.joinRoom();
        }}
        className="bg-void p-4 sm:p-5"
      >
        <label className="block font-semibold text-ivory" htmlFor="room-code">
          加入房间
        </label>
        <p
          id="room-code-help"
          className="mt-1 mb-3 text-xs leading-5 text-muted"
        >
          输入朋友分享的 6 位房间码。
        </p>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            id="room-code"
            value={code}
            disabled={working}
            onChange={(event) =>
              setCode(
                event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""),
              )
            }
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="room-code-help"
            placeholder="六位房间码"
            className="min-h-12 min-w-0 basis-40 flex-1 rounded-none bg-panel px-4 font-mono text-lg uppercase tracking-[.2em] text-ivory outline-offset-2 focus-visible:outline-2 focus-visible:outline-ember disabled:opacity-60"
          />
          <Button
            type="submit"
            disabled={code.length !== 6 || working}
            className="min-h-12 max-sm:w-full"
          >
            {working && pendingLabel === "正在加入房间…"
              ? pendingLabel
              : "加入房间"}
          </Button>
        </div>
      </form>
    </div>
  );
}
