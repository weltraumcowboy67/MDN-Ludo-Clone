import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
let hidden = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!hidden) process.stdout.write(chunk);
    done();
  },
});
const input = createInterface({
  input: process.stdin,
  output,
  terminal: Boolean(process.stdin.isTTY),
});
try {
  const username = (await input.question("Admin-Benutzername: ")).trim();
  process.stdout.write("Admin-Passwort (wird nicht angezeigt): ");
  hidden = true;
  const password = await input.question("");
  hidden = false;
  process.stdout.write("\n");
  if (!username || !password)
    throw new Error("Name und Passwort dürfen nicht leer sein.");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  let env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  env = env
    .split("\n")
    .filter((line) => !/^ADMIN_(USERNAME|PASSWORD_HASH)=/.test(line))
    .join("\n")
    .trimEnd();
  writeFileSync(
    ".env",
    `${env}\nADMIN_USERNAME=${JSON.stringify(username)}\nADMIN_PASSWORD_HASH=${salt}:${hash}\n`,
    { mode: 0o600 },
  );
  chmodSync(".env", 0o600);
  console.log(
    "Lokaler Admin eingerichtet. Server neu starten und /login öffnen.",
  );
} finally {
  input.close();
}
