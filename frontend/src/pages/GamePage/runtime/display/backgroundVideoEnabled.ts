/** Baidu webviews can hand even muted inline videos to their native player. */
export function backgroundVideoEnabled(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): boolean {
  return !/baiduboxapp|baidubrowser|bdbrowser|baiduhd/i.test(userAgent);
}
