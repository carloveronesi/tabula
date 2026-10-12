import { describe, it, expect, beforeEach } from "vitest";
import { startNewEntry } from "@/features/layout/entryActions";
import { isoDate } from "@/domain/calendarNav";
import { useUiStore } from "@/store";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import type { Entry } from "@/data/types";

const busy = (date: string): Entry => ({
  id: "e1",
  startsAt: `${date}T09:00:00`,
  endsAt: `${date}T10:00:00`,
  type: "client",
  projectId: null,
  clientId: null,
  subtypeId: null,
  title: "Call",
  collaboratorIds: [],
  contactIds: [],
  notes: "",
  blockers: "",
  nextSteps: "",
  links: [],
  milestone: null,
  createdAt: 0,
  updatedAt: 0,
});

beforeEach(() => {
  useEditorStore.setState({ quickAdd: null });
  useCalendarStore.setState({ entries: [] });
  const s = useSettingsStore.getState().settings;
  useSettingsStore.setState({
    settings: {
      ...s,
      slotMinutes: 30,
      workHours: { morningStart: 540, morningEnd: 780, afternoonStart: 840, afternoonEnd: 1080 },
    },
  });
});

describe("startNewEntry", () => {
  it("fuori dal calendario usa oggi, non l'ultimo periodo navigato", () => {
    useUiStore.setState({ view: "todo", activeDate: new Date(2026, 8, 5) });
    startNewEntry();
    expect(useEditorStore.getState().quickAdd?.date).toBe(isoDate(new Date()));
  });

  it("nel calendario usa il giorno attivo e la prima ora libera", () => {
    useUiStore.setState({ view: "day", activeDate: new Date(2026, 8, 7) });
    useCalendarStore.setState({ entries: [busy("2026-09-07")] });
    startNewEntry();
    expect(useEditorStore.getState().quickAdd).toMatchObject({
      date: "2026-09-07",
      startMin: 600,
      endMin: 660,
    });
  });
});
