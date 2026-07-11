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
import { DayMenu, WeeklyPlan } from "@/types/training";

import {
  createDeleteAfter,
  getTodayISO,
  isDeleteExpired,
  normalizeWeeklyItem,
} from "@/lib/trainingTime";

import {
  getPlanMaxDate,
  getPlanMinDate,
  normalizeOutputRange,
} from "@/lib/outputFormatter";

import DateRangePicker from "@/components/output/DateRangePicker";
import PlanSelector from "@/components/output/PlanSelector";
import CompletedPlan from "@/components/output/CompletedPlan";

type AllowedRole = "leader" | "representative";

type NormalizedWeeklyPlan = WeeklyPlan & {
  dayMenus: DayMenu[];
  originalDayMenus: DayMenu[];
};

export default function OutputPage() {
  const router = useRouter();

  const [role, setRole] = useState<AllowedRole | "">("");
  const [memberEvent, setMemberEvent] = useState("共通");

  const [plans, setPlans] = useState<NormalizedWeeklyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showAllEvents, setShowAllEvents] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [deletingExpired, setDeletingExpired] = useState(false);

  useEffect(() => {
    const currentRole = sessionStorage.getItem("currentRole");
    const currentMemberId = sessionStorage.getItem("currentMemberId");
    const currentEvent =
      sessionStorage.getItem("currentEvent") || "共通";

    if (!currentMemberId || !currentRole) {
      router.replace("/");
      return;
    }

    if (
      currentRole !== "leader" &&
      currentRole !== "representative"
    ) {
      router.replace("/home");
      return;
    }

    setRole(currentRole);
    setMemberEvent(currentEvent);

    const initialize = async () => {
      try {
        await cleanupExpiredPlans();
        await loadPlans();
      } catch (error) {
        console.error(
          "完成メニュー画面の初期化に失敗しました",
          error
        );

        alert("完成メニューの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

  const cleanupExpiredPlans = async () => {
    setDeletingExpired(true);

    try {
      const snap = await getDocs(
        collection(db, "weeklyPlans")
      );

      const expiredDocuments = snap.docs.filter((item) => {
        const data = item.data() as Partial<WeeklyPlan>;

        if (data.deleteAfter) {
          return isDeleteExpired(data.deleteAfter);
        }

        const weekStart =
          data.weekStartDate || data.weekStart;

        if (!weekStart) {
          return false;
        }

        const calculatedDeleteAfter =
          createDeleteAfter(weekStart);

        return calculatedDeleteAfter < getTodayISO();
      });

      await Promise.all(
        expiredDocuments.map((item) =>
          deleteDoc(doc(db, "weeklyPlans", item.id))
        )
      );
    } finally {
      setDeletingExpired(false);
    }
  };

  const loadPlans = async () => {
    let snap;

    try {
      const plansQuery = query(
        collection(db, "weeklyPlans"),
        orderBy("publishedAt", "desc")
      );

      snap = await getDocs(plansQuery);
    } catch (error) {
      console.warn(
        "publishedAt順で取得できなかったため通常取得します",
        error
      );

      snap = await getDocs(collection(db, "weeklyPlans"));
    }

    const loaded = snap.docs
      .map((item) =>
        normalizeWeeklyPlan({
          id: item.id,
          ...item.data(),
        } as WeeklyPlan)
      )
      .sort((a, b) => {
        const aDate =
          a.weekStartDate || a.weekStart || "";

        const bDate =
          b.weekStartDate || b.weekStart || "";

        return bDate.localeCompare(aDate);
      });

    setPlans(loaded);
  };

  const visiblePlans = useMemo(() => {
    if (role === "leader" || showAllEvents) {
      return plans;
    }

    return plans.filter(
      (plan) =>
        plan.event === memberEvent ||
        plan.event === "共通"
    );
  }, [plans, role, memberEvent, showAllEvents]);

  useEffect(() => {
    if (visiblePlans.length === 0) {
      setSelectedPlanId("");
      setStartDate("");
      setEndDate("");
      return;
    }

    const selectedStillExists = visiblePlans.some(
      (plan) => plan.id === selectedPlanId
    );

    if (!selectedStillExists) {
      setSelectedPlanId(visiblePlans[0].id);
    }
  }, [visiblePlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    return (
      visiblePlans.find(
        (plan) => plan.id === selectedPlanId
      ) || null
    );
  }, [visiblePlans, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlan) {
      setStartDate("");
      setEndDate("");
      return;
    }

    const minimumDate = getPlanMinDate(
      selectedPlan.dayMenus
    );

    const maximumDate = getPlanMaxDate(
      selectedPlan.dayMenus
    );

    setStartDate(minimumDate);
    setEndDate(maximumDate);
  }, [selectedPlanId, selectedPlan]);

  const minDate = useMemo(() => {
    if (!selectedPlan) return "";

    return getPlanMinDate(selectedPlan.dayMenus);
  }, [selectedPlan]);

  const maxDate = useMemo(() => {
    if (!selectedPlan) return "";

    return getPlanMaxDate(selectedPlan.dayMenus);
  }, [selectedPlan]);

  const changeStartDate = (value: string) => {
    if (!selectedPlan) return;

    const nextRange = normalizeOutputRange(
      selectedPlan.dayMenus,
      value,
      endDate
    );

    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
  };

  const changeEndDate = (value: string) => {
    if (!selectedPlan) return;

    const nextRange = normalizeOutputRange(
      selectedPlan.dayMenus,
      startDate,
      value
    );

    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
  };

  const startScreenshotMode = () => {
    if (!selectedPlan) {
      alert("出力する完成メニューを選択してください");
      return;
    }

    if (!startDate || !endDate) {
      alert("出力期間を選択してください");
      return;
    }

    setScreenshotMode(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const exitScreenshotMode = () => {
    setScreenshotMode(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10172a] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />

          <p className="mt-4 font-black">
            完成メニューを読み込み中...
          </p>

          {deletingExpired && (
            <p className="mt-2 text-xs font-bold text-slate-500">
              保存期間を過ぎたデータを整理しています
            </p>
          )}
        </div>
      </main>
    );
  }

  if (screenshotMode && selectedPlan) {
    return (
      <main className="min-h-screen bg-white px-2 py-2 text-slate-900 sm:px-4 sm:py-4">
        <CompletedPlan
          plan={selectedPlan}
          startDate={startDate}
          endDate={endDate}
          screenshotMode
          onExitScreenshot={exitScreenshotMode}
        />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10172a] px-4 py-6 text-white">
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />

      <div className="pointer-events-none absolute -right-28 top-72 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px]" />

      <div className="pointer-events-none absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-cyan-500/15 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-cyan-300">
              JUMP PLANNER
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              完成メニュー出力
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-400">
              パート長が修正・公開した完成メニューを、
              指定した期間だけLINE共有用の形式で出力します。
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

        <section className="relative mt-7 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/40 to-violet-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl font-black shadow-lg shadow-pink-500/20">
                ↗
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] text-violet-200">
                  OUTPUT WORKSPACE
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  LINE共有用メニュー
                </h2>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-slate-300">
              練習名・距離・本数・セット数・強度・
              セット間レストを1行にまとめて表示します。
            </p>

            <div className="mt-5 rounded-[24px] border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs font-black text-cyan-300">
                表示例
              </p>

              <p className="mt-2 text-sm font-black leading-6 text-white">
                テンポ走(120m)×3×2, 7割, r=5
              </p>

              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                入力されていない項目は省略され、
                カンマや空白も自動的に詰めて表示されます。
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <HeroInfo
                label="閲覧権限"
                value={
                  role === "leader"
                    ? "パート長"
                    : "種目代表"
                }
              />

              <HeroInfo
                label="担当種目"
                value={memberEvent}
              />

              <HeroInfo
                label="保存期間"
                value="2週間"
              />
            </div>
          </div>
        </section>

        {role === "representative" && (
          <section className="mt-5 rounded-[24px] border border-violet-300/15 bg-violet-400/[0.06] p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-violet-300">
                  表示対象
                </p>

                <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
                  通常は担当種目と共通メニューだけを表示します。
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAllEvents((current) => !current)
                }
                className="shrink-0 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs font-black text-violet-300 transition hover:bg-violet-400/20"
              >
                {showAllEvents
                  ? "担当種目のみ"
                  : "全種目を表示"}
              </button>
            </div>
          </section>
        )}

        <div className="mt-6">
          <PlanSelector
            plans={visiblePlans}
            selectedPlanId={selectedPlanId}
            onSelect={(planId) => {
              setSelectedPlanId(planId);
              setScreenshotMode(false);
            }}
          />
        </div>

        {selectedPlan && (
          <>
            <div className="mt-6">
              <DateRangePicker
                minDate={minDate}
                maxDate={maxDate}
                startDate={startDate}
                endDate={endDate}
                onStartChange={changeStartDate}
                onEndChange={changeEndDate}
              />
            </div>

            <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-pink-300">
                    SCREENSHOT
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    LINE共有用に出力
                  </h2>

                  <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
                    選択した期間だけを白背景で表示し、
                    スマホでスクリーンショットしやすくします。
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-xl font-black shadow-lg shadow-pink-500/20">
                  □
                </div>
              </div>

              <button
                type="button"
                onClick={startScreenshotMode}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-4 font-black text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5"
              >
                スクショモードで表示
              </button>
            </section>

            <div className="mt-6">
              <CompletedPlan
                plan={selectedPlan}
                startDate={startDate}
                endDate={endDate}
                screenshotMode={false}
                onExitScreenshot={exitScreenshotMode}
              />
            </div>
          </>
        )}

        {!selectedPlan && (
          <section className="mt-6 rounded-[32px] border border-dashed border-white/15 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl text-slate-500">
              ↗
            </div>

            <p className="mt-4 font-black text-slate-300">
              完成メニューがありません
            </p>

            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
              パート長が提出BOXから完成メニューを公開すると、
              ここに表示されます。
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
        >
          ホームへ戻る
        </button>

        <p className="mt-8 pb-4 text-center text-xs font-bold text-slate-600">
          Jump Planner / Menu Output
        </p>
      </div>
    </main>
  );
}

function HeroInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-xl">
      <p className="text-[10px] font-black tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function normalizeWeeklyPlan(
  plan: WeeklyPlan
): NormalizedWeeklyPlan {
  return {
    ...plan,

    dayMenus: normalizeDayMenus(plan.dayMenus || []),

    originalDayMenus: normalizeDayMenus(
      plan.originalDayMenus || []
    ),
  };
}

function normalizeDayMenus(
  dayMenus: DayMenu[]
): DayMenu[] {
  return dayMenus.map((day) => ({
    ...day,

    startTime: day.startTime || "17:00",

    items: (day.items || []).map((item) =>
      normalizeWeeklyItem(item)
    ),
  }));
}