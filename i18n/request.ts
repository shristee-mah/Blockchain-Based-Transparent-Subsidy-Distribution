import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["en", "ne"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(locale: unknown): locale is SupportedLocale {
  return typeof locale === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ locale }) => {
  const safeLocale: SupportedLocale = isSupportedLocale(locale) ? locale : "en";

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});
