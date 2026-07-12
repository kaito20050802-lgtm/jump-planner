"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
  DayMenu,
  Drill,
  WeeklyDraft,
  WeeklyItem,
} from "@/types/training";

import {
  addDaysISO,
  calculateDaySeconds,
  calculateEndTime,
  createWeekMenus,
  formatDuration,
  getTodayISO,
  normalizeWeeklyItem,
} from "@/lib/trainingTime";

import WeeklyDayTabs from "./WeeklyDayTabs";
import WeeklySearch from "./WeeklySearch";
import WeeklyFolder from "./WeeklyFolder";
import WeeklySelectedList from "./WeeklySelectedList";
import WeeklySummary from "./WeeklySummary";

type Props = {
  role: string;
  event: string;
  memberId: string;
  drills: Drill[];
  editingDraft: WeeklyDraft | null;
  onSaved: () => void | Promise<void>;
  onCancelEdit: () => void;
};

type StatusAccent =
  | "cyan"
  | "violet"
  | "pink"
  | "slate";

type SaveStatus = "draft" | "submitted";

export default function WeeklyEditor({
  role,
  event,
  memberId,
  drills,
  editingDraft,
  onSaved,
  onCancelEdit,
}: Props) {
  const [editingDraftId, setEditingDraftId] =
    useState<string | null>(null);

  const [weekStart, setWeekStart] = useState(
    getTodayISO()
  );

  const [theme, setTheme] = useState("");
  const [memo, setMemo] = useState("");

  const [
    selectedDayIndex,
    setSelectedDayIndex,
  ] = useState(0);

  const [dayMenus, setDayMenus] = useState<
    DayMenu[]
  >(() => createWeekMenus(getTodayISO()));

  const [savingStatus, setSavingStatus] =
    useState<SaveStatus | null>(null);

  const saving = savingStatus !== null;

  useEffect(() => {
    if (!editingDraft) {
      resetForm();
      return;
    }

    const draftWeekStart =
      editingDraft.weekStartDate ||
      editingDraft.weekStart ||
      getTodayISO();

    setEditingDraftId(editingDraft.id);
    setWeekStart(draftWeekStart);
    setTheme(editingDraft.theme || "");
    setMemo(editingDraft.memo || "");

    if (editingDraft.dayMenus?.length) {
      setDayMenus(
        editingDraft.dayMenus.map((day) => ({
          ...day,

          startTime:
            day.startTime || "17:00",

          items: (day.items || []).map(
            (item) =>
              normalizeWeeklyItem(item)
          ),
        }))
      );
    } else {
      const menus =
        createWeekMenus(draftWeekStart);

      menus[0].items = (
        editingDraft.items || []
      ).map((item) =>
        normalizeWeeklyItem(item)
      );

      setDayMenus(menus);
    }

    setSelectedDayIndex(0);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [editingDraft]);

  const availableDrills = useMemo(() => {
    return drills.filter((drill) => {
      if (role === "leader") {
        return true;
      }

      return (
        drill.targetEvent === "共通" ||
        drill.targetEvent === event
      );
    });
  }, [drills, role, event]);

  const selectedDay =
    dayMenus[selectedDayIndex];

  const selectedIds = useMemo(() => {
    return (
      selectedDay?.items.map(
        (item) => item.drillId
      ) || []
    );
  }, [selectedDay]);

  const totalWeekItems = useMemo(() => {
    return dayMenus.reduce(
      (total, day) =>
        total + day.items.length,
      0
    );
  }, [dayMenus]);

  const completedDays = useMemo(() => {
    return dayMenus.filter(
      (day) => day.items.length > 0
    ).length;
  }, [dayMenus]);

  const weekTotalSeconds = useMemo(() => {
    return dayMenus.reduce(
      (total, day) =>
        total + calculateDaySeconds(day),
      0
    );
  }, [dayMenus]);

  const handleWeekStartChange = (
    value: string
  ) => {
    if (!value) return;

    const hasEnteredMenu = dayMenus.some(
      (day) => day.items.length > 0
    );

    if (hasEnteredMenu) {
      const shouldReset = window.confirm(
        "開始日を変更すると、現在入力している曜日別メニューがリセットされます。変更しますか？"
      );

      if (!shouldReset) {
        return;
      }
    }

    setWeekStart(value);
    setDayMenus(createWeekMenus(value));
    setSelectedDayIndex(0);
  };

  const toggleDrill = (drill: Drill) => {
    setDayMenus((currentMenus) =>
      currentMenus.map((day, index) => {
        if (index !== selectedDayIndex) {
          return day;
        }

        const exists = day.items.some(
          (item) =>
            item.drillId === drill.id
        );

        if (exists) {
          return {
            ...day,

            items: day.items.filter(
              (item) =>
                item.drillId !== drill.id
            ),
          };
        }

        const newItem: WeeklyItem = {
          drillId: drill.id,
          name: drill.name,
          category: drill.category,
          targetEvent:
            drill.targetEvent,
          purposeTags:
            drill.purposeTags || [],

          timeMode:
            drill.timeMode || "manual",

          baseDistance:
            drill.baseDistance || "",

          baseSeconds:
            drill.baseSeconds || "",

          defaultMinutes:
            drill.defaultMinutes || "",

          distance: "",
          reps: "",
          sets: "",
          intensity: "",

          repRestSeconds: "",
          setRestMinutes: "",

          manualMinutes:
            drill.defaultMinutes || "",

          customOneRepSeconds: "",

          selectedPercent: "",
        };

        return {
          ...day,
          items: [...day.items, newItem],
        };
      })
    );
  };

  const updateDayStartTime = (
    value: string
  ) => {
    setDayMenus((currentMenus) =>
      currentMenus.map((day, index) =>
        index === selectedDayIndex
          ? {
              ...day,
              startTime: value,
            }
          : day
      )
    );
  };

  const updateItem = (
    drillId: string,
    field: keyof WeeklyItem,
    value: string
  ) => {
    setDayMenus((currentMenus) =>
      currentMenus.map((day, index) => {
        if (index !== selectedDayIndex) {
          return day;
        }

        return {
          ...day,

          items: day.items.map((item) =>
            item.drillId === drillId
              ? {
                  ...item,
                  [field]: value,
                }
              : item
          ),
        };
      })
    );
  };

  const removeItem = (
    drillId: string
  ) => {
    setDayMenus((currentMenus) =>
      currentMenus.map((day, index) => {
        if (index !== selectedDayIndex) {
          return day;
        }

        return {
          ...day,

          items: day.items.filter(
            (item) =>
              item.drillId !== drillId
          ),
        };
      })
    );
  };

  const validateBeforeSave = (
    status: SaveStatus
  ): boolean => {
    if (saving) {
      return false;
    }

    if (!memberId) {
      alert(
        "ログイン情報を取得できません。もう一度ログインしてください"
      );

      return false;
    }

    if (!weekStart) {
      alert(
        "週の開始日を選択してください"
      );

      return false;
    }

    if (!theme.trim()) {
      alert(
        "今週のテーマを入力してください"
      );

      return false;
    }

    const itemCount = dayMenus.reduce(
      (total, day) =>
        total + day.items.length,
      0
    );

    if (itemCount === 0) {
      alert(
        "練習を1つ以上選択してください"
      );

      return false;
    }

    const today = getTodayISO();
    const minDate = addDaysISO(
      today,
      -14
    );

    const maxDate = addDaysISO(
      today,
      28
    );

    if (weekStart < minDate) {
      alert(
        "2週間より前の週メニューは作成できません"
      );

      return false;
    }

    if (weekStart > maxDate) {
      alert(
        "週メニューは4週間先まで作成できます"
      );

      return false;
    }

    if (
      status === "submitted" &&
      role !== "representative"
    ) {
      alert(
        "パート長への提出は種目代表のみ行えます"
      );

      return false;
    }

    return true;
  };

  const saveDraft = async (
    status: SaveStatus
  ) => {
    if (!validateBeforeSave(status)) {
      return;
    }

    setSavingStatus(status);

    try {
      /*
       * Firestoreはundefinedを保存できないため、
       * 保存前に再帰的に取り除きます。
       */
      const cleanedDayMenus =
        removeUndefinedValues(
          dayMenus
        ) as DayMenu[];

      const allItems =
        cleanedDayMenus.flatMap(
          (day) => day.items
        );

      const deleteAfter =
        addDaysISO(weekStart, 14);

      const commonPayload = {
        event,

        weekStart,
        weekStartDate: weekStart,
        deleteAfter,

        theme: theme.trim(),
        memo: memo.trim(),

        dayMenus: cleanedDayMenus,

        // 旧データとの互換用
        items: allItems,

        status,

        submittedBy: memberId,

        updatedAt: serverTimestamp(),
      };

      if (editingDraftId) {
        await updateDoc(
          doc(
            db,
            "weeklyMenuDrafts",
            editingDraftId
          ),
          commonPayload
        );
      } else {
        await addDoc(
          collection(
            db,
            "weeklyMenuDrafts"
          ),
          {
            ...commonPayload,

            leaderComment: "",
            coachComment: "",

            createdAt:
              serverTimestamp(),
          }
        );
      }

      alert(
        status === "draft"
          ? "下書きを保存しました"
          : "パート長へ提出しました"
      );

      resetForm();

      await onSaved();
    } catch (error) {
      console.error(
        "週メニューの保存に失敗しました",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      alert(
        [
          "週メニューの保存に失敗しました。",
          "",
          errorMessage,
        ].join("\n")
      );
    } finally {
      setSavingStatus(null);
    }
  };

  const resetForm = () => {
    const today = getTodayISO();

    setEditingDraftId(null);
    setWeekStart(today);
    setTheme("");
    setMemo("");
    setSelectedDayIndex(0);
    setDayMenus(
      createWeekMenus(today)
    );
  };

  const cancelEdit = () => {
    if (saving) return;

    const shouldCancel =
      window.confirm(
        "編集中の内容を破棄しますか？"
      );

    if (!shouldCancel) {
      return;
    }

    resetForm();
    onCancelEdit();
  };

  if (!selectedDay) {
    return null;
  }

  const selectedDaySeconds =
    calculateDaySeconds(selectedDay);

  const selectedDayEndTime =
    calculateEndTime(
      selectedDay.startTime,
      selectedDaySeconds
    );

  return (
    <>
      {/* 基本情報 */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                PLAN SETTINGS
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                {editingDraftId
                  ? "週メニューを編集"
                  : "基本情報を設定"}
              </h2>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
                週のテーマと対象期間を設定してから、
                曜日ごとの練習を作成します。
              </p>
            </div>

            {editingDraftId && (
              <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300">
                編集中
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <GlassInput
              label="週の開始日"
              type="date"
              value={weekStart}
              onChange={
                handleWeekStartChange
              }
            />

            <GlassInput
              label="今週のテーマ"
              value={theme}
              onChange={setTheme}
              placeholder="例：ホップ改善、助走リズムの安定"
            />
          </div>

          <GlassTextarea
            label="代表メモ"
            value={memo}
            onChange={setMemo}
            placeholder="今週の狙い、練習の流れ、注意したいことなど"
          />

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatusCard
              label="選択中"
              value={`${selectedDay.label}曜日`}
              accent="cyan"
            />

            <StatusCard
              label="開始時刻"
              value={
                selectedDay.startTime ||
                "未設定"
              }
              accent="violet"
            />

            <StatusCard
              label="終了予定"
              value={selectedDayEndTime}
              accent="pink"
            />

            <StatusCard
              label="登録済み"
              value={`${selectedDay.items.length}件`}
              accent="slate"
            />
          </div>
        </div>
      </section>

      {/* 曜日選択 */}
      <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <SectionTitle
          icon="7"
          eyebrow="DAY SELECT"
          title="編集する曜日を選択"
          accent="violet"
        />

        <WeeklyDayTabs
          dayMenus={dayMenus}
          selectedDayIndex={
            selectedDayIndex
          }
          onChange={setSelectedDayIndex}
        />
      </section>

      {/* 検索 */}
      <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <SectionTitle
          icon="⌕"
          eyebrow="SEARCH"
          title="練習名から探す"
          accent="cyan"
        />

        <div className="mt-5">
          <WeeklySearch
            drills={availableDrills}
            selectedIds={selectedIds}
            onSelect={toggleDrill}
          />
        </div>
      </section>

      {/* フォルダー */}
      <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <SectionTitle
          icon="▣"
          eyebrow="FOLDER"
          title="フォルダーから選択"
          accent="pink"
        />

        <div className="mt-5">
          <WeeklyFolder
            drills={availableDrills}
            selectedIds={selectedIds}
            onSelect={toggleDrill}
          />
        </div>
      </section>

      {/* 選択した練習 */}
      <WeeklySelectedList
        selectedDay={selectedDay}
        selectedDayIndex={
          selectedDayIndex
        }
        onStartTimeChange={
          updateDayStartTime
        }
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
      />

      {/* その日のまとめ */}
      <WeeklySummary
        selectedDay={selectedDay}
      />

      {/* 週間一覧 */}
      <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-pink-300">
              WEEK OVERVIEW
            </p>

            <h2 className="mt-2 text-xl font-black text-white">
              1週間のメニュー確認
            </h2>
          </div>

          <div className="text-right">
            <p className="text-xs font-black text-slate-500">
              週間合計
            </p>

            <p className="mt-1 text-sm font-black text-cyan-300">
              {formatDuration(
                weekTotalSeconds
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {dayMenus.map(
            (day, dayIndex) => {
              const seconds =
                calculateDaySeconds(day);

              const endTime =
                calculateEndTime(
                  day.startTime,
                  seconds
                );

              const selected =
                dayIndex ===
                selectedDayIndex;

              return (
                <button
                  key={`${day.date}-${dayIndex}`}
                  type="button"
                  onClick={() =>
                    setSelectedDayIndex(
                      dayIndex
                    )
                  }
                  className={`w-full touch-manipulation rounded-[24px] border p-4 text-left transition ${
                    selected
                      ? "border-cyan-300/40 bg-cyan-400/10 shadow-lg shadow-cyan-500/10"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-black ${
                          selected
                            ? "text-cyan-300"
                            : "text-slate-500"
                        }`}
                      >
                        {day.label}曜日
                      </p>

                      <p className="mt-1 font-black text-white">
                        {day.date}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black text-slate-300">
                      {day.items.length}件
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-400">
                    {day.startTime ||
                      "--:--"}{" "}
                    開始

                    <span className="mx-2 text-slate-600">
                      →
                    </span>

                    {endTime} 終了予定
                  </p>

                  <div className="mt-3 space-y-2">
                    {day.items
                      .slice(0, 3)
                      .map(
                        (
                          item,
                          index
                        ) => (
                          <p
                            key={`${day.date}-${item.drillId}-${index}`}
                            className="truncate text-sm font-bold text-slate-300"
                          >
                            {index + 1}.{" "}
                            {item.name}
                          </p>
                        )
                      )}

                    {day.items.length > 3 && (
                      <p className="text-xs font-black text-violet-300">
                        ほか{" "}
                        {day.items.length -
                          3}
                        件
                      </p>
                    )}

                    {day.items.length ===
                      0 && (
                      <p className="text-sm font-bold text-slate-600">
                        まだ練習が登録されていません
                      </p>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* 週間進捗 */}
      <section className="mt-5 rounded-[32px] border border-white/10 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-pink-500/10 p-5 backdrop-blur-2xl md:p-6">
        <div className="grid grid-cols-3 gap-3">
          <ProgressCard
            label="入力済み曜日"
            value={`${completedDays}/7`}
          />

          <ProgressCard
            label="練習数"
            value={`${totalWeekItems}件`}
          />

          <ProgressCard
            label="週間時間"
            value={formatDuration(
              weekTotalSeconds
            )}
          />
        </div>
      </section>

      {/* 保存ボタン */}
      <div className="relative z-50 mt-5 grid gap-3 pointer-events-auto md:grid-cols-2">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void saveDraft("draft")
          }
          className="relative z-50 touch-manipulation rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-white shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingStatus === "draft"
            ? "保存中..."
            : "下書きを保存"}
        </button>

        {role === "representative" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveDraft(
                "submitted"
              )
            }
            className="relative z-50 touch-manipulation rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-4 font-black text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingStatus ===
            "submitted"
              ? "送信中..."
              : "パート長へ提出"}
          </button>
        ) : (
          <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] px-4 py-4 text-center">
            <p className="text-sm font-black text-violet-300">
              パート長への提出は種目代表のみ
            </p>
          </div>
        )}
      </div>

      {editingDraftId && (
        <button
          type="button"
          disabled={saving}
          onClick={cancelEdit}
          className="relative z-50 mt-3 w-full touch-manipulation rounded-2xl border border-rose-400/20 bg-rose-400/10 py-4 font-black text-rose-300 transition hover:bg-rose-400/15 active:scale-[0.99] disabled:opacity-50"
        >
          編集をキャンセル
        </button>
      )}
    </>
  );
}

function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-200">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
      />
    </div>
  );
}

function GlassTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-5">
      <label className="text-sm font-black text-slate-200">
        {label}
      </label>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
      />
    </div>
  );
}

function StatusCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: StatusAccent;
}) {
  const styles: Record<
    StatusAccent,
    string
  > = {
    cyan:
      "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

    violet:
      "border-violet-400/20 bg-violet-400/10 text-violet-300",

    pink:
      "border-pink-400/20 bg-pink-400/10 text-pink-300",

    slate:
      "border-white/10 bg-white/[0.05] text-slate-200",
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${styles[accent]}`}
    >
      <p className="text-[10px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function ProgressCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
      <p className="text-[10px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  accent,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  accent: "cyan" | "violet" | "pink";
}) {
  const iconStyles = {
    cyan:
      "from-cyan-400 to-blue-600 shadow-cyan-500/20",

    violet:
      "from-violet-500 to-indigo-600 shadow-violet-500/20",

    pink:
      "from-pink-500 to-rose-500 shadow-pink-500/20",
  };

  const textStyles = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    pink: "text-pink-300",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-black text-white shadow-lg ${iconStyles[accent]}`}
      >
        {icon}
      </div>

      <div>
        <p
          className={`text-xs font-black tracking-[0.2em] ${textStyles[accent]}`}
        >
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          {title}
        </h2>
      </div>
    </div>
  );
}

/**
 * Firestoreで保存できないundefinedを
 * 配列・オブジェクトの中から再帰的に削除します。
 */
function removeUndefinedValues<T>(
  value: T
): T {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item) =>
          item !== undefined
      )
      .map((item) =>
        removeUndefinedValues(item)
      ) as T;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const cleanedEntries =
      Object.entries(
        value as Record<
          string,
          unknown
        >
      )
        .filter(
          ([, itemValue]) =>
            itemValue !== undefined
        )
        .map(
          ([key, itemValue]) => [
            key,
            removeUndefinedValues(
              itemValue
            ),
          ]
        );

    return Object.fromEntries(
      cleanedEntries
    ) as T;
  }

  return value;
}