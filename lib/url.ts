/** Add a query parameter to a same-site path. */
export function withStatus(path: string, key: string, value: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
