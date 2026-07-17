import { expect, test, describe } from "bun:test";
import { passwordHelpers, sessionHelpers } from "./auth";
import type { Context } from "hono";

describe("auth utilities", () => {
  test("passwordHelpers.hash and verify work", async () => {
    const password = "my-super-secret-password";
    const hash = await passwordHelpers.hash(password);
    
    expect(hash).not.toBe(password);
    expect(hash).toContain("$"); // bcrypt/argon2 hashes typically contain $
    
    const isValid = await passwordHelpers.verify(password, hash);
    expect(isValid).toBe(true);
    
    const isInvalid = await passwordHelpers.verify("wrong-password", hash);
    expect(isInvalid).toBe(false);
  });

  test("sessionHelpers.setSessionCookie has correct strong typing", () => {
    // We mock the context since we only want to ensure no crashes and strong typing is accepted
    const mockContext = {
      header: (name: string, value: string, options?: any) => {}
    } as unknown as Context;
    
    // As long as this compiles, strong typing is satisfied.
    expect(() => {
      sessionHelpers.setSessionCookie(mockContext, {
        name: "session_id",
        value: "12345",
        attributes: {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          maxAge: 3600
        }
      });
    }).not.toThrow();
  });
});
