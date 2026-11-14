import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { onlineLink } from "../functions/onlineLinks";
import { publicGameURL } from "../functions/publicGameURL";

const downloads = "https://github.com/BestTianqi/mygo-fighter/releases/latest";

export function OnlineGuide({
  onClose,
  onLobby,
  lobbyOpen,
}: {
  onClose: () => void;
  onLobby: () => void;
  lobbyOpen: boolean;
}) {
  const [host, setHost] = useState(true);
  const pages = import.meta.env.MODE === "pages";
  return (
    <Dialog title="联机教程" onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          primary={host}
          aria-pressed={host}
          onClick={() => setHost(true)}
        >
          我要开房
        </Button>
        <Button
          primary={!host}
          aria-pressed={!host}
          onClick={() => setHost(false)}
        >
          我要加入
        </Button>
      </div>
      <div className="space-y-5 text-sm leading-6 text-muted">
        {host ? (
          <>
            <section>
              <h3 className="mb-1 font-bold text-ivory">
                和朋友在同一个 Wi-Fi 下玩
              </h3>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  房主在 Windows 电脑上
                  <a className="text-ember underline" href={downloads}>
                    下载免安装版
                  </a>
                  ，完整解压，再双击 <code>start-lan.cmd</code>。
                </li>
                <li>
                  等待浏览器自动打开「联机对战」，点击「创建房间」。保持启动窗口开着。
                </li>
                <li>
                  点击「复制邀请链接」，发给朋友。朋友连上同一个
                  Wi-Fi，打开链接，再点击「加入房间」。
                </li>
              </ol>
            </section>
            <section>
              <h3 className="mb-1 font-bold text-ivory">
                和朋友不在同一个网络
              </h3>
              <p>
                双方都打开
                <a
                  className="text-ember underline"
                  href={onlineLink(publicGameURL)}
                >
                  公网联机大厅
                </a>
                。一人创建房间，复制邀请链接发给对方。
              </p>
            </section>
          </>
        ) : (
          <section>
            <h3 className="mb-1 font-bold text-ivory">
              用浏览器加入朋友的房间
            </h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                打开朋友发来的邀请链接，点击「加入房间」。如果先看到主菜单，点「联机对战」，再填入朋友发来的房间码。
              </li>
              <li>
                如果朋友只发了房间码，再问他要游戏地址。打开同一个游戏地址，点「联机对战」，填入六位房间码。
              </li>
              <li>
                局域网房间需要连到房主用的同一个 Wi-Fi
                或热点。公网房间可从不同网络进入。
              </li>
            </ol>
          </section>
        )}
        <section className="border-t border-line pt-4">
          <h3 className="mb-1 font-bold text-ivory">进房后怎么开打</h3>
          <p>
            房主先选对战模式。首次建议用
            1v1，两人各点一张角色卡，再各点一次「准备开战」。3v3
            车轮战是两人各选三名角色，三人混战需要第三位玩家。
          </p>
        </section>
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer font-bold text-ivory">
            朋友打不开链接，或者进不了房间？
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              确认房主的启动窗口还开着。Windows
              弹出防火墙提示时，可允许游戏通过专用网络。
            </li>
            <li>
              有多个局域网地址时，房主可在房间里换一个地址，再复制邀请链接。
            </li>
            <li>
              校园网或访客 Wi-Fi
              可能隔离设备。可以同连一台手机热点，或改用公网联机大厅。
            </li>
            <li>
              找不到房间时，检查双方打开的地址是否一样、房间码是否正确。房主重启后需重新开房。
            </li>
          </ul>
        </details>
      </div>
      <Button
        primary
        className="mt-5 w-full"
        onClick={
          pages ? () => location.assign(onlineLink(publicGameURL)) : onLobby
        }
      >
        {pages
          ? "打开公网联机大厅"
          : lobbyOpen
            ? "返回联机大厅"
            : "打开联机大厅"}
      </Button>
    </Dialog>
  );
}
