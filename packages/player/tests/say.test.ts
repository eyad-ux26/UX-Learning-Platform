import { describe, expect, it } from "vitest";
import { faceSrc, sayFace } from "../src/say";

describe("scenario character face", () => {
  it("talks while the question is open", () => expect(sayFace({ phase: "answering", tries: 0 })).toBe("talk"));
  it("smiles after a right answer", () => {
    expect(sayFace({ phase: "right", tries: 1 })).toBe("smile");
    expect(sayFace({ phase: "main_ok", tries: 0 })).toBe("smile");
  });
  it("thinks after a wrong answer, while retrying, and when the answer is shown", () => {
    expect(sayFace({ phase: "wrong", tries: 1 })).toBe("think");
    expect(sayFace({ phase: "answering", tries: 1 })).toBe("think");
    expect(sayFace({ phase: "revealed", tries: 3 })).toBe("think");
  });
  it("points at the avatar file", () => expect(faceSrc({ id: "hana" }, "smile")).toBe("/char/uxgate-char-hana-smile-avatar.svg"));
});
