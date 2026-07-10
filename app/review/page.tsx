"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type WeeklyItem = {
  drillId: string;
  name: string;
  category: string;
  targetEvent: string;
  purposeTags?: string[];
  distance?: string;
  reps?: string;
  sets?: string;
  intensity?: string;
  restMinutes?: string;
};

type WeeklyMenuDraft = {
  id: string;
  event: string;
  weekStart: string;
  theme: string;
  memo: string;
  status: "draft" | "submitted" | "revision" | "approved";
  leaderComment?: string;
  items: WeeklyItem[];
};

export default function ReviewPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<WeeklyMenuDraft[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    const role = sessionStorage.getItem("currentRole");

    if (role !== "leader") {
      router.push("/");
      return;
    }

    loadDrafts();
  }, [router]);

  const loadDrafts = async () => {
    const q = query(
      collection(db, "weeklyMenuDrafts"),
      orderBy("updatedAt", "desc")
    );

    const snap = await getDocs(q);

    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as WeeklyMenuDraft[];

    setDrafts(loaded);

    const commentMap: Record<string, string> = {};
    loaded.forEach((draft) => {
      commentMap[draft.id] = draft.leaderComment || "";
    });
    setComments(commentMap);
  };

  const approve = async (id: string) => {
    await updateDoc(doc(db, "weeklyMenuDrafts", id), {
      status: "approved",
      leaderComment: comments[id] || "",
      updatedAt: serverTimestamp(),
    });

    alert("承認しました");
    await loadDrafts();
  };

  const requestRevision = async (id: string) => {
    if (!comments[id]?.trim()) {
      alert("修正内容をコメントに書いてください");
      return;
    }

    await updateDoc(doc(db, "weeklyMenuDrafts", id), {
      status: "revision",
      leaderComment: comments[id],
      updatedAt: serverTimestamp(),
    });

    alert("修正依頼を送りました");
    await loadDrafts();
  };

  const targetDrafts = drafts.filter((draft) =>
    ["submitted", "revision", "approved"].includes(draft.status)
  );

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Planner</p>
        <h1 className="mt-1 text-3xl font-black">提出メニュー確認</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          代表が提出した週メニューを確認し、修正依頼または承認を行います。
        </p>

        <section className="mt-5 space-y-4">
          {targetDrafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-[28px] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-blue-600">
                    {statusLabel(draft.status)}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{draft.event}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {draft.weekStart || "日付未設定"} / {draft.theme}
                  </p>
                </div>
              </div>

              {draft.memo && (
                <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm font-bold leading-6 text-slate-700">
                  代表メモ：{draft.memo}
                </p>
              )}

              <div className="mt-4 space-y-3">
                {draft.items?.map((item, index) => (
                  <div
                    key={`${item.drillId}-${index}`}
                    className="rounded-2xl bg-slate-100 p-4"
                  >
                    <p className="text-xs font-black text-blue-600">
                      {index + 1}. {item.category}
                    </p>

                    <h3 className="mt-1 font-black">{item.name}</h3>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      対象：{item.targetEvent}
                    </p>

                    {item.purposeTags && item.purposeTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.purposeTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Mini label="距離" value={item.distance || "-"} />
                      <Mini label="本数" value={item.reps || "-"} />
                      <Mini label="セット数" value={item.sets || "-"} />
                      <Mini label="強度" value={item.intensity || "-"} />
                      <Mini label="レスト" value={item.restMinutes || "-"} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-sm font-black">パート長コメント</label>
                <textarea
                  className="mt-2 h-24 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
                  value={comments[draft.id] || ""}
                  onChange={(e) =>
                    setComments({ ...comments, [draft.id]: e.target.value })
                  }
                  placeholder="修正案や承認コメントを書いてください"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => requestRevision(draft.id)}
                  className="rounded-2xl bg-red-100 py-4 font-black text-red-600"
                >
                  修正依頼
                </button>

                <button
                  onClick={() => approve(draft.id)}
                  className="rounded-2xl bg-blue-600 py-4 font-black text-white"
                >
                  承認
                </button>
              </div>
            </div>
          ))}

          {targetDrafts.length === 0 && (
            <div className="rounded-[28px] bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                まだ提出されたメニューはありません。
              </p>
            </div>
          )}
        </section>

        <button
          onClick={() => router.push("/admin")}
          className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-black text-white"
        >
          管理者画面へ戻る
        </button>
      </div>
    </main>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "approved") return "承認済み";
  if (status === "revision") return "修正依頼中";
  if (status === "submitted") return "提出済み";
  if (status === "draft") return "作成中";
  return status;
}