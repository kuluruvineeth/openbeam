export interface CookieConfig {
  webUrl: string;
  serverUrl: string;
  cookieDomain?: string;
}

export interface CookieOptions {
  name: string;
  value: string;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

function deriveCookieDomain(config: CookieConfig): string | undefined {
  if (config.cookieDomain) {
    return config.cookieDomain;
  }

  const webHost = new URL(config.webUrl).hostname;
  const serverHost = new URL(config.serverUrl).hostname;

  if (webHost === serverHost) {
    return;
  }

  const webParts = webHost.split(".");
  const serverParts = serverHost.split(".");

  if (webParts.length >= 2 && serverParts.length >= 2) {
    const webParent = webParts.slice(-2).join(".");
    const serverParent = serverParts.slice(-2).join(".");
    if (webParent === serverParent) {
      return `.${webParent}`;
    }
  }

  return;
}

export function createCookieConfig(): CookieConfig {
  return {
    webUrl:
      process.env.WEB_URL ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      "http://localhost:3001",
    serverUrl:
      process.env.SERVER_URL ||
      process.env.NEXT_PUBLIC_SERVER_URL ||
      "http://localhost:3000",
    cookieDomain: process.env.COOKIE_DOMAIN,
  };
}

export function getCookieOptions(
  config: CookieConfig
): Omit<CookieOptions, "name" | "value"> {
  const isSecure =
    config.serverUrl.startsWith("https://") ||
    config.webUrl.startsWith("https://");
  const webHost = new URL(config.webUrl).hostname;
  const serverHost = new URL(config.serverUrl).hostname;
  const isCrossSite = webHost !== serverHost;
  const domain = deriveCookieDomain(config);

  return {
    path: "/",
    httpOnly: true,
    secure: isSecure,
    sameSite: isCrossSite ? "none" : "lax",
    ...(domain && { domain }),
  };
}

export function serializeCookie(options: CookieOptions): string {
  const parts = [`${options.name}=${encodeURIComponent(options.value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join("; ");
}

export function parseCookies(
  cookieHeader: string | null
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce(
    (acc, pair) => {
      const [key, ...valueParts] = pair.trim().split("=");
      if (key) {
        acc[key] = decodeURIComponent(valueParts.join("="));
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

export const SESSION_COOKIE_NAME = "openplane-session";
export const STATE_COOKIE_NAME = "openplane-oauth-state";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
