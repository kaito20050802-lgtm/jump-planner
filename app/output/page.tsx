"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DayMenu,
  WeeklyItem,
  WeeklyPlan,
} from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  createDeleteAfter,
  formatDuration,
  formatJapaneseDate,
  getTodayISO,
  isDeleteExpired,
  normalizeWeeklyItem,
} from "@/lib/trainingTime";

type MemberRole =
  | "leader"
  | "representative"
  | "athlete"
  | "coach";

type DisplayPlan = WeeklyPlan & {
  dayMenus: DayMenu[];
  originalDayMenus: DayMenu[];
};

export default function OutputPage() {
  const router = useRouter();

  const [role, setRole] = useState<MemberRole | "">("");
  const [memberEvent, setMemberEvent] = useState("共通");

  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const [screenshotMode, setScreenshotMode] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentRole =
      sessionStorage.getItem("currentRole") as MemberRole | null;

    const currentMemberId =
      sessionStorage.getItem("currentMemberId");

    const currentEvent =
      sessionStorage.getItem("currentEvent") || "共通";

    if (!currentRole || !currentMemberId) {
      router.push("/");
      return;
    }

    setRole(currentRole);
    setMemberEvent(currentEvent);

    const load = async () => {
      try {
        await cleanupExpiredPlans();
        await loadPlans();
      } catch (error) {
        console.error(
          "完成メニューの読み込みに失敗しました",
          error
        );

        alert("完成メニューの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const cleanupExpiredPlans = async () => {
    const snap = await getDocs(
      collection(db, "weeklyPlans")
    );

    const expiredPlans = snap.docs.filter((item) => {
      const data = item.data() as Partial<WeeklyPlan>;

      if (data.deleteAfter) {
        return isDeleteExpired(data.deleteAfter);
      }

      const weekStart =
        data.weekStartDate ||
        data.weekStart;

      if (!weekStart) {
        return false;
      }

      return (
        createDeleteAfter(weekStart) <
        getTodayISO()
      );
    });

    await Promise.all(
      expiredPlans.map((item) =>
        deleteDoc(
          doc(db, "weeklyPlans", item.id)
        )
      )
    );
  };

  const loadPlans = async () => {
    const plansQuery = query(
      collection(db, "weeklyPlans"),
      orderBy("publishedAt", "desc")
    );

    const snap = await getDocs(plansQuery);

    const loaded = snap.docs.map((item) => {
      const data = item.data() as Omit<
        WeeklyPlan,
        "id"
      >;

      return normalizePlan({
        id: item.id,
        ...data,
      });
    });

    setPlans(loaded);

    if (loaded.length > 0) {
      setSelectedPlanId((current) => {
        if (
          current &&
          loaded.some((plan) => plan.id === current)
        ) {
          return current;
        }

        return loaded[0].id;
      });
    }
  };

  const visiblePlans = useMemo(() => {
    if (
      showAllEvents ||
      role === "leader" ||
      role === "coach" ||
      memberEvent === "共通"
    ) {
      return plans;
    }

    return plans.filter(
      (plan) =>
        plan.event === memberEvent ||
        plan.event === "共通"
    );
  }, [
    plans,
    role,
    memberEvent,
    showAllEvents,
  ]);

  useEffect(() => {
    if (visiblePlans.length === 0) {
      setSelectedPlanId("");
      return;
    }

    const selectedStillExists =
      visiblePlans.some(
        (plan) => plan.id === selectedPlanId
      );

    if (!selectedStillExists) {
      setSelectedPlanId(visiblePlans[0].id);
      setSelectedDayIndex(0);
    }
  }, [visiblePlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    return (
      visiblePlans.find(
        (plan) => plan.id === selectedPlanId
      ) || null
    );
  }, [visiblePlans, selectedPlanId]);

  const selectedDay =
    selectedPlan?.dayMenus[
      selectedDayIndex
    ] || null;

  const weekTotalSeconds = useMemo(() => {
    if (!selectedPlan) return 0;

    return selectedPlan.dayMenus.reduce(
      (total, day) =>
        total + calculateDaySeconds(day),
      0
    );
  }, [selectedPlan]);

  const totalWeekItems = useMemo(() => {
    if (!selectedPlan) return 0;

    return selectedPlan.dayMenus.reduce(
      (total, day) =>
        total + day.items.length,
      0
    );
  }, [selectedPlan]);

  const activeDays = useMemo(() => {
    if (!selectedPlan) return 0;

    return selectedPlan.dayMenus.filter(
      (day) => day.items.length > 0
    ).length;
  }, [selectedPlan]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10172a] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />

          <p className="mt-4 font-black">
            完成メニューを読み込み中...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`relative min-h-screen overflow-hidden ${
        screenshotMode
          ? "bg-white px-2 py-2 text-slate-900"
          : "bg-[#10172a] px-4 py-6 text-white"
      }`}
    >
      {!screenshotMode && (
        <>
          <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />

          <div className="pointer-events-none absolute -right-28 top-80 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px]" />

          <div className="pointer-events-none absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-cyan-500/15 blur-[110px]" />
        </>
      )}

      <div
        className={`relative z-10 mx-auto ${
          screenshotMode
            ? "max-w-xl"
            : "max-w-5xl"
        }`}
      >
        {!screenshotMode && (
          <>
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.28em] text-cyan-300">
                  JUMP PLANNER
                </p>

                <h1 className="mt-2 text-3xl font-black md:text-4xl">
                  完成メニュー
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-400">
                  パート長が修正・公開した、
                  チームの最終練習メニューを確認できます。
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/home")
                }
                className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs font-black text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
              >
                ホームへ
              </button>
            </header>

            <section className="mt-7 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl font-black shadow-lg shadow-pink-500/20">
                  ✓
                </div>

                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-violet-300">
                    PUBLISHED PLANS
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    公開済みメニュー
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <TopSummaryCard
                  label="公開メニュー"
                  value={`${visiblePlans.length}件`}
                  accent="cyan"
                />

                <TopSummaryCard
                  label="担当種目"
                  value={memberEvent}
                  accent="violet"
                />

                <TopSummaryCard
                  label="表示期間"
                  value="2週間"
                  accent="pink"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setScreenshotMode(true)
                  }
                  disabled={!selectedPlan}
                  className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  スクショモード
                </button>

                {(role === "leader" ||
                  role === "coach" ||
                  memberEvent !== "共通") && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllEvents(
                        (current) => !current
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/10"
                  >
                    {showAllEvents
                      ? "担当種目だけ表示"
                      : "全種目を表示"}
                  </button>
                )}
              </div>
            </section>

            {visiblePlans.length > 0 && (
              <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
                <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                  PLAN SELECT
                </p>

                <h2 className="mt-2 text-xl font-black">
                  表示する完成メニュー
                </h2>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {visiblePlans.map((plan) => {
                    const selected =
                      plan.id === selectedPlanId;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setSelectedDayIndex(0);
                        }}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          selected
                            ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-violet-600/20 shadow-lg shadow-cyan-500/10"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                selected
                                  ? "bg-white/15 text-cyan-100"
                                  : "bg-violet-400/10 text-violet-300"
                              }`}
                            >
                              {plan.event}
                            </span>

                            <h3 className="mt-3 font-black text-white">
                              {plan.theme ||
                                "テーマ未設定"}
                            </h3>

                            <p className="mt-2 text-xs font-bold text-slate-500">
                              {plan.weekStartDate ||
                                plan.weekStart}
                            </p>
                          </div>

                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black ${
                              selected
                                ? "border-cyan-300/30 bg-cyan-400/20 text-cyan-200"
                                : "border-white/10 bg-white/[0.04] text-slate-500"
                            }`}
                          >
                            {selected ? "✓" : "→"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {selectedPlan ? (
          <CompletedPlanView
            plan={selectedPlan}
            selectedDayIndex={selectedDayIndex}
            onDayChange={setSelectedDayIndex}
            selectedDay={selectedDay}
            weekTotalSeconds={weekTotalSeconds}
            totalWeekItems={totalWeekItems}
            activeDays={activeDays}
            screenshotMode={screenshotMode}
            onExitScreenshot={() =>
              setScreenshotMode(false)
            }
          />
        ) : (
          !screenshotMode && (
            <section className="mt-6 rounded-[32px] border border-dashed border-white/15 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl text-slate-500">
                ✓
              </div>

              <p className="mt-4 font-black text-slate-300">
                まだ完成メニューが公開されていません
              </p>

              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                パート長が完成メニューを公開すると、
                この画面に表示されます。
              </p>
            </section>
          )
        )}

        {!screenshotMode && (
          <>
            <button
              type="button"
              onClick={() =>
                router.push("/home")
              }
              className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-slate-200 transition hover:bg-white/10"
            >
              ホームへ戻る
            </button>

            <p className="mt-8 pb-4 text-center text-xs font-bold text-slate-600">
              Jump Planner / Published Training
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function CompletedPlanView({
  plan,
  selectedDayIndex,
  onDayChange,
  selectedDay,
  weekTotalSeconds,
  totalWeekItems,
  activeDays,
  screenshotMode,
  onExitScreenshot,
}: {
  plan: DisplayPlan;
  selectedDayIndex: number;
  onDayChange: (index: number) => void;
  selectedDay: DayMenu | null;
  weekTotalSeconds: number;
  totalWeekItems: number;
  activeDays: number;
  screenshotMode: boolean;
  onExitScreenshot: () => void;
}) {
  if (screenshotMode) {
    return (
      <section className="rounded-2xl border-2 border-slate-900 bg-white p-4 text-slate-900">
        <div className="text-center">
          <p className="text-xs font-black tracking-[0.2em]">
            JUMP TRAINING MENU
          </p>

          <h1 className="mt-2 text-2xl font-black">
            {plan.event}
          </h1>

          <p className="mt-1 text-sm font-black">
            {plan.theme}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {formatJapaneseDate(
              plan.weekStartDate ||
                plan.weekStart
            )}
            から
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {plan.dayMenus.map((day) => (
            <ScreenshotDay
              key={day.date}
              day={day}
            />
          ))}
        </div>

        {plan.leaderMemo && (
          <div className="mt-4 border-t-2 border-slate-900 pt-3">
            <p className="text-xs font-black">
              パート長より
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6">
              {plan.leaderMemo}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onExitScreenshot}
          className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-black text-white print:hidden"
        >
          スクショモードを終了
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="relative mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-300">
                {plan.event}
              </span>

              <h2 className="mt-4 text-2xl font-black text-white md:text-3xl">
                {plan.theme || "テーマ未設定"}
              </h2>

              <p className="mt-2 text-sm font-bold text-slate-400">
                {formatJapaneseDate(
                  plan.weekStartDate ||
                    plan.weekStart
                )}
                からの1週間
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-right">
              <p className="text-[10px] font-black text-slate-500">
                週間合計
              </p>

              <p className="mt-1 font-black text-cyan-300">
                {formatDuration(
                  weekTotalSeconds
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <PlanSummary
              label="練習日"
              value={`${activeDays}/7`}
            />

            <PlanSummary
              label="練習数"
              value={`${totalWeekItems}件`}
            />

            <PlanSummary
              label="公開者"
              value={
                plan.publishedByName ||
                "パート長"
              }
            />
          </div>

          {plan.representativeMemo && (
            <MemoCard
              label="代表メモ"
              value={plan.representativeMemo}
              accent="violet"
            />
          )}

          {plan.leaderMemo && (
            <MemoCard
              label="パート長より"
              value={plan.leaderMemo}
              accent="cyan"
            />
          )}
        </div>
      </section>

      <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <p className="text-xs font-black tracking-[0.2em] text-violet-300">
          DAY SELECT
        </p>

        <h2 className="mt-2 text-xl font-black">
          曜日を選択
        </h2>

        <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-7">
          {plan.dayMenus.map((day, index) => {
            const selected =
              selectedDayIndex === index;

            return (
              <button
                key={`${day.date}-${index}`}
                type="button"
                onClick={() =>
                  onDayChange(index)
                }
                className={`rounded-[22px] border p-3 text-left transition ${
                  selected
                    ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/25 via-blue-600/20 to-violet-600/25 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p
                    className={`text-xs font-black ${
                      selected
                        ? "text-cyan-200"
                        : "text-slate-500"
                    }`}
                  >
                    {day.label}
                  </p>

                  {day.items.length > 0 && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-violet-400/10 text-violet-300"
                      }`}
                    >
                      {day.items.length}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-2 text-xs font-black ${
                    selected
                      ? "text-white"
                      : "text-slate-300"
                  }`}
                >
                  {formatShortDate(day.date)}
                </p>

                <p
                  className={`mt-2 text-[9px] font-bold ${
                    selected
                      ? "text-cyan-100/70"
                      : "text-slate-600"
                  }`}
                >
                  {day.items.length > 0
                    ? "練習あり"
                    : "休養"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedDay && (
        <DayDetail day={selectedDay} />
      )}
    </>
  );
}

function DayDetail({
  day,
}: {
  day: DayMenu;
}) {
  const totalSeconds =
    calculateDaySeconds(day);

  const endTime = calculateEndTime(
    day.startTime,
    totalSeconds
  );

  return (
    <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
            DAILY MENU
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {day.label}曜日
          </h2>

          <p className="mt-2 text-sm font-bold text-slate-500">
            {formatJapaneseDate(day.date)}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-right">
          <p className="text-[10px] font-black text-slate-500">
            練習時間
          </p>

          <p className="mt-1 font-black text-cyan-300">
            {day.items.length > 0
              ? `${day.startTime}〜${endTime}`
              : "休養"}
          </p>
        </div>
      </div>

      {day.items.length > 0 ? (
        <div className="mt-5 space-y-4">
          {day.items.map((item, index) => (
            <CompletedItemCard
              key={`${item.drillId}-${index}`}
              item={item}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <p className="text-xl font-black text-slate-400">
            休養
          </p>

          <p className="mt-2 text-xs font-bold text-slate-600">
            この日は練習メニューが設定されていません。
          </p>
        </div>
      )}

      {day.items.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <PlanSummary
            label="開始"
            value={day.startTime}
          />

          <PlanSummary
            label="終了予定"
            value={endTime}
          />

          <PlanSummary
            label="合計"
            value={formatDuration(
              totalSeconds
            )}
          />
        </div>
      )}
    </section>
  );
}

function CompletedItemCard({
  item,
  index,
}: {
  item: WeeklyItem;
  index: number;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 min-w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-cyan-500/10">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-300">
              {item.category}
            </span>

            <span className="rounded-full bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-300">
              {item.targetEvent}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black text-white">
            {item.name}
          </h3>
        </div>
      </div>

      {(item.purposeTags?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.purposeTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <ItemInfo
          label="距離"
          value={
            item.distance
              ? `${item.distance}m`
              : "-"
          }
        />

        <ItemInfo
          label="本数"
          value={
            item.reps
              ? `${item.reps}本`
              : "-"
          }
        />

        <ItemInfo
          label="セット"
          value={
            item.sets
              ? `${item.sets}set`
              : "-"
          }
        />

        <ItemInfo
          label="強度"
          value={item.intensity || "-"}
        />

        <ItemInfo
          label="本数間レスト"
          value={
            item.repRestSeconds
              ? `${item.repRestSeconds}秒`
              : "-"
          }
        />

        <ItemInfo
          label="セット間レスト"
          value={
            item.setRestMinutes
              ? `${item.setRestMinutes}分`
              : "-"
          }
        />

        <ItemInfo
          label="所要時間"
          value={getItemTimeText(item)}
        />

        <ItemInfo
          label="時間方式"
          value={
            item.timeMode === "auto"
              ? "自動計算"
              : "手入力"
          }
        />
      </div>
    </article>
  );
}

function ScreenshotDay({
  day,
}: {
  day: DayMenu;
}) {
  const totalSeconds =
    calculateDaySeconds(day);

  const endTime = calculateEndTime(
    day.startTime,
    totalSeconds
  );

  return (
    <div className="border-t-2 border-slate-900 pt-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-black">
            {day.label}曜日
          </p>

          <p className="text-xs font-bold text-slate-500">
            {formatJapaneseDate(day.date)}
          </p>
        </div>

        <p className="text-xs font-black">
          {day.items.length > 0
            ? `${day.startTime}〜${endTime}`
            : "休養"}
        </p>
      </div>

      {day.items.length > 0 ? (
        <div className="mt-3 space-y-3">
          {day.items.map((item, index) => (
            <div
              key={`${day.date}-${item.drillId}-${index}`}
              className="border-l-4 border-slate-900 pl-3"
            >
              <p className="text-sm font-black">
                {index + 1}. {item.name}
              </p>

              <p className="mt-1 text-xs font-bold leading-5">
                {buildItemSummary(item)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-center text-sm font-black">
          休養
        </p>
      )}
    </div>
  );
}

function MemoCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "violet";
}) {
  const styles = {
    cyan: {
      card:
        "border-cyan-300/15 bg-cyan-400/[0.06]",
      label: "text-cyan-300",
    },
    violet: {
      card:
        "border-violet-300/15 bg-violet-400/[0.06]",
      label: "text-violet-300",
    },
  };

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 ${styles[accent].card}`}
    >
      <p
        className={`text-xs font-black ${styles[accent].label}`}
      >
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-300">
        {value}
      </p>
    </div>
  );
}

function TopSummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "violet" | "pink";
}) {
  const styles = {
    cyan:
      "border-cyan-300/15 bg-cyan-400/[0.06] text-cyan-300",
    violet:
      "border-violet-300/15 bg-violet-400/[0.06] text-violet-300",
    pink:
      "border-pink-300/15 bg-pink-400/[0.06] text-pink-300",
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${styles[accent]}`}
    >
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function PlanSummary({
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

function ItemInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  );
}

function normalizePlan(
  plan: WeeklyPlan
): DisplayPlan {
  return {
    ...plan,

    dayMenus: (plan.dayMenus || []).map(
      (day) => ({
        ...day,
        startTime:
          day.startTime || "17:00",

        items: (day.items || []).map(
          (item) =>
            normalizeWeeklyItem(item)
        ),
      })
    ),

    originalDayMenus: (
      plan.originalDayMenus || []
    ).map((day) => ({
      ...day,
      startTime:
        day.startTime || "17:00",

      items: (day.items || []).map(
        (item) =>
          normalizeWeeklyItem(item)
      ),
    })),
  };
}

function getItemTimeText(
  item: WeeklyItem
): string {
  if (item.timeMode === "manual") {
    return item.manualMinutes
      ? `${item.manualMinutes}分`
      : "-";
  }

  if (item.customOneRepSeconds) {
    return `1本${item.customOneRepSeconds}秒`;
  }

  if (
    item.baseDistance &&
    item.baseSeconds
  ) {
    return `基準${item.baseDistance}m・${item.baseSeconds}秒`;
  }

  return "-";
}

function buildItemSummary(
  item: WeeklyItem
): string {
  const parts: string[] = [];

  if (item.distance) {
    parts.push(`${item.distance}m`);
  }

  if (item.reps) {
    parts.push(`${item.reps}本`);
  }

  if (item.sets) {
    parts.push(`${item.sets}set`);
  }

  if (item.intensity) {
    parts.push(`強度${item.intensity}`);
  }

  if (item.repRestSeconds) {
    parts.push(
      `本数間${item.repRestSeconds}秒`
    );
  }

  if (item.setRestMinutes) {
    parts.push(
      `セット間${item.setRestMinutes}分`
    );
  }

  if (
    item.timeMode === "manual" &&
    item.manualMinutes
  ) {
    parts.push(
      `所要${item.manualMinutes}分`
    );
  }

  return parts.length > 0
    ? parts.join(" / ")
    : "詳細設定なし";
}

function formatShortDate(
  dateString: string
): string {
  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return `${Number(parts[1])}/${Number(
    parts[2]
  )}`;
}