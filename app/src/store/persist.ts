import { useToastStore } from "@/store/toast";

/**
 * Esegue una scrittura su IndexedDB e, se fallisce (quota esaurita, eviction in
 * navigazione privata, DB corrotto), mostra un toast `danger` invece di lasciar
 * morire la promise come unhandled rejection. Non rilancia: il chiamante non
 * deve gestire l'errore. Avvolgere il corpo che tocca il DB *insieme*
 * all'aggiornamento di stato, così su fallimento né memoria né storico vengono
 * toccati e DB↔memoria restano coerenti.
 */
export async function persist(label: string, op: () => Promise<void>): Promise<void> {
  try {
    await op();
  } catch (e) {
    console.error(label, e);
    useToastStore.getState().notify(`${label} non riuscito`, { variant: "danger" });
  }
}
