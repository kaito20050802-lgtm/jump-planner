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
import { DayMenu, Drill, WeeklyDraft, WeeklyItem } from "@/types/training";
import {
  addDaysISO,
  calculateDaySeconds,
  calculateEndTime,
  createWeekMenus,
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
  onSaved: () => void;
  onCancelEdit: () => void;
};

export default function WeeklyEditor({
  role,
  event,
  memberId,
  drills,
  editingDraft,
  onSaved,
  onCancelEdit,
}: Props) {
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(getTodayISO());
  const [theme, setTheme] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [dayMenus, setDayMenus] = useState<DayMenu[]>(
    createWeekMenus(getTodayISO())
  );

  useEffect(() => {
    if (!editingDraft) {
      resetForm();
      return;
    }

    setEditingDraftId(editingDraft.id);
    setWeekStart(
      editingDraft.weekStartDate || editingDraft.weekStart || getTodayISO()
    );
    setTheme(editingDraft.theme || "");
    setMemo(editingDraft.memo || "");

    if (editingDraft.dayMenus && editingDraft.dayMenus.length > 0) {
      setDayMenus(
        editingDraft.dayMenus.map((day) => ({
          ...day,
          startTime: day.startTime || "17:00",
          items: day.items.map((item) => normalizeWeeklyItem(item)),
        }))
      );
    } else {
      const menus = createWeekMenus(editingDraft.weekStart || getTodayISO());
      menus[0].items = (editingDraft.items || []).map((item) =>
        normalizeWeeklyItem(item)
      );
      setDayMenus(menus);
    }

    setSelectedDayIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [editingDraft]);

  const availableDrills = useMemo(() => {
    return drills.filter((drill) => {
      if (role === "leader") return true;
      return drill.targetEvent === "共通" || drill.targetEvent === event;
    });
  }, [drills, role, event]);

  const selectedDay = dayMenus[selectedDayIndex];
  const selectedIds = selectedDay?.items.map((item) => item.drillId) || [];

  const handleWeekStartChange = (value: string) => {
    setWeekStart(value);
    setDayMenus(createWeekMenus(value));
    setSelectedDayIndex(0);
  };

  const toggleDrill = (drill: Drill) => {
    setDayMenus((prev) =>
      prev.map((day, index) => {
        if (index !== selectedDayIndex) return day;

        const exists = day.items.some((item) => item.drillId === drill.id);

        if (exists) {
          return {
            ...day,
            items: day.items.filter((item) => item.drillId !== drill.id),
          };
        }

        const newItem: WeeklyItem = {
          drillId: drill.id,
          name: drill.name,
          category: drill.category,
          targetEvent: drill.targetEvent,
          purposeTags: drill.purposeTags || [],

          timeMode: drill.timeMode || "manual",

          baseDistance: drill.baseDistance || "",
          baseSeconds: drill.baseSeconds || "",
          defaultMinutes: drill.defaultMinutes || "",

          distance: "",
          reps: "",
          sets: "",
          intensity: "",

          // 本数間レスト
          repRestSeconds: "",

          // セット間レスト
          setRestMinutes: "",

          // 手入力時間
          manualMinutes: drill.defaultMinutes || "",

          // ★追加
          customOneRepSeconds: "",

          // 筋トレ用
          selectedSeason: undefined,
          selectedPurpose: undefined,
          selectedPercent: "",
        };
        

        return {
          ...day,
          items: [...day.items, newItem],
        };
      })
    );
  };

  const updateDayStartTime = (value: string) => {
    setDayMenus((prev) =>
      prev.map((day, index) =>
        index === selectedDayIndex ? { ...day, startTime: value } : day
      )
    );
  };

  const updateItem = (
    drillId: string,
    field: keyof WeeklyItem,
    value: string
  ) => {
    setDayMenus((prev) =>
      prev.map((day, index) => {
        if (index !== selectedDayIndex) return day;

        return {
          ...day,
          items: day.items.map((item) =>
            item.drillId === drillId ? { ...item, [field]: value } : item
          ),
        };
      })
    );
  };

  const removeItem = (drillId: string) => {
    setDayMenus((prev) =>
      prev.map((day, index) => {
        if (index !== selectedDayIndex) return day;

        return {
          ...day,
          items: day.items.filter((item) => item.drillId !== drillId),
        };
      })
    );
  };

  const saveDraft = async (status: "draft" | "submitted") => {
    if (!theme.trim()) {
      alert("今週テーマを入力してください");
      return;
    }

    const allItems = dayMenus.flatMap((day) => day.items);

    if (allItems.length === 0) {
      alert("練習を1つ以上選択してください");
      return;
    }

    const today = getTodayISO();
    const maxDate = addDaysISO(today, 28);

    if (weekStart > maxDate) {
      alert("4週間先までしか作成できません");
      return;
    }

    const deleteAfter = addDaysISO(weekStart, 14);

    const payload = {
      event,
      weekStart,
      weekStartDate: weekStart,
      deleteAfter,
      theme,
      memo,
      dayMenus,
      items: allItems,
      status,
      updatedAt: serverTimestamp(),
    };

    if (editingDraftId) {
      await updateDoc(doc(db, "weeklyMenuDrafts", editingDraftId), payload);
    } else {
      await addDoc(collection(db, "weeklyMenuDrafts"), {
        ...payload,
        submittedBy: memberId,
        leaderComment: "",
        coachComment: "",
        createdAt: serverTimestamp(),
      });
    }

    alert(status === "draft" ? "下書きを保存しました" : "提出しました");
    resetForm();
    onSaved();
  };

  const resetForm = () => {
    setEditingDraftId(null);
    setWeekStart(getTodayISO());
    setTheme("");
    setMemo("");
    setSelectedDayIndex(0);
    setDayMenus(createWeekMenus(getTodayISO()));
  };

  const cancelEdit = () => {
    resetForm();
    onCancelEdit();
  };

  if (!selectedDay) return null;

  const totalSeconds = calculateDaySeconds(selectedDay);
  const endTime = calculateEndTime(selectedDay.startTime, totalSeconds);

  return (
    <>
      <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">
          {editingDraftId ? "メニュー編集" : "仮メニュー作成"}
        </h2>

        <Input
          label="週の開始日"
          type="date"
          value={weekStart}
          onChange={handleWeekStartChange}
        />

        <Input
          label="今週テーマ"
          value={theme}
          onChange={setTheme}
          placeholder="例：ホップ改善、助走リズム"
        />

        <div className="mt-4">
          <label className="text-sm font-black">代表メモ</label>
          <textarea
            className="mt-2 h-24 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="狙いや流れを書いてください"
          />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-100 p-4">
          <p className="text-sm font-black text-slate-500">選択中の日</p>
          <p className="mt-1 text-lg font-black">
            {selectedDay.date}（{selectedDay.label}）
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {selectedDay.startTime}開始 → {endTime}終了予定
          </p>
        </div>
      </section>

      <WeeklyDayTabs
        dayMenus={dayMenus}
        selectedDayIndex={selectedDayIndex}
        onChange={setSelectedDayIndex}
      />

      <div className="mt-5">
        <WeeklySearch
          drills={availableDrills}
          selectedIds={selectedIds}
          onSelect={toggleDrill}
        />
      </div>

      <div className="mt-5">
        <WeeklyFolder
          drills={availableDrills}
          selectedIds={selectedIds}
          onSelect={toggleDrill}
        />
      </div>

      <WeeklySelectedList
        selectedDay={selectedDay}
        selectedDayIndex={selectedDayIndex}
        onStartTimeChange={updateDayStartTime}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
      />

      <WeeklySummary selectedDay={selectedDay} />

      <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">各曜日のメニュー確認</h2>

        <div className="mt-4 space-y-3">
          {dayMenus.map((day) => {
            const seconds = calculateDaySeconds(day);
            const dayEndTime = calculateEndTime(day.startTime, seconds);

            return (
              <div key={day.date} className="rounded-2xl bg-slate-100 p-4">
                <p className="font-black">
                  {day.date}（{day.label}）
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {day.startTime}開始 → {dayEndTime}終了予定
                </p>

                {day.items.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {day.items.map((item, index) => (
                      <p
                        key={`${day.date}-${item.drillId}-${index}`}
                        className="text-sm font-bold"
                      >
                        {index + 1}. {item.name}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    未入力
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => saveDraft("draft")}
          className="rounded-2xl bg-white py-4 font-black text-slate-900 shadow-sm"
        >
          下書き保存
        </button>

        <button
          onClick={() => saveDraft("submitted")}
          className="rounded-2xl bg-blue-600 py-4 font-black text-white"
        >
          提出する
        </button>
      </div>

      {editingDraftId && (
        <button
          onClick={cancelEdit}
          className="mt-3 w-full rounded-2xl bg-slate-200 py-4 font-black text-slate-700"
        >
          編集をキャンセル
        </button>
      )}
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <input
        type={type}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}