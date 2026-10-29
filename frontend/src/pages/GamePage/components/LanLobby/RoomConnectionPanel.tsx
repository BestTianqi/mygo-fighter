import { Button } from "../../../../components/ui/Button";

import type { LanLobbyModel } from "./hooks/useLanLobby";

export function RoomConnectionPanel({ model }: { model: LanLobbyModel }) {
  const { working, code, setCode } = model;
  return (
    <div className="space-y-4">
      <p className="mb-5 text-sm leading-6 text-[#80786d]">
        所有玩家打开同一个游戏服务器地址。一人创建房间并选择对战形式，其他玩家输入房间码。三人混战支持三位玩家各带
        3 名角色。
      </p>
      <Button
        tone="light"
        primary
        disabled={working}
        onClick={model.createRoom}
        className="w-full"
      >
        创建房间
      </Button>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === 6 && !working) model.joinRoom();
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor="room-code">
          房间码
        </label>
        <input
          id="room-code"
          value={code}
          disabled={working}
          onChange={(event) =>
            setCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))
          }
          maxLength={6}
          autoComplete="off"
          placeholder="六位房间码"
          className="min-h-11 min-w-0 flex-1 rounded-none bg-[#30251a]/6 px-4 font-mono uppercase tracking-widest"
        />
        <Button
          tone="light"
          type="submit"
          disabled={code.length !== 6 || working}
        >
          加入房间
        </Button>
      </form>
    </div>
  );
}
