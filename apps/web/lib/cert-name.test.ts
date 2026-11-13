import { describe, expect, it } from "vitest";
import { nameLooksLikeEmail, validCertName } from "./cert-name";

describe("nameLooksLikeEmail", () => {
  it("flags email-shaped names", () => {
    for (const n of ["eyad.0588", "sara_k", "a@b.com", "Omar 2", "salma"])
      expect(nameLooksLikeEmail(n, n === "salma" ? "salma@x.com" : null), n).toBe(true);
  });
  it("accepts a normal name", () => {
    expect(nameLooksLikeEmail("Salma Ahmed", "salma@x.com")).toBe(false);
    expect(nameLooksLikeEmail("سلمى أحمد", null)).toBe(false);
  });
});
describe("validCertName", () => {
  it("is 2 to 60 characters after trimming", () => {
    expect(validCertName(" a ")).toBe(false);
    expect(validCertName(" ab ")).toBe(true);
    expect(validCertName("x".repeat(60))).toBe(true);
    expect(validCertName("x".repeat(61))).toBe(false);
  });
});
