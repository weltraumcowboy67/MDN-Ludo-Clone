export function readInvitation(search: string): string {
  const code = new URLSearchParams(search).get("room") || "";
  return /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : "";
}

export function invitationUrl(origin: string, roomId: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("room", roomId);
  return url.toString();
}
