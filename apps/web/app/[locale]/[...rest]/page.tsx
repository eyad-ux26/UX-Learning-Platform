import { notFound } from "next/navigation";

// Any address inside /en or /ar that no page matches shows the 404 page of that language ([locale]/not-found.tsx).
export default function CatchAll() {
  notFound();
}
