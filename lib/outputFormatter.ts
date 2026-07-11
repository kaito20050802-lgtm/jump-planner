import {
  DayMenu,
  WeeklyItem,
} from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  formatDuration,
} from "@/lib/trainingTime";

// ========================================
// 型
// ========================================

export type OutputDateRange = {
  startDate: string;
  endDate: string;
};

export type CategoryGroup = {
  category: string;
  items: WeeklyItem[];
};

// ========================================
// 練習メニュー1件の出力文字列
// ========================================

/**
 * 練習をLINE・スクリーンショット向けの
 * 1行形式へ変換する
 *
 * 例：
 * テンポ走(120m)×3×2, 7割, r=5
 *
 * 入力がない項目は自動で省略する
 *
 * 例：
 * テンポ走(120m)×3×2, r=5
 * テンポ走×3
 * テンポ走
 */
export function formatOutputItem(
  item: WeeklyItem
): string {
  let mainText = item.name.trim();

  const distance = cleanValue(item.distance);
  const reps = cleanValue(item.reps);
  const sets = cleanValue(item.sets);
  const intensity = cleanValue(item.intensity);
  const setRest = cleanValue(
    item.setRestMinutes
  );

  // 距離
  if (distance) {
    mainText += `(${addUnitIfMissing(distance, "m")})`;
  }

  // 本数
  if (reps) {
    mainText += `×${removeUnit(reps, [
      "本",
      "回",
    ])}`;
  }

  // セット数
  if (sets) {
    mainText += `×${removeUnit(sets, [
      "set",
      "SET",
      "セット",
    ])}`;
  }

  const optionParts: string[] = [];

  // 強度
  if (intensity) {
    optionParts.push(intensity);
  }

  // セット間レスト
  if (setRest) {
    optionParts.push(
      `r=${removeUnit(setRest, [
        "分",
        "min",
        "minutes",
      ])}`
    );
  }

  if (optionParts.length > 0) {
    mainText += `, ${optionParts.join(", ")}`;
  }

  return mainText;
}

// ========================================
// 補足情報付きの出力
// ========================================

/**
 * 本数間レストも含めた詳細表示
 *
 * 例：
 * テンポ走(120m)×3×2, 7割, r=5
 * 本数間：60秒
 */
export function formatOutputItemWithDetails(
  item: WeeklyItem
): {
  main: string;
  sub: string[];
} {
  const main = formatOutputItem(item);

  const sub: string[] = [];

  const repRest = cleanValue(
    item.repRestSeconds
  );

  if (repRest) {
    sub.push(
      `本数間レスト ${addUnitIfMissing(
        repRest,
        "秒"
      )}`
    );
  }

  if (
    item.timeMode === "manual" &&
    cleanValue(item.manualMinutes)
  ) {
    sub.push(
      `所要時間 ${addUnitIfMissing(
        item.manualMinutes,
        "分"
      )}`
    );
  }

  if (
    item.timeMode === "auto" &&
    cleanValue(item.customOneRepSeconds)
  ) {
    sub.push(
      `1本 ${
        removeUnit(
          item.customOneRepSeconds,
          ["秒"]
        )
      }秒`
    );
  }

  return {
    main,
    sub,
  };
}

// ========================================
// 日付範囲
// ========================================

/**
 * 出力期間に含まれる曜日だけを返す
 */
export function filterDaysByRange(
  dayMenus: DayMenu[],
  startDate: string,
  endDate: string
): DayMenu[] {
  if (!startDate || !endDate) {
    return dayMenus;
  }

  const normalizedStart =
    startDate <= endDate
      ? startDate
      : endDate;

  const normalizedEnd =
    startDate <= endDate
      ? endDate
      : startDate;

  return dayMenus.filter(
    (day) =>
      day.date >= normalizedStart &&
      day.date <= normalizedEnd
  );
}

/**
 * 出力可能な最小日付を返す
 */
export function getPlanMinDate(
  dayMenus: DayMenu[]
): string {
  if (dayMenus.length === 0) return "";

  return [...dayMenus]
    .map((day) => day.date)
    .filter(Boolean)
    .sort()[0] || "";
}

/**
 * 出力可能な最大日付を返す
 */
export function getPlanMaxDate(
  dayMenus: DayMenu[]
): string {
  if (dayMenus.length === 0) return "";

  const dates = [...dayMenus]
    .map((day) => day.date)
    .filter(Boolean)
    .sort();

  return dates[dates.length - 1] || "";
}

/**
 * 開始日と終了日を週メニュー内に収める
 */
export function normalizeOutputRange(
  dayMenus: DayMenu[],
  startDate: string,
  endDate: string
): OutputDateRange {
  const minDate = getPlanMinDate(dayMenus);
  const maxDate = getPlanMaxDate(dayMenus);

  if (!minDate || !maxDate) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  let nextStart =
    startDate || minDate;

  let nextEnd =
    endDate || maxDate;

  if (nextStart < minDate) {
    nextStart = minDate;
  }

  if (nextStart > maxDate) {
    nextStart = maxDate;
  }

  if (nextEnd < minDate) {
    nextEnd = minDate;
  }

  if (nextEnd > maxDate) {
    nextEnd = maxDate;
  }

  if (nextStart > nextEnd) {
    return {
      startDate: nextEnd,
      endDate: nextStart,
    };
  }

  return {
    startDate: nextStart,
    endDate: nextEnd,
  };
}

// ========================================
// カテゴリー分け
// ========================================

/**
 * 1日分の練習をカテゴリーごとにまとめる
 *
 * 登録されている順序は維持する
 */
