/** Split `/#ecosystem` into a React Router location so hash is not treated as pathname. */
export function toRouterLocation(href: string): string | { pathname: string; hash: string } {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return href;
  return {
    pathname: href.slice(0, hashIndex) || "/",
    hash: href.slice(hashIndex),
  };
}
