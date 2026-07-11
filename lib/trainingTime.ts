import {
  DAY_LABELS,
  DayMenu,
  WeeklyItem,
} from "@/types/training";

const JAPAN_TIME_ZONE = "Asia/Tokyo";

/**
 * 指定した週の開始日から、月〜日の7日分を作成する
 */
export function createWeekMenus(startDate: string): DayMenu[] {
  return DAY_LABELS.map((label, index) => ({
    date: addDaysISO(startDate, index),
    label,
    startTime: "17:00",
    items: [],
  }));
}

/**
 * Firestoreの旧データを含めてWeeklyItemの形を統一する
 */
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

/**
 * 練習1件の所要時間を秒単位で計算する
 */
export function calculateItemSeconds(
  item: WeeklyItem
): number {
  const reps = Math.max(toNumber(item.reps, 1), 1);
  const sets = Math.max(toNumber(item.sets, 1), 1);

  const repRestSeconds = Math.max(
    toNumber(item.repRestSeconds, 0),
    0
  );

  const setRestMinutes = Math.max(
    toNumber(item.setRestMinutes, 0),
    0
  );

  // 例：5本なら本数間レストは4回
  const repRestTotal =
    Math.max(reps - 1, 0) *
    sets *
    repRestSeconds;

  // 例：3セットならセット間レストは2回
  const setRestTotal =
    Math.max(sets - 1, 0) *
    setRestMinutes *
    60;

  if (item.timeMode === "auto") {
    const distance = Math.max(
      toNumber(item.distance, 0),
      0
    );

    const baseDistance = Math.max(
      toNumber(item.baseDistance, 0),
      0
    );

    const baseSeconds = Math.max(
      toNumber(item.baseSeconds, 0),
      0
    );

    const customOneRepSeconds = Math.max(
      toNumber(item.customOneRepSeconds, 0),
      0
    );

    let oneRepSeconds = 0;

    // 代表者が今回の1本当たり時間を入力した場合は最優先
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

  const manualMinutes = Math.max(
    toNumber(item.manualMinutes, 0),
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

/**
 * 1日分の練習時間を秒単位で合計する
 */
export function calculateDaySeconds(
  day: DayMenu
): number {
  return day.items.reduce(
    (sum, item) =>
      sum + calculateItemSeconds(item),
    0
  );
}

/**
 * 開始時刻と所要時間から終了予定時刻を計算する
 */
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
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return "-";
  }

  const startMinutes =
    hours * 60 + minutes;

  const addedMinutes =
    Math.ceil(Math.max(seconds, 0) / 60);

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

/**
 * 秒数を「2時間15分」などの表示へ変換する
 */
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

/**
 * 現在の日本時間の日付をYYYY-MM-DD形式で返す
 *
 * 例：
 * 2026-07-11
 *
 * VercelがUTCで動作していても、
 * 常にAsia/Tokyoの日付を取得する
 */
export function getTodayISO(): string {
  return formatDateInJapan(new Date());
}

/**
 * 現在の日本時間をDateとして返す
 *
 * 主に日時表示や確認用
 */
export function getNowInJapan(): Date {
  const now = new Date();

  const japanText = now.toLocaleString(
    "en-US",
    {
      timeZone: JAPAN_TIME_ZONE,
    }
  );

  return new Date(japanText);
}

/**
 * 日本時間の現在日時を表示用文字列で返す
 *
 * 例：
 * 2026/07/11 10:30
 */
export function getJapanDateTimeText(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JAPAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * YYYY-MM-DDの日付に指定日数を加算する
 *
 * 日付だけの計算なのでUTC基準で処理し、
 * PCやサーバーのタイムゾーン差を防ぐ
 */
export function addDaysISO(
  dateString: string,
  days: number
): string {
  const parsed = parseISODate(dateString);

  if (!parsed) {
    return dateString;
  }

  parsed.setUTCDate(
    parsed.getUTCDate() + days
  );

  return formatUTCDate(parsed);
}

/**
 * 2つの日付の差を日数で返す
 *
 * dateA - dateB
 *
 * 例：
 * diffDaysISO("2026-07-11", "2026-07-01")
 * → 10
 */
export function diffDaysISO(
  dateA: string,
  dateB: string
): number {
  const first = parseISODate(dateA);
  const second = parseISODate(dateB);

  if (!first || !second) {
    return 0;
  }

  const milliseconds =
    first.getTime() - second.getTime();

  return Math.floor(
    milliseconds /
      (24 * 60 * 60 * 1000)
  );
}

/**
 * 指定日が日本時間の今日より前か判定する
 */
export function isPastDate(
  dateString: string
): boolean {
  return dateString < getTodayISO();
}

/**
 * 指定日が日本時間の今日より後か判定する
 */
export function isFutureDate(
  dateString: string
): boolean {
  return dateString > getTodayISO();
}

/**
 * 指定日が今日から14日より前か判定する
 *
 * 完成メニュー・仮メニューの
 * 2週間保存ルールで利用できる
 */
export function isOlderThanTwoWeeks(
  dateString: string
): boolean {
  const twoWeeksAgo = addDaysISO(
    getTodayISO(),
    -14
  );

  return dateString < twoWeeksAgo;
}

/**
 * 削除期限を過ぎているか判定する
 *
 * deleteAfterが今日より前ならtrue
 */
export function isDeleteExpired(
  deleteAfter?: string
): boolean {
  if (!deleteAfter) return false;

  return deleteAfter < getTodayISO();
}

/**
 * 週開始日から削除期限を作成する
 *
 * 現在の仕様：
 * 週開始日の14日後を削除期限とする
 */
export function createDeleteAfter(
  weekStart: string
): string {
  return addDaysISO(weekStart, 14);
}

/**
 * YYYY-MM-DDをM/D表示にする
 */
export function formatShortDate(
  dateString: string
): string {
  const parsed = parseISODate(dateString);

  if (!parsed) {
    return dateString || "--/--";
  }

  return `${
    parsed.getUTCMonth() + 1
  }/${parsed.getUTCDate()}`;
}

/**
 * YYYY-MM-DDを日本語表示へ変換する
 *
 * 例：
 * 2026年7月11日
 */
export function formatJapaneseDate(
  dateString: string
): string {
  const parsed = parseISODate(dateString);

  if (!parsed) {
    return dateString;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

/**
 * 検索用に文字を統一する
 *
 * ・大文字小文字を統一
 * ・全角半角を統一
 * ・カタカナをひらがなへ変換
 * ・空白を削除
 */
export function normalizeText(
  text: string
): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ァ-ン]/g, (character) =>
      String.fromCharCode(
        character.charCodeAt(0) - 0x60
      )
    )
    .replace(/\s+/g, "");
}

/**
 * Dateを日本時間のYYYY-MM-DDへ変換する
 */
function formatDateInJapan(
  date: Date
): string {
  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: JAPAN_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value || "";

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value || "";

  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value || "";

  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DDをUTCのDateへ変換する
 */
function parseISODate(
  dateString: string
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    dateString
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * UTCのDateをYYYY-MM-DDへ変換する
 */
function formatUTCDate(
  date: Date
): string {
  const year =
    date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * 入力文字を数値へ変換する
 */
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