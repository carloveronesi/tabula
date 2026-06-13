import { monthGridDates } from "@/domain/calendarNav";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

interface MonthGridProps {
  date: Date;
}

/**
 * Vista Mese: griglia 6×7. Le celle fuori dal mese corrente sono marcate
 * (`data-outside`). Presentazionale; le sintesi di giornata verranno dopo.
 */
export function MonthGrid({ date }: MonthGridProps) {
  const month = date.getMonth();
  const cells = monthGridDates(date);

  return (
    <div role="grid">
      <div role="row" className="grid grid-cols-7">
        {DAY_NAMES.map((name) => (
          <span
            key={name}
            role="columnheader"
            className="px-2 py-1 text-xs font-semibold text-muted"
          >
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const outside = d.getMonth() !== month;
          return (
            <div
              key={d.toISOString()}
              role="gridcell"
              data-outside={outside}
              className={`tnum min-h-16 border border-line p-1.5 text-xs ${
                outside ? "text-faint" : "text-ink"
              }`}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
