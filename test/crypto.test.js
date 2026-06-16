import assert from "node:assert/strict";
import test from "node:test";
import { signJwt, verifyJwt } from "../src/crypto.js";

test("signs and verifies JWT payloads", () => {
  const token = signJwt({ sub: "file-1", action: "download" }, "secret", { expiresInSeconds: 60 });
  const payload = verifyJwt(token, "secret");
  assert.equal(payload.sub, "file-1");
  assert.equal(payload.action, "download");
});

test("rejects tampered JWT payloads", () => {
  const token = signJwt({ sub: "file-1" }, "secret");
  const [header, payload, signature] = token.split(".");
  const tampered = `${header}.${payload.replace(/.$/, "x")}.${signature}`;
  assert.throws(() => verifyJwt(tampered, "secret"), /Invalid token signature|Unexpected token/);
});
