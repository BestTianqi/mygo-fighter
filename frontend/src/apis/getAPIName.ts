/** Vite keeps class names so the wire name follows the Scala message type. */
export function getAPIName(message: object): string {
  return message.constructor.name.replace(/Message$/, "").toLowerCase();
}
