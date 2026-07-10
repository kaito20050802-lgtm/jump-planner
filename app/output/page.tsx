"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type WeeklyItem = {
  name: string;
  distance?: string;
  reps?: string;
  sets?: string;
  intensity?: string;
  restMinutes?: string;
};

type DayMenu = {
  date: string;
  label: string;
  items: WeeklyItem[];
};

type WeeklyDraft = {
  id: string;
  event: string;
  weekStart: string;
  theme: string;
  status: "draft" | "submitted" | "revision" | "approved";
  leaderComment?: string;
  coachComment?: string;
  dayMenus?: DayMenu[];
};

const EVENTS = ["走高跳", "棒高跳", "走幅跳", "三段跳", "共通"];

export default function OutputPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [drafts, setDrafts] = useState<WeeklyDraft[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("三段跳");
  const [coachComments, setCoachComments] = useState<Record<string, string>>({});
  const [screenshotMode, setScreenshotMode] = useState(false);

  useEffect(() => {
    const currentRole = sessionStorage.getItem("currentRole") || "";

    if (currentRole !== "leader" && currentRole !== "coach") {
      router.push("/");
      return;
    }

    setRole(currentRole);
    loadDrafts();
  }, [router]);

  const loadDrafts = async () => {
    const snap = await getDocs(collection(db, "weeklyMenuDrafts"));

    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as WeeklyDraft[];

    const approved = loaded.filter((draft) => draft.status === "approved");
    setDrafts(approved);

    const map: Record<string, string> = {};
    approved.forEach((draft) => {
      map[draft.id] = draft.coachComment || "";
    });
    setCoachComments(map);
  };

  const selectedDrafts = drafts.filter((draft) => draft.event === selectedEvent);

  const saveCoachComment = async (draftId: string) => {
    if (role !== "coach") {
      alert("コーチのみコメントできます");
      return;
    }

    await updateDoc(doc(db, "weeklyMenuDrafts", draftId), {
      coachComment: coachComments[draftId] || "",
      coachCommentUpdatedAt: serverTimestamp(),
    });

    alert("コーチコメントを保存しました");
    await loadDrafts();
  };

  return (
    <main className={`min-h-screen ${screenshotMode ? "bg-white" : "bg-[#f4f6fb] px-4 py-6"} text-slate-900`}>
      <div className={screenshotMode ? "mx-auto max-w-md" : "mx-auto max-w-md"}>
        {!screenshotMode && (
          <>
            <p className="text-sm font-black text-blue-600">Jump Planner</p>
            <h1 className="mt-1 text-3xl font-black">完成メニュー出力</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              承認済みメニューをスクショ用に表示します。
            </p>

            <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
              <label className="text-sm font-black">表示する種目</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
              >
                {EVENTS.map((event) => (
                  <option key={event}>{event}</option>
                ))}
              </select>

              <button
                onClick={() => setScreenshotMode(true)}
                className="mt-4 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
              >
                スクショモードにする
              </button>
            </section>
          </>
        )}

        {screenshotMode && (
          <button
            onClick={() => setScreenshotMode(false)}
            className="fixed right-4 top-4 z-50 rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white"
          >
            戻る
          </button>
        )}

        <section className={`${screenshotMode ? "bg-white px-6 py-8" : "mt-5 bg-white px-8 py-10 shadow-sm"} text-black`}>
          {selectedDrafts.length === 0 ? (
            <p className="text-sm">承認済みメニューがありません。</p>
          ) : (
            selectedDrafts.map((draft) => (
              <div key={draft.id} className="mb-10">
                <h2 className="mb-6 text-center text-xl font-bold">
                  {draft.event} メニュー
                </h2>

                {draft.dayMenus?.map((day) => (
                  <div key={day.date} className="mb-8">
                    <p className="text-lg font-medium">
                      {formatDate(day.date)}（{day.label}）
                    </p>

                    <div className="mt-2 space-y-1 text-[17px] leading-7">
                      {day.items.length > 0 ? (
                        day.items.map((item, index) => (
                          <p key={`${day.date}-${item.name}-${index}`}>
                            {formatItem(item)}
                          </p>
                        ))
                      ) : (
                        <p>オフまたは軽めの調整</p>
                      )}
                    </div>
                  </div>
                ))}

                {draft.leaderComment && (
                  <div className="mt-8 border-t border-black pt-4">
                    <p className="font-bold">パート長コメント</p>
                    <p className="mt-2 whitespace-pre-wrap leading-7">
                      {draft.leaderComment}
                    </p>
                  </div>
                )}

                <div className="mt-8 border-t border-black pt-4">
                  <p className="font-bold">コーチコメント</p>
                  {draft.coachComment ? (
                    <p className="mt-2 whitespace-pre-wrap leading-7">
                      {draft.coachComment}
                    </p>
                  ) : (
                    <div className="mt-3 space-y-5">
                      <div className="border-b border-black pb-5" />
                      <div className="border-b border-black pb-5" />
                      <div className="border-b border-black pb-5" />
                    </div>
                  )}
                </div>

                {!screenshotMode && role === "coach" && (
                  <section className="mt-6 rounded-2xl bg-slate-100 p-4">
                    <label className="text-sm font-black">コーチコメント入力</label>
                    <textarea
                      className="mt-2 h-28 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
                      value={coachComments[draft.id] || ""}
                      onChange={(e) =>
                        setCoachComments({
                          ...coachComments,
                          [draft.id]: e.target.value,
                        })
                      }
                      placeholder="全体へのコメントを書いてください"
                    />

                    <button
                      onClick={() => saveCoachComment(draft.id)}
                      className="mt-3 w-full rounded-2xl bg-blue-600 py-3 font-black text-white"
                    >
                      コーチコメントを保存
                    </button>
                  </section>
                )}
              </div>
            ))
          )}
        </section>

        {!screenshotMode && (
          <>
            <button
              onClick={() => router.push("/review")}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-black text-white"
            >
              提出メニュー確認へ戻る
            </button>

            <button
              onClick={() => router.push("/home")}
              className="mt-4 w-full rounded-2xl bg-white py-4 font-black text-slate-900 shadow-sm"
            >
              ホームへ戻る
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatItem(item: WeeklyItem) {
  const details = [];

  if (item.distance) details.push(item.distance);
  if (item.reps) details.push(item.reps);
  if (item.sets) details.push(`${item.sets}セット`);
  if (item.intensity) details.push(item.intensity);
  if (item.restMinutes) details.push(`r${item.restMinutes}`);

  if (details.length === 0) return item.name;

  return `${item.name} ${details.join(" ")}`;
}