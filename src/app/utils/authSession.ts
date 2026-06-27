import { supabase } from "../../lib/supabaseClient";

const TOKEN_KEY = "tams360_token";
const USER_KEY = "tams360_user";

type SessionFetchOptions = {
  forceRefresh?: boolean;
  fallbackToken?: string | null;
};

type AuthFetchOptions = {
  retryOnUnauthorized?: boolean;
  fallbackToken?: string | null;
};

function syncStoredAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function persistAuthSession(
  accessToken: string,
  refreshToken?: string | null,
) {
  syncStoredAccessToken(accessToken);

  if (!refreshToken) {
    return;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  syncStoredAccessToken(data.session?.access_token ?? accessToken);
}

export async function getFreshAccessToken(
  options: SessionFetchOptions = {},
): Promise<string | null> {
  const { forceRefresh = false, fallbackToken = null } = options;

  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      syncStoredAccessToken(fallbackToken);
      return fallbackToken;
    }

    const refreshedToken = data.session?.access_token ?? fallbackToken;
    syncStoredAccessToken(refreshedToken);
    return refreshedToken;
  }

  const { data } = await supabase.auth.getSession();
  const sessionToken = data.session?.access_token ?? null;
  const token = sessionToken ?? fallbackToken ?? localStorage.getItem(TOKEN_KEY);

  syncStoredAccessToken(token);
  return token;
}

function withAuthorizationHeader(init: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return {
    ...init,
    headers,
  };
}

export async function fetchWithSessionAuth(
  url: string,
  init: RequestInit = {},
  options: AuthFetchOptions = {},
): Promise<Response> {
  const { retryOnUnauthorized = true, fallbackToken = null } = options;

  const initialToken = await getFreshAccessToken({ fallbackToken });
  if (!initialToken) {
    clearStoredAuth();
    throw new Error("AUTH_REQUIRED");
  }

  let response = await fetch(url, withAuthorizationHeader(init, initialToken));

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  const refreshedToken = await getFreshAccessToken({
    forceRefresh: true,
    fallbackToken: fallbackToken ?? initialToken,
  });

  if (!refreshedToken || refreshedToken === initialToken) {
    clearStoredAuth();
    throw new Error("AUTH_EXPIRED");
  }

  response = await fetch(url, withAuthorizationHeader(init, refreshedToken));

  if (response.status === 401) {
    clearStoredAuth();
    throw new Error("AUTH_EXPIRED");
  }

  return response;
}
