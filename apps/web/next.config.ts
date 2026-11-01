import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// "standalone" keeps a self-hosted build possible, our way off Vercel if we ever need it.
const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@uxgate/tokens", "@uxgate/player", "@uxgate/content"],
};

export default withNextIntl(config);
