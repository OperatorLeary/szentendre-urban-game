import type { TranslationKey } from "@/presentation/i18n/translations";

interface RouteTranslationKeys {
  readonly nameKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}

const routeTranslationMap: Readonly<Record<string, RouteTranslationKeys>> =
  Object.freeze({
    short: {
      nameKey: "home.route.short.name",
      descriptionKey: "home.route.short.description"
    },
    medium: {
      nameKey: "home.route.medium.name",
      descriptionKey: "home.route.medium.description"
    },
    long: {
      nameKey: "home.route.long.name",
      descriptionKey: "home.route.long.description"
    }
  });

export interface LocalizedRouteDisplay {
  readonly name: string;
  readonly description: string;
}

export function localizeRouteDisplay(
  routeSlug: string,
  fallbackName: string,
  fallbackDescription: string,
  translate: (key: TranslationKey) => string
): LocalizedRouteDisplay {
  const keys: RouteTranslationKeys | undefined = routeTranslationMap[routeSlug];
  if (keys === undefined) {
    return {
      name: fallbackName,
      description: fallbackDescription
    };
  }

  return {
    name: translate(keys.nameKey),
    description: translate(keys.descriptionKey)
  };
}

export function localizeRouteName(
  routeSlug: string,
  fallbackName: string,
  translate: (key: TranslationKey) => string
): string {
  const keys: RouteTranslationKeys | undefined = routeTranslationMap[routeSlug];
  if (keys === undefined) {
    return fallbackName;
  }

  return translate(keys.nameKey);
}

