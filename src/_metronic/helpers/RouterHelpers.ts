export function getCurrentUrl(pathname: string): string {
  return pathname.split(/[?#]/)[0]
}
export function checkIsActive(currentPath: string, targetPath: string): boolean {
  // Map '/' to '/dashboard' for both current and target paths
  const mapRootToDashboard = (path: string) => (path === '/' ? '/dashboard' : path);

  const normalize = (path: string) =>
    path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

  const normalizedCurrent = normalize(mapRootToDashboard(currentPath));
  const normalizedTarget = normalize(mapRootToDashboard(targetPath));

  return (
    normalizedCurrent === normalizedTarget ||
    normalizedCurrent.startsWith(normalizedTarget + '/')
  );
}

