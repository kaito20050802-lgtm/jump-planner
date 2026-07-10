"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Drill, WeeklyDraft } from "@/types/training";
import { addDaysISO, getTodayISO } from "@/lib/trainingTime";
import WeeklyEditor from "./WeeklyEditor";
import WeeklyDraftList from "./WeeklyDraftList";

export default function WeeklyPage() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [event, setEvent] = useState("共通");
  const [memberId, setMemberId] = useState("");

  const [drills, setDrills] = useState<Drill[]>([]);
  const [drafts, setDrafts] = useState<WeeklyDraft[]>([]);
  const [editingDraft, setEditingDraft] = useState<WeeklyDraft | null>(null);

  useEffect(() => {
    const currentRole = sessionStorage.getItem("currentRole");
    const currentEvent = sessionStorage.getItem("currentEvent") || "共通";
    const currentMemberId = sessionStorage.getItem("currentMemberId") || "";

    if (!currentRole) {
      router.push("/");
      return;
    }

    if (currentRole !== "leader" && currentRole !== "representative") {
      router.push("/home");
      return;
    }

    setRole(currentRole);
    setEvent(currentEvent);
    setMemberId(currentMemberId);

    loadAll();
  }, [router]);

  const loadAll = async () => {
    await cleanupOldDrafts();
    await loadDrills();
    await loadDrafts();
  };

  const cleanupOldDrafts = async () => {
    const today = getTodayISO();
    const snap = await getDocs(collection(db, "weeklyMenuDrafts"));

    const deleteTargets = snap.docs.filter((d) => {
      const data = d.data() as WeeklyDraft;
      return data.deleteAfter && data.deleteAfter < today;
    });

    await Promise.all(
      deleteTargets.map((target) =>
        deleteDoc(doc(db, "weeklyMenuDrafts", target.id))
      )
    );
  };

  const loadDrills = async () => {
    const snap = await getDocs(collection(db, "drills"));

    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Drill[];

    setDrills(loaded.filter((d) => d.isActive !== false));
  };

  const loadDrafts = async () => {
    const snap = await getDocs(collection(db, "weeklyMenuDrafts"));

    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as WeeklyDraft[];

    const today = getTodayISO();
    const minDate = addDaysISO(today, -14);
    const maxDate = addDaysISO(today, 28);

    const filtered = loaded.filter((draft) => {
      const date = draft.weekStartDate || draft.weekStart;
      if (!date) return true;
      return date >= minDate && date <= maxDate;
    });

    const sorted = filtered.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });

    setDrafts(sorted);
  };

  if (!role || !memberId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fb] text-slate-900">
        <p className="font-black">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Planner</p>

        <h1 className="mt-1 text-3xl font-black">週メニュー作成</h1>

        <p className="mt-2 text-sm font-bold text-slate-500">
          曜日ごとに練習を作成し、開始時刻から終了予定を計算します。
        </p>

        <WeeklyEditor
          role={role}
          event={event}
          memberId={memberId}
          drills={drills}
          editingDraft={editingDraft}
          onSaved={async () => {
            setEditingDraft(null);
            await loadDrafts();
          }}
          onCancelEdit={() => setEditingDraft(null)}
        />

        <WeeklyDraftList
          role={role}
          memberId={memberId}
          drafts={drafts}
          onEdit={(draft) => setEditingDraft(draft)}
        />

        <button
          onClick={() => router.push("/home")}
          className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-black text-white"
        >
          ホームへ戻る
        </button>
      </div>
    </main>
  );
}