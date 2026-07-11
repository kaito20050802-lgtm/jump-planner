"use client";

import { WeeklyDraft, WeeklyItem } from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  formatDuration,
  normalizeWeeklyItem,
} from "@/lib/trainingTime";

type Props = {
  role: string;
  memberId: string;
  drafts: WeeklyDraft[];
  onEdit: (draft: WeeklyDraft) => void;
};

export default function WeeklyDraftList({
  role,
  memberId,
  drafts,
  onEdit,
}: Props) {
  const visibleDrafts = drafts.filter((draft) => {
    if (role === "leader") return true;

    return ["draft", "revision", "submitted"].includes(
      draft.status
    );
  });

  const canEditDraft = (draft: WeeklyDraft) => {
    if (role === "leader") return true;

    return (
      draft.submittedBy === memberId &&
      draft.status !== "approved"
    );
  };

  const draftCount = visibleDrafts.filter(
    (draft) => draft.status === "draft"
  ).length;

  const submittedCount = visibleDrafts.filter(
    (draft) => draft.status === "submitted"
  ).length;

  const revisionCount = visibleDrafts.filter(
    (draft) => draft.status === "revision"
  ).length;

  const approvedCount = visibleDrafts.filter(
    (draft) => draft.status === "approved"
  ).length;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-violet-300">
              SAVED PLANS
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              作成済み週メニュー
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
              代表者が作成中・提出済みのメニューを確認できます。
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-violet-300/15 bg-violet-400/10 px-4 py-2 text-xs font-black text-violet-300">
            {visibleDrafts.length}件
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatusSummary
            label="作成中"
            value={draftCount}
            accent="slate"
          />

          <StatusSummary
            label="提出済み"
            value={submittedCount}
            accent="cyan"
          />

          <StatusSummary
            label="修正依頼"
            value={revisionCount}
            accent="pink"
          />

          <StatusSummary
            label="承認済み"
            value={approvedCount}
            accent="violet"
          />
        </div>

        {visibleDrafts.length > 0 ? (
          <div className="mt-6 space-y-4">
            {visibleDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                canEdit={canEditDraft(draft)}
                onEdit={() => onEdit(draft)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[26px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl text-slate-500">
              ＋
            </div>

            <p className="mt-4 font-black text-slate-300">
              まだ週メニューがありません
            </p>

            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
              上の作成画面からメニューを作り、下書き保存または提出してください。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function DraftCard({
  draft,
  canEdit,
  onEdit,
}: {
  draft: WeeklyDraft;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const normalizedDayMenus = (draft.dayMenus || []).map(
    (day) => ({
      ...day,
      startTime: day.startTime || "17:00",
      items: (day.items || []).map((item) =>
        normalizeWeeklyItem(item as Partial<WeeklyItem>)
      ),
    })
  );

  const weekTotalSeconds = normalizedDayMenus.reduce(
    (total, day) => total + calculateDaySeconds(day),
    0
  );

  const totalItems = normalizedDayMenus.reduce(
    (total, day) => total + day.items.length,
    0
  );

  const activeDays = normalizedDayMenus.filter(
    (day) => day.items.length > 0
  ).length;

  const status = getStatusStyle(draft.status);

  return (
    <article
      className={`relative overflow-hidden rounded-[28px] border p-4 shadow-xl md:p-5 ${status.card}`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl ${status.glow}`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black ${status.badge}`}
              >
                {status.label}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black text-slate-400">
                {draft.event || "共通"}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-black text-white">
              {draft.theme || "テーマ未設定"}
            </h3>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {draft.weekStartDate ||
                draft.weekStart ||
                "開始日未設定"}
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/20"
            >
              編集
            </button>
          )}
        </div>

        {draft.memo && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black tracking-wider text-slate-600">
              代表メモ
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-300">
              {draft.memo}
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MiniStatus
            label="入力曜日"
            value={`${activeDays}/7`}
          />

          <MiniStatus
            label="練習数"
            value={`${totalItems}件`}
          />

          <MiniStatus
            label="週間時間"
            value={formatDuration(weekTotalSeconds)}
          />
        </div>

        {normalizedDayMenus.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {normalizedDayMenus.map((day) => {
              const daySeconds = calculateDaySeconds(day);
              const endTime = calculateEndTime(
                day.startTime,
                daySeconds
              );

              return (
                <div
                  key={`${draft.id}-${day.date}`}
                  className={`rounded-[22px] border p-4 ${
                    day.items.length > 0
                      ? "border-white/10 bg-black/20"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-cyan-300">
                        {day.label}曜日
                      </p>

                      <p className="mt-1 text-sm font-black text-white">
                        {day.date}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black text-slate-400">
                      {day.items.length}件
                    </span>
                  </div>

                  {day.items.length > 0 ? (
                    <>
                      <p className="mt-3 text-xs font-bold text-slate-500">
                        {day.startTime || "--:--"}開始
                        <span className="mx-2 text-slate-700">
                          →
                        </span>
                        {endTime}終了予定
                      </p>

                      <div className="mt-3 space-y-2">
                        {day.items
                          .slice(0, 4)
                          .map((item, index) => (
                            <div
                              key={`${day.date}-${item.drillId}-${index}`}
                              className="flex items-center gap-2"
                            >
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-400/10 text-[9px] font-black text-violet-300">
                                {index + 1}
                              </span>

                              <p className="truncate text-xs font-bold text-slate-300">
                                {item.name}
                              </p>
                            </div>
                          ))}

                        {day.items.length > 4 && (
                          <p className="text-[10px] font-black text-violet-300">
                            ほか {day.items.length - 4}件
                          </p>
                        )}
                      </div>

                      <p className="mt-3 text-[10px] font-black text-slate-600">
                        合計 {formatDuration(daySeconds)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-slate-700">
                      休養または未入力
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
            <p className="text-xs font-bold text-slate-600">
              曜日別メニューが保存されていません
            </p>
          </div>
        )}

        {draft.leaderComment && (
          <CommentCard
            label="パート長コメント"
            value={draft.leaderComment}
            accent="pink"
          />
        )}

        {draft.coachComment && (
          <CommentCard
            label="コーチコメント"
            value={draft.coachComment}
            accent="cyan"
          />
        )}

        {draft.status === "revision" && canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-4 font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5"
          >
            修正して再提出する
          </button>
        )}
      </div>
    </article>
  );
}

function MiniStatus({
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

function StatusSummary({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "slate" | "cyan" | "pink" | "violet";
}) {
  const styles = {
    slate: {
      card: "border-white/10 bg-white/[0.04]",
      value: "text-slate-200",
    },
    cyan: {
      card: "border-cyan-300/15 bg-cyan-400/[0.06]",
      value: "text-cyan-300",
    },
    pink: {
      card: "border-pink-300/15 bg-pink-400/[0.06]",
      value: "text-pink-300",
    },
    violet: {
      card: "border-violet-300/15 bg-violet-400/[0.06]",
      value: "text-violet-300",
    },
  };

  return (
    <div
      className={`rounded-2xl border p-3 ${styles[accent].card}`}
    >
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${styles[accent].value}`}
      >
        {value}
      </p>
    </div>
  );
}

function CommentCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "pink" | "cyan";
}) {
  const styles = {
    pink: {
      card: "border-rose-400/20 bg-rose-400/10",
      label: "text-rose-300",
      text: "text-rose-100",
    },
    cyan: {
      card: "border-cyan-400/20 bg-cyan-400/10",
      label: "text-cyan-300",
      text: "text-cyan-100",
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

      <p
        className={`mt-2 whitespace-pre-wrap text-sm font-bold leading-6 ${styles[accent].text}`}
      >
        {value}
      </p>
    </div>
  );
}

function getStatusStyle(status: string) {
  if (status === "draft") {
    return {
      label: "作成中",
      card: "border-white/10 bg-black/20",
      badge:
        "border-white/10 bg-white/[0.06] text-slate-300",
      glow: "bg-slate-400/10",
    };
  }

  if (status === "submitted") {
    return {
      label: "提出済み",
      card: "border-cyan-300/20 bg-cyan-400/[0.05]",
      badge:
        "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",
      glow: "bg-cyan-400/10",
    };
  }

  if (status === "revision" || status === "returned") {
    return {
      label: "修正依頼中",
      card: "border-rose-300/20 bg-rose-400/[0.05]",
      badge:
        "border-rose-300/20 bg-rose-400/10 text-rose-300",
      glow: "bg-rose-400/10",
    };
  }

  if (status === "approved") {
    return {
      label: "承認済み",
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
      "border-white/10 bg-white/[0.06] text-slate-300",
    glow: "bg-slate-400/10",
  };
}