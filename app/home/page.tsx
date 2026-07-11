"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Member = {
  id: string;
  name: string;
  role: string;
  event?: string;
  grade?: string;
};

type WeeklyDraft = {
  id: string;
  event: string;
  weekStart: string;
  theme: string;
  memo: string;
  status: "draft" | "submitted" | "revision" | "approved";
  submittedBy: string;
  leaderComment?: string;
};

export default function HomePage() {
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [revisionDrafts, setRevisionDrafts] = useState<WeeklyDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const id = sessionStorage.getItem("currentMemberId");

        if (!id) {
          router.push("/");
          return;
        }

        const memberSnap = await getDoc(doc(db, "members", id));

        if (!memberSnap.exists()) {
          router.push("/");
          return;
        }

        const loadedMember = {
          id: memberSnap.id,
          ...memberSnap.data(),
        } as Member;

        setMember(loadedMember);

        if (loadedMember.role === "representative") {
          const snap = await getDocs(collection(db, "weeklyMenuDrafts"));

          const drafts = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as WeeklyDraft[];

          setRevisionDrafts(
            drafts.filter(
              (draft) =>
                draft.submittedBy === id && draft.status === "revision"
            )
          );
        }
      } catch (error) {
        console.error("ホーム画面の読み込みに失敗しました", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading || !member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10172a] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />
          <p className="mt-4 font-black">読み込み中...</p>
        </div>
      </main>
    );
  }

  const isLeader = member.role === "leader";
  const isRepresentative = member.role === "representative";
  const isCoach = member.role === "coach";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10172a] px-4 py-6 text-white">
      {/* 背景装飾 */}
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-600/30 blur-[90px]" />
      <div className="pointer-events-none absolute -right-28 top-56 h-80 w-80 rounded-full bg-pink-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* ヘッダー */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-cyan-300">
              JUMP PLANNER
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              こんにちは、
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
                {member.name}
              </span>
              さん
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-400">
              {roleLabel(member.role)}
              {member.event ? ` / ${member.event}` : ""}
              {member.grade ? ` / ${member.grade}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sessionStorage.clear();
              router.push("/");
            }}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-slate-300 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          >
            ログアウト
          </button>
        </header>

        {/* メインヒーロー */}
        <section className="relative mt-8 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-2xl md:p-8">
          <div className="absolute right-[-80px] top-[-90px] h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/50 to-violet-600/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl shadow-lg shadow-pink-500/20">
                ↗
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] text-violet-200">
                  TRAINING WORKSPACE
                </p>
                <h2 className="mt-1 text-2xl font-black md:text-3xl">
                  練習メニュー作成支援
                </h2>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-slate-300">
              登録済みの練習から目的に合うメニューを選び、
              曜日ごとの練習計画、所要時間、終了予定時刻までまとめて管理できます。
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <StatCard label="メニュー集" value="検索・登録" />
              <StatCard label="週計画" value="曜日別" />
              <StatCard label="承認" value="代表→パート長" />
            </div>
          </div>
        </section>

        {/* 修正依頼 */}
        {isRepresentative && revisionDrafts.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-[30px] border border-rose-400/30 bg-rose-500/10 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-rose-300">
                  REVISION REQUEST
                </p>
                <h2 className="mt-2 text-xl font-black">
                  修正が必要なメニューがあります
                </h2>
              </div>

              <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-rose-500 font-black">
                {revisionDrafts.length}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {revisionDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-black">{draft.theme}</p>

                  <p className="mt-1 text-xs font-bold text-rose-200/70">
                    {draft.weekStart || "日付未設定"} / {draft.event}
                  </p>

                  {draft.leaderComment && (
                    <p className="mt-3 text-sm font-bold leading-6 text-rose-100">
                      {draft.leaderComment}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push("/weekly")}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-4 font-black text-white shadow-lg shadow-rose-500/20"
            >
              修正して再提出する
            </button>
          </section>
        )}

        {/* メインメニュー */}
        <section className="mt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                MENU
              </p>
              <h2 className="mt-1 text-2xl font-black">機能を選択</h2>
            </div>

            <p className="text-xs font-bold text-slate-500">
              権限に応じて表示されています
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DashboardCard
              title="練習メニュー集"
              description="練習を検索・閲覧・登録します"
              icon="⌕"
              accent="cyan"
              onClick={() => router.push("/drills")}
            />

            {(isLeader || isRepresentative) && (
              <DashboardCard
                title="週メニュー作成"
                description="曜日ごとの仮メニューを作成します"
                icon="＋"
                accent="violet"
                onClick={() => router.push("/weekly")}
              />
            )}

            {isLeader && (
              <>
                <DashboardCard
                  title="提出メニュー確認"
                  description="各代表から届いたメニューを確認・修正します"
                  icon="✓"
                  accent="pink"
                  onClick={() => router.push("/review")}
                />

                <DashboardCard
                  title="完成メニュー出力"
                  description="完成版を期間指定してLINE共有用に表示します"
                  icon="↗"
                  accent="cyan"
                  onClick={() => router.push("/output")}
                />

                <DashboardCard
                  title="管理者設定"
                  description="登録者情報やパスワードを管理します"
                  icon="⚙"
                  accent="slate"
                  onClick={() => router.push("/admin")}
                />
              </>
            )}

            {isCoach && (
              <DashboardCard
                title="コーチコメント"
                description="完成メニューを確認し、代表全体へコメントします"
                icon="✎"
                accent="pink"
                onClick={() => router.push("/output")}
              />
            )}
          </div>
        </section>

        {/* 下部カード */}
        <section className="mt-6 rounded-[30px] border border-white/10 bg-gradient-to-r from-violet-500/15 via-cyan-500/10 to-pink-500/15 p-5 backdrop-blur-xl">
          <p className="text-xs font-black tracking-[0.2em] text-cyan-200">
            TEAM WORKFLOW
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <FlowStep number="01" label="登録" />
            <FlowStep number="02" label="作成" />
            <FlowStep number="03" label="確認" />
            <FlowStep number="04" label="配布" />
          </div>
        </section>

        <p className="mt-8 pb-4 text-center text-xs font-bold text-slate-600">
          Jump Planner / Ritsumeikan Jump Team
        </p>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  icon,
  accent,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  accent: "cyan" | "violet" | "pink" | "slate";
  onClick: () => void;
}) {
  const styles = {
    cyan: {
      icon: "from-cyan-400 to-blue-500 shadow-cyan-500/20",
      hover: "hover:border-cyan-400/40 hover:shadow-cyan-500/10",
      text: "text-cyan-300",
    },
    violet: {
      icon: "from-violet-500 to-indigo-500 shadow-violet-500/20",
      hover: "hover:border-violet-400/40 hover:shadow-violet-500/10",
      text: "text-violet-300",
    },
    pink: {
      icon: "from-pink-500 to-rose-500 shadow-pink-500/20",
      hover: "hover:border-pink-400/40 hover:shadow-pink-500/10",
      text: "text-pink-300",
    },
    slate: {
      icon: "from-slate-500 to-slate-700 shadow-black/20",
      hover: "hover:border-white/20 hover:shadow-black/20",
      text: "text-slate-300",
    },
  };

  const style = styles[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[28px] border border-white/10 bg-white/[0.06] p-5 text-left shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.09] hover:shadow-2xl ${style.hover}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-black text-white shadow-lg ${style.icon}`}
        >
          {icon}
        </div>

        <span
          className={`text-2xl font-light transition group-hover:translate-x-1 ${style.text}`}
        >
          →
        </span>
      </div>

      <h3 className="mt-6 text-xl font-black">{title}</h3>

      <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
        {description}
      </p>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-xl">
      <p className="text-[10px] font-black tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function FlowStep({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-2 py-3">
      <p className="text-[10px] font-black text-cyan-300">{number}</p>
      <p className="mt-1 text-xs font-black text-white">{label}</p>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "leader") return "跳躍パート長";
  if (role === "representative") return "種目代表";
  if (role === "coach") return "コーチ";
  return "選手";
}