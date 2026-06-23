export interface AuthUser {
  id: string;
  email: string;
}

export async function signInWithCredentials(username: string, password: string): Promise<{ error: string | null }> {
  try {
    if (username === "user" && password === "chroma") {
      const token = btoa(JSON.stringify({ alg: "HS256" })) + "." +
                    btoa(JSON.stringify({ id: "mock-id-123", email: "user@chroma.local" })) + "." +
                    btoa("mock-signature");
      
      localStorage.setItem("chroma_jwt", token);
      notifyAuthChange();
      return { error: null };
    }
    
    return { error: "Invalid credentials" };
  } catch (err) {
    return { error: "Login failed" };
  }
}

export async function signOut(): Promise<void> {
  localStorage.removeItem("chroma_jwt");
  notifyAuthChange();
}

export async function getSession() {
  return localStorage.getItem("chroma_jwt");
}

export async function getUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem("chroma_jwt");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}

const listeners = new Set<(user: AuthUser | null) => void>();

export function onAuthChange(callback: (user: AuthUser | null) => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

function notifyAuthChange() {
  getUser().then(user => {
    listeners.forEach(cb => cb(user));
  });
}
