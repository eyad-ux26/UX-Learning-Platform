import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loc = { origin: "https://uxgate.test", pathname: "/en/app", search: "", href: "https://uxgate.test/en/app" };
const go = (path: string) => { const u = new URL(path, loc.origin); loc.pathname = u.pathname; loc.search = u.search; loc.href = u.href; };

describe("navigation progress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {});
    vi.stubGlobal("location", loc);
    go("/en/app");
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });

  const load = async () => {
    const m = await import("./nav-progress");
    m.checkNavDone(); // the first screen has rendered
    return m;
  };

  it("strips the locale from the destination", async () => {
    const m = await load();
    expect(m.appPath("/ar/app/paths")).toBe("/app/paths");
    expect(m.appPath("/en")).toBe("/");
    expect(m.appPath("/app")).toBe("/app");
  });

  it("starts on a link to another screen and ends when that screen renders", async () => {
    const m = await load();
    m.startNavProgress("/en/app/paths");
    expect(m.navState()).toMatchObject({ active: true, to: "/app/paths", from: "/en/app" });
    m.checkNavDone(); // a re-render on the same screen does not end it
    expect(m.navState().active).toBe(true);
    go("/en/app/paths");
    m.checkNavDone();
    expect(m.navState().active).toBe(false);
  });

  it("ignores links to the screen on show, #hash links and other sites", async () => {
    const m = await load();
    m.startNavProgress("/en/app");
    m.startNavProgress("/en/app#faq");
    m.startNavProgress("https://example.com/en/app/paths");
    expect(m.navState().active).toBe(false);
  });

  it("ends by itself after 12 s if the screen never changes", async () => {
    const m = await load();
    m.startNavProgress("/en/app/review");
    vi.advanceTimersByTime(11999);
    expect(m.navState().active).toBe(true);
    vi.advanceTimersByTime(1);
    expect(m.navState().active).toBe(false);
  });

  it("back/forward: compares with the screen on show, not the address the browser already changed", async () => {
    const m = await load();
    go("/en/app/profile"); // the browser moves first, then fires popstate
    m.startNavProgress();
    expect(m.navState()).toMatchObject({ active: true, from: "/en/app" });
    m.checkNavDone(); // the profile screen rendered
    expect(m.navState().active).toBe(false);
  });
});
