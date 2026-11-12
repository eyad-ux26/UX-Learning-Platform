import "server-only";
import { headers } from "next/headers";
import { originFromHost } from "@/lib/request-origin";

/** This request's own site address, from the routed Host header only (see lib/request-origin.ts). */
export async function requestOrigin(): Promise<string> {
  return originFromHost((await headers()).get("host"));
}
