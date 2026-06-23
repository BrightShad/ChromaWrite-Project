export async function signInWithCredentials(username, password) {
  try {
    if (username === "user" && password === "chroma") {
      const token = btoa(JSON.stringify({ alg: "HS256" })) + "." + btoa(JSON.stringify({ id: "mock-id-123", email: "user@chroma.local" })) + "." + btoa("mock-signature");
      localStorage.setItem("chroma_jwt", token);
      notifyAuthChange();
      return { error: null };
    }
    return { error: "Invalid credentials" };
  } catch (err) {
    return { error: "Login failed" };
  }
}
export async function signOut() {
  localStorage.removeItem("chroma_jwt");
  notifyAuthChange();
}
export async function getSession() {
  return localStorage.getItem("chroma_jwt");
}
export async function getUser() {
  const token = localStorage.getItem("chroma_jwt");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}
const listeners = /* @__PURE__ */ new Set();
export function onAuthChange(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
function notifyAuthChange() {
  getUser().then((user) => {
    listeners.forEach((cb) => cb(user));
  });
}
