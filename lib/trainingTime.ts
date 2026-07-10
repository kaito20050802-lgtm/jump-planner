import {
  DAY_LABELS,
  DayMenu,
  WeeklyItem,
} from "@/types/training";

export function createWeekMenus(startDate: string): DayMenu[] {
  return DAY_LABELS.map((label, index) => ({
    date: addDaysISO(startDate, index),
    label,
    startTime: "17:00",
    items: [],
  }));
}

export function normalizeWeeklyItem(
  item: Partial<WeeklyItem>
): WeeklyItem {
  return {
    drillId: item.drillId || "",
    name: item.name || "",
    category: item.category || "",
    targetEvent: item.targetEvent || "",
    purposeTags: item.purposeTags || [],

    timeMode: item.timeMode || "manual",

    baseDistance: item.baseDistance || "",
    baseSeconds: item.baseSeconds || "",
    defaultMinutes: item.defaultMinutes || "",

    distance: item.distance || "",
    reps: item.reps || "",
    sets: item.sets || "",
    intensity: item.intensity || "",

    repRestSeconds: item.repRestSeconds || "",
    setRestMinutes: item.setRestMinutes || "",

    manualMinutes:
      item.manualMinutes ||
      item.defaultMinutes ||
      "",

    customOneRepSeconds:
      item.customOneRepSeconds || "",

    selectedSeason: item.selectedSeason,
    selectedPurpose: item.selectedPurpose,
    selectedPercent: item.selectedPercent || "",
  };
}

export function calculateItemSeconds(
  item: WeeklyItem
): number {
  const reps = toNumber(item.reps, 1);
  const sets = toNumber(item.sets, 1);

  const repRestSeconds = toNumber(
    item.repRestSeconds,
    0
  );

  const setRestMinutes = toNumber(
    item.setRestMinutes,
    0
  );

  const repRestTotal =
    Math.max(reps - 1, 0) *
    sets *
    repRestSeconds;

  const setRestTotal =
    Math.max(sets - 1, 0) *
    setRestMinutes *
    60;

  if (item.timeMode === "auto") {
    const distance = toNumber(
      item.distance,
      0
    );

    const baseDistance = toNumber(
      item.baseDistance,
      0
    );

    const baseSeconds = toNumber(
      item.baseSeconds,
      0
    );

    const customOneRepSeconds = toNumber(
      item.customOneRepSeconds,
      0
    );

    let oneRepSeconds = 0;

    if (customOneRepSeconds > 0) {
      oneRepSeconds = customOneRepSeconds;
    } else if (
      distance > 0 &&
      baseDistance > 0 &&
      baseSeconds > 0
    ) {
      oneRepSeconds =
        (distance / baseDistance) *
        baseSeconds;
    }

    const exerciseSeconds =
      oneRepSeconds *
      reps *
      sets;

    return Math.round(
      exerciseSeconds +
        repRestTotal +
        setRestTotal
    );
  }

  const manualMinutes = toNumber(
    item.manualMinutes,
    0
  );

  const exerciseSeconds =
    manualMinutes * 60;

  return Math.round(
    exerciseSeconds +
      repRestTotal +
      setRestTotal
  );
}

export function calculateDaySeconds(
  day: DayMenu
): number {
  return day.items.reduce(
    (sum, item) =>
      sum + calculateItemSeconds(item),
    0
  );
}

export function calculateEndTime(
  startTime: string,
  seconds: number
): string {
  if (!startTime) return "-";

  const [hourText, minuteText] =
    startTime.split(":");

  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return "-";
  }

  const startMinutes =
    hours * 60 + minutes;

  const addedMinutes =
    Math.ceil(seconds / 60);

  const totalMinutes =
    startMinutes + addedMinutes;

  const endHours =
    Math.floor(totalMinutes / 60) % 24;

  const endMinutes =
    totalMinutes % 60;

  return `${String(endHours).padStart(
    2,
    "0"
  )}:${String(endMinutes).padStart(
    2,
    "0"
  )}`;
}

export function formatDuration(
  seconds: number
): string {
  if (seconds <= 0) return "0分";

  const totalMinutes =
    Math.ceil(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}分`;
  }

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${minutes}分`;
}

export function getTodayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(
  dateString: string,
  days: number
): string {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  date.setDate(
    date.getDate() + days
  );

  return toISODate(date);
}

export function formatShortDate(
  dateString: string
): string {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  return `${
    date.getMonth() + 1
  }/${date.getDate()}`;
}

export function normalizeText(
  text: string
): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ァ-ン]/g, (char) =>
      String.fromCharCode(
        char.charCodeAt(0) - 0x60
      )
    )
    .replace(/\s+/g, "");
}

function toISODate(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toNumber(
  value: string | undefined,
  fallback: number
): number {
  if (!value) return fallback;

  const normalized = value
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  const numberValue =
    Number(normalized);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}