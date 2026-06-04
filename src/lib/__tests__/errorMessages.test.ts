import { describe, it, expect } from "vitest";
import { errorMessageKey } from "../api/errorMessages";

describe("errorMessageKey", () => {
  it("maps each known code to its errors.* key", () => {
    expect(errorMessageKey({ code: "auth" })).toBe("errors.authFailed");
    expect(errorMessageKey({ code: "quota" })).toBe("errors.quotaExceeded");
    expect(errorMessageKey({ code: "timeout" })).toBe("errors.timeout");
    expect(errorMessageKey({ code: "network" })).toBe("errors.network");
  });

  it("falls back to errors.unknown for unrecognized codes", () => {
    expect(errorMessageKey({ code: "teapot" })).toBe("errors.unknown");
    expect(errorMessageKey({ code: "" })).toBe("errors.unknown");
  });

  it("ignores the detail field when mapping", () => {
    expect(errorMessageKey({ code: "auth", detail: "401 from server" })).toBe(
      "errors.authFailed",
    );
  });
});
