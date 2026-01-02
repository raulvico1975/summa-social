/**
 * Mapping de rutes d'ajuda a ancoratges del manual.
 * Els IDs han de coincidir amb els generats per slugifyHeading().
 */
export function getManualAnchorForRoute(routeKey: string): string | null {
  switch (routeKey) {
    case '/dashboard/movimientos':
      return '5-gestio-de-moviments';
    case '/dashboard/donants':
      return '3-gestio-de-donants';
    case '/dashboard/informes':
      return '9-informes-fiscals';
    case '/dashboard/configuracion':
      return '2-configuracio-inicial';
    case '/dashboard/proveidors':
      return '4-gestio-de-proveidors-i-treballadors';
    case '/dashboard/treballadors':
      return '4-gestio-de-proveidors-i-treballadors';
    case '/dashboard/projectes':
      return '10-projectes-i-justificacio-de-subvencions';
    case '/dashboard/project-module/expenses':
      return '10-projectes-i-justificacio-de-subvencions';
    case '/dashboard/project-module/projects':
      return '10-projectes-i-justificacio-de-subvencions';
    default:
      return null;
  }
}
