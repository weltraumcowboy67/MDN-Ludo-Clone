import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import type { AuthContext } from "@colyseus/core";

const sessions = new Map<string, { expires: number; csrf: string }>();
const lifetime = 8 * 60 * 60 * 1000;
export function isLocalAdminRequest(
  address: string,
  headers: Headers,
): boolean {
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) return false;
  // A tunnel also connects from loopback. Never mistake forwarded visitors for the local owner.
  if (
    [
      "forwarded",
      "x-real-ip",
      "x-forwarded-for",
      "x-forwarded-host",
      "cf-connecting-ip",
      "cf-ray",
    ].some((h) => headers.has(h))
  )
    return false;
  try {
    const host = new URL(`http://${headers.get("host") || ""}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host.hostname))
      return false;
    const origin = headers.get("origin");
    return (
      !origin ||
      (new URL(origin).host === host.host &&
        ["http:", "https:"].includes(new URL(origin).protocol))
    );
  } catch {
    return false;
  }
}
export function requestContext(req: Request) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers))
    if (value !== undefined) headers.set(key, String(value));
  return { headers, address: req.socket.remoteAddress || "" };
}
export function sessionFromCookie(cookie: string | null) {
  const id =
    cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("ludo_admin="))
      ?.slice(11) || "";
  const session = sessions.get(id);
  if (!session || session.expires < Date.now()) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
}
export function adminSession(req: Request) {
  const { address, headers } = requestContext(req);
  return isLocalAdminRequest(address, headers)
    ? sessionFromCookie(headers.get("cookie"))
    : null;
}
export function socketAdminSession(context: AuthContext): string | null {
  // req.socket is the transport peer, unlike forwarded context.ip.
  const peer =
    context.req?.socket?.remoteAddress ||
    (typeof context.ip === "string" ? context.ip : "");
  return isLocalAdminRequest(peer, context.headers)
    ? sessionFromCookie(context.headers.get("cookie"))?.id || null
    : null;
}
export function validAdminSession(id: unknown): boolean {
  if (typeof id !== "string") return false;
  const session = sessions.get(id);
  return Boolean(session && session.expires > Date.now());
}
export function login(username: unknown, password: unknown) {
  const configured = process.env.ADMIN_PASSWORD_HASH || "";
  const [salt, expected] = configured.split(":");
  if (
    !salt ||
    !expected ||
    typeof password !== "string" ||
    password.length > 256
  )
    return null;
  const derived = scryptSync(password, salt, 64);
  const hash = Buffer.from(expected, "hex");
  if (
    hash.length !== derived.length ||
    !timingSafeEqual(hash, derived) ||
    username !== process.env.ADMIN_USERNAME
  )
    return null;
  for (const [key, value] of sessions)
    if (value.expires < Date.now()) sessions.delete(key);
  const id = randomBytes(32).toString("hex");
  const csrf = randomBytes(24).toString("hex");
  sessions.set(id, { expires: Date.now() + lifetime, csrf });
  return { id, csrf };
}
export function logout(id: string) {
  sessions.delete(id);
}
