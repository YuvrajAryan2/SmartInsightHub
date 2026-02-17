import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;

const STORAGE_KEY = "cognito_session";

type StoredSession = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. Add it to frontend/.env and restart the dev server.`);
  return value;
}

function getPool() {
  return new CognitoUserPool({
    UserPoolId: requireEnv("VITE_COGNITO_USER_POOL_ID", USER_POOL_ID),
    ClientId: requireEnv("VITE_COGNITO_CLIENT_ID", CLIENT_ID),
  });
}

function decodeJwtPayload(token: string): any {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "===".slice((payload.length + 3) % 4);
  const json = atob(padded);
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function getStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function setStoredSession(session: StoredSession | null) {
  if (!session) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function isAuthenticated(): boolean {
  const s = getStoredSession();
  return !!s && Date.now() < s.expiresAt;
}

export function getAccessToken(): string | null {
  const s = getStoredSession();
  if (!s) return null;
  if (Date.now() >= s.expiresAt) return null;
  return s.accessToken;
}

export function getUserGroups(): string[] {
  const s = getStoredSession();
  if (!s) return [];
  const payload = decodeJwtPayload(s.idToken);
  const groups = payload["cognito:groups"];
  if (Array.isArray(groups)) return groups.map(String);
  return [];
}

export function isHr(): boolean {
  return getUserGroups().includes("hr");
}

export async function signIn(username: string, password: string): Promise<void> {
  const pool = getPool();
  const user = new CognitoUser({ Username: username, Pool: pool });
  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  const session: CognitoUserSession = await new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: resolve,
      onFailure: reject,
      newPasswordRequired: () => reject(new Error("New password required. Set a permanent password in Cognito.")),
      mfaRequired: () => reject(new Error("MFA required. This demo client doesn't support MFA prompts yet.")),
    });
  });

  const accessToken = session.getAccessToken().getJwtToken();
  const idToken = session.getIdToken().getJwtToken();
  const refreshToken = session.getRefreshToken().getToken();
  const expSeconds = session.getAccessToken().getExpiration(); // epoch seconds
  const expiresAt = expSeconds * 1000;

  setStoredSession({
    accessToken,
    idToken,
    refreshToken,
    expiresAt,
  });
}

export function signOut(): void {
  try {
    const pool = getPool();
    const user = pool.getCurrentUser();
    user?.signOut();
  } catch {
    // ignore
  }
  setStoredSession(null);
}

