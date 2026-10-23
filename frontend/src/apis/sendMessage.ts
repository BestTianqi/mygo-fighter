import { getAPIName } from "./getAPIName";
export async function sendMessage<Response>(
  message: object,
): Promise<Response> {
  const response = await fetch(`/api/${getAPIName(message)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.error === "string" ? result.error : "连接失败",
    );
  return result as Response;
}
