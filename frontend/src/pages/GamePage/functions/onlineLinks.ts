export const publicServerURL = "https://mygo-123-57-149-254.sslip.io/";

export const launchOptions = new URLSearchParams(location.search);

export const invitedRoom = /^[A-F\d]{6}$/i.test(launchOptions.get("room") ?? "")
  ? launchOptions.get("room")!.toUpperCase()
  : "";

export const localBrowser = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(
  location.hostname,
);

export const lanAddresses = localBrowser
  ? [...new Set(launchOptions.getAll("lan"))].filter((address) => {
      const parts = address.split(".");
      return (
        parts.length === 4 &&
        parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255) &&
        !/^(0\.|127\.|169\.254\.|198\.1[89]\.)/.test(address)
      );
    })
  : [];

export function onlineLink(base: string, code?: string, lanAddress?: string) {
  const link = new URL(base);
  if (lanAddress) link.hostname = lanAddress;
  link.search = "";
  link.hash = "";
  link.searchParams.set("online", "1");
  if (code) link.searchParams.set("room", code);
  return link.href;
}
