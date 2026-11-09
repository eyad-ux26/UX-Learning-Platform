import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_THEME_COOKIE } from "@/lib/admin/rules";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/titillium-web/400.css";
import "@fontsource/titillium-web/600.css";
import "@fontsource/titillium-web/700.css";
import "./admin.css";
import "./admin-icons.css";
import "./admin-app.css";

// The admin panel (docs/admin/README.md): English, light by default, never indexed and never linked from public pages.
export const metadata: Metadata = {
  title: { default: "UXGate Admin", template: "%s · UXGate Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};



export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get(ADMIN_THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="adm" data-theme={theme}>
        {children}
      </body>
    </html>
  );
}
