/** Sottoinsieme di Navigator che ci serve (iniettabile nei test). */
interface SWNavigator {
  serviceWorker?: { register: (url: string) => Promise<unknown> };
}

/**
 * Registra il service worker se il browser lo supporta. Ritorna `true` se la
 * registrazione è stata avviata. `nav` è iniettato per la testabilità; la
 * registrazione vera e propria è fire-and-forget.
 */
export function registerServiceWorker(
  swUrl: string,
  nav: SWNavigator = navigator,
): boolean {
  if (!nav.serviceWorker) return false;
  void nav.serviceWorker.register(swUrl);
  return true;
}
