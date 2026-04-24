//C:\Users\yanna\template_tailwind\src\lib\apiFetch.ts
export async function apiFetch(
  url: string,
  company: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers || {});
  headers.set("x-tenant", company);
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
}
