import { Button } from "../../../../components/ui/Button";

import type { LanLobbyModel } from "./hooks/useLanLobby";

export function RoomConnectionPanel({ model }: { model: LanLobbyModel }) {
  const { working, code, setCode, pendingLabel } = model;
  return (
    <div className="space-y-4" aria-busy={working}>
      <p className="text-sm leading-6 text-[#61718b]">
        和朋友打开同一个游戏地址。一人创建房间，其他人凭房间码加入。
      </p>
      <section
        className="border border-[#d9e2ef] bg-white p-4 sm:p-5"
        aria-label="创建房间"
      >
        <h3 className="font-semibold text-[#101d33]">邀请朋友一起玩</h3>
        <p className="mt-1 mb-4 text-xs leading-5 text-[#61718b]">
          创建后可设置模式、场地和规则，支持双人对战与三人混战。
        </p>
        <Button
          tone="light"
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
        className="border border-[#d9e2ef] bg-[#f3f7fc] p-4 sm:p-5"
      >
        <label
          className="block font-semibold text-[#101d33]"
          htmlFor="room-code"
        >
          已有房间码？
        </label>
        <p
          id="room-code-help"
          className="mt-1 mb-3 text-xs leading-5 text-[#61718b]"
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
            className="min-h-12 min-w-0 basis-40 flex-1 rounded-none border border-[#d9e2ef] bg-white px-4 font-mono text-lg uppercase tracking-[.2em] text-[#101d33] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#1aa8b8] disabled:opacity-60"
          />
          <Button
            tone="light"
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
