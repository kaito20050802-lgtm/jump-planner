"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
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
  calculateDaySeconds,
  calculateEndTime,
  createDeleteAfter,
  createWeekMenus,
  formatDuration,
  getTodayISO,
  isDeleteExpired,
  normalizeText,
  normalizeWeeklyItem,
} from "@/lib/trainingTime";

type Member = {
  id: string;
  name: string;
  role: string;
};

export default function ReviewPage() {
  const router = useRouter();

  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");

  const [drafts, setDrafts] = useState<WeeklyDraft[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);

  const [selectedDraft, setSelectedDraft] =
    useState<WeeklyDraft | null>(null);

  const [leaderDayMenus, setLeaderDayMenus] =
    useState<DayMenu[]>([]);

  const [leaderMemo, setLeaderMemo] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("currentRole");
    const currentMemberId =
      sessionStorage.getItem("currentMemberId") || "";

    if (role !== "leader" || !currentMemberId) {
      router.push("/");
      return;
    }

    setMemberId(currentMemberId);

    const load = async () => {
      try {
        await cleanupExpiredData();
        await Promise.all([
          loadMember(currentMemberId),
          loadDrafts(),
          loadDrills(),
        ]);
      } catch (error) {
        console.error("提出BOXの読み込みに失敗しました", error);
        alert("提出メニューの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const loadMember = async (id: string) => {
    const snap = await getDoc(doc(db, "members", id));

    if (!snap.exists()) return;

    const member = {
      id: snap.id,
      ...snap.data(),
    } as Member;

    setMemberName(member.name || "");
  };

  const loadDrafts = async () => {
    const draftsQuery = query(
      collection(db, "weeklyMenuDrafts"),
      orderBy("updatedAt", "desc")
    );

    const snap = await getDocs(draftsQuery);

    const loaded = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as WeeklyDraft[];

    setDrafts(
      loaded.filter((draft) =>
        [
          "submitted",
          "editing",
          "published",
          "approved",
          "revision",
          "returned",
        ].includes(draft.status)
      )
    );
  };

  const loadDrills = async () => {
    const snap = await getDocs(collection(db, "drills"));

    const loaded = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Drill[];

    setDrills(
      loaded.filter((drill) => drill.isActive !== false)
    );
  };

  const cleanupExpiredData = async () => {
    const [draftSnap, planSnap] = await Promise.all([
      getDocs(collection(db, "weeklyMenuDrafts")),
      getDocs(collection(db, "weeklyPlans")),
    ]);

    const expiredDrafts = draftSnap.docs.filter((item) => {
      const data = item.data() as WeeklyDraft;

      if (data.deleteAfter) {
        return isDeleteExpired(data.deleteAfter);
      }

      const weekStart =
        data.weekStartDate || data.weekStart;

      if (!weekStart) return false;

      return createDeleteAfter(weekStart) < getTodayISO();
    });

    const expiredPlans = planSnap.docs.filter((item) => {
      const data = item.data() as {
        deleteAfter?: string;
        weekStart?: string;
      };

      if (data.deleteAfter) {
        return isDeleteExpired(data.deleteAfter);
      }

      if (!data.weekStart) return false;

      return (
        createDeleteAfter(data.weekStart) <
        getTodayISO()
      );
    });

    await Promise.all([
      ...expiredDrafts.map((item) =>
        deleteDoc(
          doc(db, "weeklyMenuDrafts", item.id)
        )
      ),
      ...expiredPlans.map((item) =>
        deleteDoc(doc(db, "weeklyPlans", item.id))
      ),
    ]);
  };

  const targetDrafts = useMemo(() => {
    return drafts.filter((draft) =>
      [
        "submitted",
        "editing",
        "published",
        "approved",
        "revision",
        "returned",
      ].includes(draft.status)
    );
  }, [drafts]);

  const submittedCount = targetDrafts.filter(
    (draft) =>
      draft.status === "submitted" ||
      draft.status === "revision" ||
      draft.status === "returned"
  ).length;

  const editingCount = targetDrafts.filter(
    (draft) => draft.status === "editing"
  ).length;

  const publishedCount = targetDrafts.filter(
    (draft) =>
      draft.status === "published" ||
      draft.status === "approved"
  ).length;

  const selectedDay =
    leaderDayMenus[selectedDayIndex] || null;

  const filteredDrills = useMemo(() => {
    const keyword = normalizeText(searchText);

    if (!keyword || !selectedDraft) return [];

    return drills
      .filter(
        (drill) =>
          drill.targetEvent === "共通" ||
          drill.targetEvent === selectedDraft.event
      )
      .filter((drill) => {
        const target = normalizeText(
          [
            drill.name,
            drill.category,
            drill.targetEvent,
            ...(drill.purposeTags || []),
            drill.description || "",
          ].join(" ")
        );

        return target.includes(keyword);
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, "ja")
      )
      .slice(0, 20);
  }, [drills, searchText, selectedDraft]);

  const openDraft = async (draft: WeeklyDraft) => {
    const originalMenus = getDraftDayMenus(draft);

    const editorMenus =
      draft.leaderDayMenus?.length
        ? cloneDayMenus(draft.leaderDayMenus)
        : cloneDayMenus(originalMenus);

    setSelectedDraft(draft);
    setLeaderDayMenus(editorMenus);
    setLeaderMemo(
      draft.leaderMemo ||
        draft.leaderComment ||
        ""
    );
    setSelectedDayIndex(0);
    setSearchText("");

    if (
      draft.status === "submitted" ||
      draft.status === "revision" ||
      draft.status === "returned"
    ) {
      try {
        await updateDoc(
          doc(db, "weeklyMenuDrafts", draft.id),
          {
            status: "editing",
            leaderDayMenus: editorMenus,
            editingBy: memberId,
            editingStartedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        setDrafts((current) =>
          current.map((item) =>
            item.id === draft.id
              ? {
                  ...item,
                  status: "editing",
                  leaderDayMenus: editorMenus,
                  editingBy: memberId,
                }
              : item
          )
        );

        setSelectedDraft({
          ...draft,
          status: "editing",
          leaderDayMenus: editorMenus,
          editingBy: memberId,
        });
      } catch (error) {
        console.error("編集開始処理に失敗しました", error);
        alert("編集状態への変更に失敗しました");
      }
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const closeEditor = () => {
    setSelectedDraft(null);
    setLeaderDayMenus([]);
    setLeaderMemo("");
    setSelectedDayIndex(0);
    setSearchText("");
  };

  const updateStartTime = (value: string) => {
    setLeaderDayMenus((current) =>
      current.map((day, index) =>
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
    itemIndex: number,
    field: keyof WeeklyItem,
    value: string
  ) => {
    setLeaderDayMenus((current) =>
      current.map((day, dayIndex) => {
        if (dayIndex !== selectedDayIndex) {
          return day;
        }

        return {
          ...day,
          items: day.items.map((item, index) =>
            index === itemIndex
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

  const removeItem = (itemIndex: number) => {
    setLeaderDayMenus((current) =>
      current.map((day, dayIndex) => {
        if (dayIndex !== selectedDayIndex) {
          return day;
        }

        return {
          ...day,
          items: day.items.filter(
            (_, index) => index !== itemIndex
          ),
        };
      })
    );
  };

  const addDrill = (drill: Drill) => {
    if (!selectedDay) return;

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

      repRestSeconds: "",
      setRestMinutes: "",
      manualMinutes: drill.defaultMinutes || "",
      customOneRepSeconds: "",

      selectedSeason: undefined,
      selectedPurpose: undefined,
      selectedPercent: "",
    };

    setLeaderDayMenus((current) =>
      current.map((day, index) =>
        index === selectedDayIndex
          ? {
              ...day,
              items: [...day.items, newItem],
            }
          : day
      )
    );
  };

  const saveLeaderEdit = async () => {
    if (!selectedDraft) return;

    setSaving(true);

    try {
      await updateDoc(
        doc(
          db,
          "weeklyMenuDrafts",
          selectedDraft.id
        ),
        {
          status: "editing",
          leaderDayMenus,
          leaderMemo: leaderMemo.trim(),
          editingBy: memberId,
          updatedAt: serverTimestamp(),
        }
      );

      alert("パート長の編集内容を保存しました");

      await loadDrafts();

      setSelectedDraft((current) =>
        current
          ? {
              ...current,
              status: "editing",
              leaderDayMenus,
              leaderMemo: leaderMemo.trim(),
            }
          : current
      );
    } catch (error) {
      console.error("編集内容の保存に失敗しました", error);
      alert("編集内容の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const publishPlan = async () => {
    if (!selectedDraft) return;

    const totalItems = leaderDayMenus.reduce(
      (sum, day) => sum + day.items.length,
      0
    );

    if (totalItems === 0) {
      alert("完成メニューに練習がありません");
      return;
    }

    const confirmPublish = window.confirm(
      "この内容を完成メニューとして公開しますか？"
    );

    if (!confirmPublish) return;

    setPublishing(true);

    try {
      const originalDayMenus =
        getDraftDayMenus(selectedDraft);

      const weekStart =
        selectedDraft.weekStartDate ||
        selectedDraft.weekStart;

      const planReference = await addDoc(
        collection(db, "weeklyPlans"),
        {
          sourceDraftId: selectedDraft.id,
          event: selectedDraft.event,

          submittedBy:
            selectedDraft.submittedBy || "",
          submittedByName:
            selectedDraft.submittedByName || "",

          weekStart,
          weekStartDate: weekStart,
          deleteAfter:
            selectedDraft.deleteAfter ||
            createDeleteAfter(weekStart),

          theme: selectedDraft.theme || "",
          representativeMemo:
            selectedDraft.memo || "",
          leaderMemo: leaderMemo.trim(),

          originalDayMenus:
            cloneDayMenus(originalDayMenus),

          dayMenus:
            cloneDayMenus(leaderDayMenus),

          publishedBy: memberId,
          publishedByName: memberName,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
        }
      );

      await updateDoc(
        doc(
          db,
          "weeklyMenuDrafts",
          selectedDraft.id
        ),
        {
          status: "published",
          leaderDayMenus,
          leaderMemo: leaderMemo.trim(),

          publishedPlanId: planReference.id,
          publishedBy: memberId,
          publishedAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        }
      );

      alert("完成メニューを公開しました");

      closeEditor();
      await loadDrafts();
    } catch (error) {
      console.error("完成メニューの公開に失敗しました", error);
      alert("完成メニューの公開に失敗しました");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10172a] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />

          <p className="mt-4 font-black">
            提出メニューを読み込み中...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10172a] px-4 py-6 text-white">
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />

      <div className="pointer-events-none absolute -right-28 top-80 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px]" />

      <div className="pointer-events-none absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-cyan-500/15 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-cyan-300">
              JUMP PLANNER
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              提出BOX
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-400">
              各種目代表から提出された仮メニューを確認し、
              コーチとの相談内容を反映して完成版を作成します。
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/home")}
            className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs font-black text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
          >
            ホームへ
          </button>
        </header>

        {!selectedDraft ? (
          <>
            <section className="mt-7 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl shadow-lg shadow-pink-500/20">
                  ↓
                </div>

                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-violet-300">
                    SUBMISSION BOX
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    提出状況
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <SummaryCard
                  label="確認待ち"
                  value={submittedCount}
                  accent="cyan"
                />

                <SummaryCard
                  label="編集中"
                  value={editingCount}
                  accent="pink"
                />

                <SummaryCard
                  label="公開済み"
                  value={publishedCount}
                  accent="violet"
                />
              </div>
            </section>

            <section className="mt-6 space-y-4">
              {targetDrafts.map((draft) => (
                <SubmissionCard
                  key={draft.id}
                  draft={draft}
                  onOpen={() => openDraft(draft)}
                />
              ))}

              {targetDrafts.length === 0 && (
                <div className="rounded-[32px] border border-dashed border-white/15 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
                  <p className="font-black text-slate-300">
                    まだ提出されたメニューはありません
                  </p>

                  <p className="mt-2 text-xs font-bold text-slate-600">
                    代表が仮メニューを提出すると、ここに表示されます。
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="mt-7 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                    LEADER EDITOR
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {selectedDraft.event}の完成版を作成
                  </h2>

                  <p className="mt-2 text-sm font-bold text-slate-400">
                    {selectedDraft.weekStartDate ||
                      selectedDraft.weekStart}
                    {" / "}
                    {selectedDraft.theme}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditor}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-300"
                >
                  一覧へ戻る
                </button>
              </div>

              {selectedDraft.memo && (
                <div className="mt-5 rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] p-4">
                  <p className="text-xs font-black text-violet-300">
                    代表メモ
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-300">
                    {selectedDraft.memo}
                  </p>
                </div>
              )}

              <div className="mt-5">
                <label className="text-sm font-black text-slate-200">
                  パート長内部メモ
                </label>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  LINEでコーチと相談した内容や、変更理由を記録します。
                </p>

                <textarea
                  value={leaderMemo}
                  onChange={(event) =>
                    setLeaderMemo(event.target.value)
                  }
                  placeholder="例：コーチと相談し、木曜日の走本数を3本から2本へ変更"
                  className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold leading-6 text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>
            </section>

            <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
              <p className="text-xs font-black tracking-[0.2em] text-violet-300">
                DAY SELECT
              </p>

              <h2 className="mt-2 text-xl font-black">
                編集する曜日
              </h2>

              <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-7">
                {leaderDayMenus.map((day, index) => (
                  <button
                    key={`${day.date}-${index}`}
                    type="button"
                    onClick={() =>
                      setSelectedDayIndex(index)
                    }
                    className={`rounded-[22px] border p-3 text-left transition ${
                      selectedDayIndex === index
                        ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/25 to-violet-600/25"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <p className="text-xs font-black text-cyan-300">
                      {day.label}
                    </p>

                    <p className="mt-1 text-xs font-black text-white">
                      {formatShortDateLocal(day.date)}
                    </p>

                    <p className="mt-2 text-[10px] font-bold text-slate-500">
                      {day.items.length}件
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {selectedDay && (
              <>
                <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                        DAY SETTINGS
                      </p>

                      <h2 className="mt-2 text-xl font-black">
                        {selectedDay.label}曜日の編集
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-slate-500">
                        終了予定
                      </p>

                      <p className="mt-1 font-black text-cyan-300">
                        {calculateEndTime(
                          selectedDay.startTime,
                          calculateDaySeconds(
                            selectedDay
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-black text-slate-200">
                      開始時刻
                    </label>

                    <input
                      type="time"
                      value={
                        selectedDay.startTime ||
                        "17:00"
                      }
                      onChange={(event) =>
                        updateStartTime(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white outline-none"
                    />
                  </div>

                  <div className="mt-5 space-y-4">
                    {selectedDay.items.map(
                      (item, itemIndex) => (
                        <LeaderItemCard
                          key={`${item.drillId}-${itemIndex}`}
                          item={item}
                          index={itemIndex}
                          onUpdate={(field, value) =>
                            updateItem(
                              itemIndex,
                              field,
                              value
                            )
                          }
                          onRemove={() =>
                            removeItem(itemIndex)
                          }
                        />
                      )
                    )}

                    {selectedDay.items.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                        <p className="text-sm font-black text-slate-400">
                          この曜日には練習がありません
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
                  <p className="text-xs font-black tracking-[0.2em] text-pink-300">
                    ADD DRILL
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    練習を追加
                  </h2>

                  <input
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(
                        event.target.value
                      )
                    }
                    placeholder="練習名・タグ・カテゴリーで検索"
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white outline-none placeholder:text-slate-700"
                  />

                  {searchText.trim() && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {filteredDrills.map((drill) => (
                        <button
                          key={drill.id}
                          type="button"
                          onClick={() =>
                            addDrill(drill)
                          }
                          className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.06]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-cyan-300">
                                {drill.category}
                              </p>

                              <h3 className="mt-1 font-black text-white">
                                {drill.name}
                              </h3>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {drill.targetEvent}
                              </p>
                            </div>

                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 font-black text-cyan-300">
                              ＋
                            </span>
                          </div>
                        </button>
                      ))}

                      {filteredDrills.length === 0 && (
                        <p className="text-sm font-bold text-slate-500">
                          一致する練習がありません。
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                disabled={saving || publishing}
                onClick={saveLeaderEdit}
                className="rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {saving
                  ? "保存中..."
                  : "編集内容を保存"}
              </button>

              <button
                type="button"
                disabled={saving || publishing}
                onClick={publishPlan}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-4 font-black text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {publishing
                  ? "公開中..."
                  : "完成メニューを公開"}
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-slate-200"
        >
          ホームへ戻る
        </button>

        <p className="mt-8 pb-4 text-center text-xs font-bold text-slate-600">
          Jump Planner / Submission Box
        </p>
      </div>
    </main>
  );
}

function SubmissionCard({
  draft,
  onOpen,
}: {
  draft: WeeklyDraft;
  onOpen: () => void;
}) {
  const dayMenus = getDraftDayMenus(draft);

  const itemCount = dayMenus.reduce(
    (sum, day) => sum + day.items.length,
    0
  );

  const activeDays = dayMenus.filter(
    (day) => day.items.length > 0
  ).length;

  const status = getStatusStyle(draft.status);

  return (
    <article
      className={`relative overflow-hidden rounded-[30px] border p-5 shadow-xl backdrop-blur-xl ${status.card}`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl ${status.glow}`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black ${status.badge}`}
              >
                {status.label}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black text-slate-400">
                {draft.event}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-black text-white">
              {draft.theme || "テーマ未設定"}
            </h2>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {draft.weekStartDate ||
                draft.weekStart ||
                "日付未設定"}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-cyan-500/20"
          >
            {draft.status === "published" ||
            draft.status === "approved"
              ? "内容を見る"
              : "編集する"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Mini
            label="入力曜日"
            value={`${activeDays}/7`}
          />

          <Mini
            label="練習数"
            value={`${itemCount}件`}
          />

          <Mini
            label="代表者"
            value={
              draft.submittedByName ||
              "代表"
            }
          />
        </div>

        {draft.memo && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black text-slate-600">
              代表メモ
            </p>

            <p className="mt-2 line-clamp-3 text-sm font-bold leading-6 text-slate-300">
              {draft.memo}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function LeaderItemCard({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: WeeklyItem;
  index: number;
  onUpdate: (
    field: keyof WeeklyItem,
    value: string
  ) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-cyan-300">
            {index + 1}. {item.category}
          </p>

          <h3 className="mt-1 text-lg font-black text-white">
            {item.name}
          </h3>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-black text-rose-300"
        >
          削除
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <SmallInput
          label="距離（m）"
          value={item.distance}
          onChange={(value) =>
            onUpdate("distance", value)
          }
        />

        <SmallInput
          label="本数"
          value={item.reps}
          onChange={(value) =>
            onUpdate("reps", value)
          }
        />

        <SmallInput
          label="セット数"
          value={item.sets}
          onChange={(value) =>
            onUpdate("sets", value)
          }
        />

        <SmallInput
          label="強度"
          value={item.intensity}
          onChange={(value) =>
            onUpdate("intensity", value)
          }
        />

        <SmallInput
          label="本数間レスト（秒）"
          value={item.repRestSeconds}
          onChange={(value) =>
            onUpdate(
              "repRestSeconds",
              value
            )
          }
        />

        <SmallInput
          label="セット間レスト（分）"
          value={item.setRestMinutes}
          onChange={(value) =>
            onUpdate(
              "setRestMinutes",
              value
            )
          }
        />

        {item.timeMode === "auto" ? (
          <div className="col-span-2 md:col-span-3">
            <SmallInput
              label="今回の1本あたり時間（秒）"
              value={item.customOneRepSeconds}
              onChange={(value) =>
                onUpdate(
                  "customOneRepSeconds",
                  value
                )
              }
            />
          </div>
        ) : (
          <div className="col-span-2 md:col-span-3">
            <SmallInput
              label="今回の所要時間（分）"
              value={item.manualMinutes}
              onChange={(value) =>
                onUpdate(
                  "manualMinutes",
                  value
                )
              }
            />
          </div>
        )}
      </div>
    </article>
  );
}

function SmallInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-black text-slate-500">
        {label}
      </label>

      <input
        value={value || ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
      />
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "pink" | "violet";
}) {
  const styles = {
    cyan:
      "border-cyan-300/15 bg-cyan-400/[0.06] text-cyan-300",
    pink:
      "border-pink-300/15 bg-pink-400/[0.06] text-pink-300",
    violet:
      "border-violet-300/15 bg-violet-400/[0.06] text-violet-300",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${styles[accent]}`}
    >
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function getDraftDayMenus(
  draft: WeeklyDraft
): DayMenu[] {
  if (draft.dayMenus?.length) {
    return draft.dayMenus.map((day) => ({
      ...day,
      startTime: day.startTime || "17:00",
      items: (day.items || []).map((item) =>
        normalizeWeeklyItem(item)
      ),
    }));
  }

  const weekStart =
    draft.weekStartDate ||
    draft.weekStart ||
    getTodayISO();

  const menus = createWeekMenus(weekStart);

  menus[0].items = (draft.items || []).map(
    (item) => normalizeWeeklyItem(item)
  );

  return menus;
}

function cloneDayMenus(
  menus: DayMenu[]
): DayMenu[] {
  return menus.map((day) => ({
    ...day,
    items: day.items.map((item) => ({
      ...item,
      purposeTags: [...(item.purposeTags || [])],
    })),
  }));
}

function formatShortDateLocal(
  dateString: string
) {
  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return `${Number(parts[1])}/${Number(
    parts[2]
  )}`;
}

function getStatusStyle(status: string) {
  if (
    status === "submitted" ||
    status === "revision" ||
    status === "returned"
  ) {
    return {
      label: "確認待ち",
      card:
        "border-cyan-300/20 bg-cyan-400/[0.05]",
      badge:
        "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",
      glow: "bg-cyan-400/10",
    };
  }

  if (status === "editing") {
    return {
      label: "パート長編集中",
      card:
        "border-pink-300/20 bg-pink-400/[0.05]",
      badge:
        "border-pink-300/20 bg-pink-400/10 text-pink-300",
      glow: "bg-pink-400/10",
    };
  }

  if (
    status === "published" ||
    status === "approved"
  ) {
    return {
      label: "公開済み",
      card:
        "border-violet-300/20 bg-violet-400/[0.05]",
      badge:
        "border-violet-300/20 bg-violet-400/10 text-violet-300",
      glow: "bg-violet-400/10",
    };
  }

  return {
    label: status,
    card: "border-white/10 bg-black/20",
    badge:
      "border-white/10 bg-white/[0.05] text-slate-300",
    glow: "bg-white/5",
  };
}