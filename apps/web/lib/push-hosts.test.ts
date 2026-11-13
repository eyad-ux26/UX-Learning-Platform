import { describe, expect, it } from "vitest";
import { isPushEndpoint } from "./push-hosts";

describe("push endpoints", () => {
  it("accepts the browsers' push services", () => {
    for (const u of [
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
      "https://web.push.apple.com/QGx",
      "https://wns2-db5p.notify.windows.com/w/?token=x",
      "https://api.push.apple.com/3/device/x",
    ])
      expect(isPushEndpoint(u), u).toBe(true);
  });
  it("refuses any other address", () => {
    for (const u of [
      "https://evil.example/push",
      "http://fcm.googleapis.com/fcm/send/x",
      "https://fcm.googleapis.com.evil.example/x",
      "https://notify.windows.com/x",
      "https://user:pw@fcm.googleapis.com/x",
      "https://fcm.googleapis.com:8443/x",
      "not a url",
    ])
      expect(isPushEndpoint(u), u).toBe(false);
  });
});
