import { useEffect, useState } from "react";
import { minutesOfDay } from "@/domain/nowLine";

/**
 * Minuti dalla mezzanotte "adesso", aggiornati ogni minuto. Alimenta la linea
 * dell'ora corrente nelle viste Giorno/Settimana.
 */
export function useNowMinute(): number {
  const [min, setMin] = useState(() => minutesOfDay());
  useEffect(() => {
    const id = setInterval(() => setMin(minutesOfDay()), 60_000);
    return () => clearInterval(id);
  }, []);
  return min;
}
