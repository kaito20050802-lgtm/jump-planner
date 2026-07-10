"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Drill, WeeklyDraft } from "@/types/training";
import {
  addDaysISO,
  getTodayISO,
} from "@/lib/trainingTime";
import WeeklyEditor from "./WeeklyEditor";
import WeeklyDraftList from "./WeeklyDraftList";

export default function WeeklyPage() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [event, setEvent] = useState("共通");
  const [memberId, setMemberId] = useState("");

  const [drills, setDrills] = useState<Drill[]>([]);
  const [drafts, setDrafts] = useState<WeeklyDraft[]>([]);
  const [editingDraft, setEditingDraft] =
    useState<WeeklyDraft | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentRole =
      sessionStorage.getItem("currentRole");

    const currentEvent =
      sessionStorage.getItem("currentEvent") || "共通";

    const currentMemberId =
      sessionStorage.getItem("currentMemberId") || "";

    if (!currentRole || !currentMemberId) {
      router.push("/");
      return;
    }

    if (
      currentRole !== "leader" &&
      currentRole !== "representative"
    ) {
      router.push("/home");
      return;
    }

    setRole(currentRole);
    setEvent(currentEvent);
    setMemberId(currentMemberId);

    const load = async () => {
      try {
        await loadAll();
      } catch (error) {
        console.error(
          "週メニュー画面の読み込みに失敗しました",
          error
        );

        alert("週メニューの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const loadAll = async () => {
    await cleanupOldDrafts();
    await Promise.all([
      loadDrills(),
      loadDrafts(),
    ]);
  };

  const cleanupOldDrafts = async () => {
    const today = getTodayISO();

    const snap = await getDocs(
      collection(db, "weeklyMenuDrafts")
    );

    const deleteTargets = snap.docs.filter((item) => {
      const data = item.data() as WeeklyDraft;

      return Boolean(
        data.deleteAfter &&
          data.deleteAfter < today
      );
    });

    await Promise.all(
      deleteTargets.map((target) =>
        deleteDoc(
          doc(
            db,
            "weeklyMenuDrafts",
            target.id
          )
        )
      )
    );
  };

  const loadDrills = async () => {
    const snap = await getDocs(
      collection(db, "drills")
    );

    const loaded = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Drill[];

    setDrills(
      loaded.filter(
        (drill) => drill.isActive !== false
      )
    );
  };

  const loadDrafts = async () => {
    const snap = await getDocs(
      collection(db, "weeklyMenuDrafts")
    );

    const loaded = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as WeeklyDraft[];

    const today = getTodayISO();
    const minDate = addDaysISO(today, -14);
    const maxDate = addDaysISO(today, 28);

    const filtered = loaded.filter((draft) => {
      const date =
        draft.weekStartDate ||
        draft.weekStart;

      if (!date) return true;

      return (
        date >= minDate &&
        date <= maxDate
      );
    });

    const sorted = filtered.sort((a, b) => {
      const aTime =
        a.updatedAt?.toMillis?.() ?? 0;

      const bTime =
        b.updatedAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });

    setDrafts(sorted);
  };

  const reloadDrafts = async () => {
    setEditingDraft(null);
    await loadDrafts();
  };

  if (loading || !role || !memberId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10172a] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />

          <p className="mt-4 font-black">
            週メニューを読み込み中...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10172a] px-4 py-6 text-white">
      {/* 背景の光 */}
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />

      <div className="pointer-events-none absolute -right-28 top-80 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px]" />

      <div className="pointer-events-none absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-cyan-500/15 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* ヘッダー */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-cyan-300">
              JUMP PLANNER
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              週メニュー作成
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-400">
              練習メニュー集から種目を選び、
              曜日ごとの内容と終了予定時刻をまとめます。
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

        {/* ページ情報 */}
        <section className="relative mt-7 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/40 to-violet-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl font-black shadow-lg shadow-pink-500/20">
                ＋
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] text-violet-200">
                  WEEKLY PLANNER
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {editingDraft
                    ? "保存済みメニューを編集中"
                    : "新しい週メニューを作成"}
                </h2>
              </div>
            </div>

            <p className="mt-5 text-sm font-bold leading-7 text-slate-300">
              担当種目：
              <span className="ml-2 text-cyan-300">
                {event}
              </span>
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <InfoCard
                label="作成可能期間"
                value="4週間先"
              />

              <InfoCard
                label="保存期間"
                value="2週間前まで"
              />

              <InfoCard
                label="登録メニュー"
                value={`${drills.length}件`}
              />
            </div>
          </div>
        </section>

        {/* 編集画面 */}
        <div className="mt-6">
          <WeeklyEditor
            role={role}
            event={event}
            memberId={memberId}
            drills={drills}
            editingDraft={editingDraft}
            onSaved={reloadDrafts}
            onCancelEdit={() =>
              setEditingDraft(null)
            }
          />
        </div>

        {/* 保存済みメニュー */}
        <div className="mt-6">
          <WeeklyDraftList
            role={role}
            memberId={memberId}
            drafts={drafts}
            onEdit={(draft) => {
              setEditingDraft(draft);

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
        >
          ホームへ戻る
        </button>

        <p className="mt-8 pb-4 text-center text-xs font-bold text-slate-600">
          Jump Planner / Weekly Training
        </p>
      </div>
    </main>
  );
}

function InfoCard({
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

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}