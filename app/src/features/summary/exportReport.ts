/**
 * Colla dell'export: legge gli store, filtra le entry sul mese visualizzato,
 * costruisce i due fogli (Giornaliero + Totale) e scarica un file Excel
 * (SpreadsheetML 2003). Nessuna logica di dominio qui: sta tutta in reportRows.
 */
import { isoDate } from "@/domain/calendarNav";
import { reportRows } from "@/domain/reportRows";
import { sheetsToXls, type Sheet } from "@/data/export/spreadsheetML";
import { triggerDownload } from "@/data/export/triggerDownload";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useUiStore } from "@/store";

const hours = (min: number): number => Math.round((min / 60) * 100) / 100;

export function exportMonthReport(): void {
  const { entries } = useCalendarStore.getState();
  const { projects, clients } = useInventoryStore.getState();
  const { settings } = useSettingsStore.getState();
  const activeDate = useUiStore.getState().activeDate;

  const monthKey = isoDate(activeDate).slice(0, 7);
  const monthEntries = entries.filter((e) => e.startsAt.slice(0, 7) === monthKey);
  const { daily, totals, totalMinutes } = reportRows(
    monthEntries, projects, clients, settings.subtypes, settings.workHours,
  );

  const dailySheet: Sheet = {
    name: "Giornaliero",
    headers: ["Data", "Cliente", "Progetto", "Ore"],
    rows: daily.map((r) => [r.date ?? "", r.client, r.project, hours(r.minutes)]),
  };
  const totalSheet: Sheet = {
    name: "Totale",
    headers: ["Cliente", "Progetto", "Ore"],
    rows: [
      ...totals.map((r) => [r.client, r.project, hours(r.minutes)]),
      ["TOTALE", "", hours(totalMinutes)],
    ],
  };

  triggerDownload(
    `tabula-report-${monthKey}.xls`,
    sheetsToXls([dailySheet, totalSheet]),
    "application/vnd.ms-excel",
  );
}
