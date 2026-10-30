import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const config: NextConfig = {
  transpilePackages: ["@uxgate/tokens", "@uxgate/player", "@uxgate/content"],
};

export default withNextIntl(config);
