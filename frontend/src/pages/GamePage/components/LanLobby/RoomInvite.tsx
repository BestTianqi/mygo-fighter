import { useRef, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import {
  lanAddresses,
  localBrowser,
  onlineLink,
} from "../../functions/onlineLinks";

export function RoomInvite({ code }: { code: string }) {
  const [address, setAddress] = useState(lanAddresses[0]);
  const [message, setMessage] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const invite =
    localBrowser && !address ? "" : onlineLink(location.href, code, address);

  if (!invite)
    return (
      <p className="mt-2 text-sm text-muted">
        请从 <code>start-lan.cmd</code>{" "}
        打开的页面创建邀请链接。也可以把启动窗口里的局域网地址和上方房间码发给朋友。
      </p>
    );

  return (
    <section
      className="mt-3 grid w-full gap-2 bg-panel p-3"
      aria-label="邀请朋友"
    >
      <p className="text-xs leading-5 text-muted">
        把链接发给朋友。对方打开后点「加入房间」。
      </p>
      {lanAddresses.length > 1 && (
        <label className="grid gap-1 text-xs text-muted">
          局域网地址
          <select
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setMessage("");
            }}
            className="min-h-10 bg-void px-3 text-ivory"
          >
            {lanAddresses.map((ip) => (
              <option key={ip}>{ip}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={field}
          aria-label="邀请链接"
          readOnly
          value={invite}
          onFocus={(event) => event.target.select()}
          className="min-h-10 min-w-0 flex-1 bg-void px-3 text-sm text-ivory"
        />
        <Button
          className="min-h-10 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(invite);
            } catch {
              field.current?.focus();
              field.current?.select();
              if (!document.execCommand("copy")) {
                setMessage("已选中链接，请手动复制。");
                return;
              }
            }
            setMessage("邀请链接已复制。");
          }}
        >
          复制邀请链接
        </Button>
      </div>
      {message && (
        <p role="status" className="text-xs text-silver">
          {message}
        </p>
      )}
    </section>
  );
}