export function groupItemsByCategory(
  items: WeeklyItem[]
): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const categoryIndex =
    new Map<string, number>();

  items.forEach((item) => {
    const category =
      item.category?.trim() || "その他";

    const existingIndex =
      categoryIndex.get(category);

    if (existingIndex !== undefined) {
      groups[existingIndex].items.push(item);
      return;
    }

    categoryIndex.set(
      category,
      groups.length
    );

    groups.push({
      category,
      items: [item],
    });
  });

  return groups;
}

// ========================================
// 日ごとの表示情報
// ========================================

export function getDayOutputSummary(
  day: DayMenu
): {
  startTime: string;
  endTime: string;
  duration: string;
  itemCount: number;
  isRestDay: boolean;
} {
  const seconds =
    calculateDaySeconds(day);

  return {
    startTime:
      day.startTime || "--:--",

    endTime:
      day.items.length > 0
        ? calculateEndTime(
            day.startTime,
            seconds
          )
        : "--:--",

    duration:
      day.items.length > 0
        ? formatDuration(seconds)
        : "休養",

    itemCount: day.items.length,

    isRestDay:
      day.items.length === 0,
  };
}

// ========================================
// 日付表示
// ========================================

/**
 * YYYY-MM-DDを
 * 7/14（月）の形式へ変換
 */
export function formatOutputDate(
  dateString: string,
  dayLabel?: string
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      dateString
    );

  if (!match) {
    return dayLabel
      ? `${dateString}（${dayLabel}）`
      : dateString;
  }

  const month = Number(match[2]);
  const day = Number(match[3]);

  return dayLabel
    ? `${month}/${day}（${dayLabel}）`
    : `${month}/${day}`;
}

/**
 * 出力期間を
 * 7/14〜7/17の形式へ変換
 */
export function formatOutputRange(
  startDate: string,
  endDate: string
): string {
  if (!startDate && !endDate) {
    return "";
  }

  if (startDate === endDate) {
    return formatOutputDate(startDate);
  }

  return `${formatOutputDate(
    startDate
  )}〜${formatOutputDate(endDate)}`;
}

// ========================================
// カテゴリー表示
// ========================================

export function getCategoryIcon(
  category: string
): string {
  const iconMap: Record<string, string> = {
    アップ: "◯",
    技術: "◆",
    スプリント: "➤",
    ジャンプ: "▲",
    筋トレ: "■",
    補強: "＋",
    メディシンボール: "●",
    リカバリー: "◇",
    ダウン: "▽",
  };

  return iconMap[category] || "・";
}

/**
 * Tailwind用のカテゴリー色
 */
export function getCategoryColorClass(
  category: string
): {
  badge: string;
  border: string;
  dot: string;
} {
  const colorMap: Record<
    string,
    {
      badge: string;
      border: string;
      dot: string;
    }
  > = {
    アップ: {
      badge:
        "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
      border: "border-emerald-400/40",
      dot: "bg-emerald-400",
    },

    技術: {
      badge:
        "border-blue-300/20 bg-blue-400/10 text-blue-300",
      border: "border-blue-400/40",
      dot: "bg-blue-400",
    },

    スプリント: {
      badge:
        "border-orange-300/20 bg-orange-400/10 text-orange-300",
      border: "border-orange-400/40",
      dot: "bg-orange-400",
    },

    ジャンプ: {
      badge:
        "border-violet-300/20 bg-violet-400/10 text-violet-300",
      border: "border-violet-400/40",
      dot: "bg-violet-400",
    },

    筋トレ: {
      badge:
        "border-rose-300/20 bg-rose-400/10 text-rose-300",
      border: "border-rose-400/40",
      dot: "bg-rose-400",
    },

    補強: {
      badge:
        "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",
      border: "border-cyan-400/40",
      dot: "bg-cyan-400",
    },

    メディシンボール: {
      badge:
        "border-pink-300/20 bg-pink-400/10 text-pink-300",
      border: "border-pink-400/40",
      dot: "bg-pink-400",
    },

    リカバリー: {
      badge:
        "border-teal-300/20 bg-teal-400/10 text-teal-300",
      border: "border-teal-400/40",
      dot: "bg-teal-400",
    },

    ダウン: {
      badge:
        "border-slate-300/20 bg-slate-400/10 text-slate-300",
      border: "border-slate-400/40",
      dot: "bg-slate-400",
    },
  };

  return (
    colorMap[category] || {
      badge:
        "border-white/10 bg-white/[0.05] text-slate-300",
      border: "border-slate-500/40",
      dot: "bg-slate-500",
    }
  );
}

// ========================================
// 内部処理
// ========================================

function cleanValue(
  value?: string
): string {
  return String(value || "").trim();
}

/**
 * 単位がなければ末尾へ追加
 */
function addUnitIfMissing(
  value: string,
  unit: string
): string {
  const cleaned = cleanValue(value);

  if (!cleaned) return "";

  if (
    cleaned
      .toLowerCase()
      .endsWith(unit.toLowerCase())
  ) {
    return cleaned;
  }

  return `${cleaned}${unit}`;
}

/**
 * 指定された単位を文字列から取り除く
 */
function removeUnit(
  value: string,
  units: string[]
): string {
  let result = cleanValue(value);

  units.forEach((unit) => {
    const escaped =
      escapeRegExp(unit);

    result = result.replace(
      new RegExp(
        `${escaped}$`,
        "i"
      ),
      ""
    );
  });

  return result.trim();
}

function escapeRegExp(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}