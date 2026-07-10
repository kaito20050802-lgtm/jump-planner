"use client";

import { useMemo, useState } from "react";
import { Drill, EVENTS } from "@/types/training";

type Props = {
  drills: Drill[];
  selectedIds: string[];
  onSelect: (drill: Drill) => void;
};

export default function WeeklyFolder({
  drills,
  selectedIds,
  onSelect,
}: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);

  const categoryFolders = useMemo(() => {
    return Array.from(
      new Set(drills.map((drill) => drill.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [drills]);

  const eventFolders = useMemo(() => {
    if (!openCategory) return [];

    return [...EVENTS].filter((event) =>
      drills.some(
        (drill) =>
          drill.category === openCategory &&
          drill.targetEvent === event
      )
    );
  }, [drills, openCategory]);

  const tagFolders = useMemo(() => {
    if (!openCategory || !openEvent) return [];

    const tagSet = new Set<string>();

    drills.forEach((drill) => {
      if (
        drill.category === openCategory &&
        drill.targetEvent === openEvent
      ) {
        (drill.purposeTags || []).forEach((tag) => {
          if (tag) tagSet.add(tag);
        });
      }
    });

    return Array.from(tagSet).sort((a, b) =>
      a.localeCompare(b, "ja")
    );
  }, [drills, openCategory, openEvent]);

  const displayedDrills = useMemo(() => {
    if (!openCategory || !openEvent || !openTag) return [];

    return drills
      .filter(
        (drill) =>
          drill.category === openCategory &&
          drill.targetEvent === openEvent &&
          drill.purposeTags?.includes(openTag)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [drills, openCategory, openEvent, openTag]);

  const resetFolders = () => {
    setOpenCategory(null);
    setOpenEvent(null);
    setOpenTag(null);
  };

  const goBack = () => {
    if (openTag) {
      setOpenTag(null);
      return;
    }

    if (openEvent) {
      setOpenEvent(null);
      return;
    }

    if (openCategory) {
      setOpenCategory(null);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-slate-500">
            現在の場所
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PathChip label="メニュー集" active={!openCategory} />

            {openCategory && (
              <>
                <PathArrow />
                <PathChip
                  label={openCategory}
                  active={!openEvent}
                />
              </>
            )}

            {openEvent && (
              <>
                <PathArrow />
                <PathChip
                  label={openEvent}
                  active={!openTag}
                />
              </>
            )}

            {openTag && (
              <>
                <PathArrow />
                <PathChip label={openTag} active />
              </>
            )}
          </div>
        </div>

        {(openCategory || openEvent || openTag) && (
          <button
            type="button"
            onClick={resetFolders}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            最初へ
          </button>
        )}
      </div>

      {(openCategory || openEvent || openTag) && (
        <button
          type="button"
          onClick={goBack}
          className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black text-slate-400 transition hover:border-violet-300/20 hover:bg-violet-400/10 hover:text-violet-300"
        >
          ← 1つ前へ戻る
        </button>
      )}

      {!openCategory && (
        <FolderGrid
          title="カテゴリー"
          description="練習の種類から探します"
          items={categoryFolders}
          icon="◆"
          accent="cyan"
          getCount={(category) =>
            drills.filter(
              (drill) => drill.category === category
            ).length
          }
          onClick={(category) => {
            setOpenCategory(category);
            setOpenEvent(null);
            setOpenTag(null);
          }}
        />
      )}

      {openCategory && !openEvent && (
        <FolderGrid
          title="対象種目"
          description={`${openCategory}の対象種目を選択します`}
          items={eventFolders}
          icon="↗"
          accent="violet"
          getCount={(event) =>
            drills.filter(
              (drill) =>
                drill.category === openCategory &&
                drill.targetEvent === event
            ).length
          }
          onClick={(event) => {
            setOpenEvent(event);
            setOpenTag(null);
          }}
        />
      )}

      {openCategory && openEvent && !openTag && (
        <FolderGrid
          title="目的タグ"
          description={`${openCategory} / ${openEvent} の目的から選択します`}
          items={tagFolders}
          icon="#"
          accent="pink"
          getCount={(tag) =>
            drills.filter(
              (drill) =>
                drill.category === openCategory &&
                drill.targetEvent === openEvent &&
                drill.purposeTags?.includes(tag)
            ).length
          }
          onClick={(tag) => setOpenTag(tag)}
        />
      )}

      {openCategory && openEvent && openTag && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-pink-300">
                DRILL LIST
              </p>

              <h3 className="mt-1 text-lg font-black text-white">
                {openTag}の練習
              </h3>
            </div>

            <span className="rounded-full border border-pink-300/15 bg-pink-400/10 px-3 py-1 text-[10px] font-black text-pink-300">
              {displayedDrills.length}件
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {displayedDrills.map((drill) => {
              const selected = selectedIds.includes(drill.id);

              return (
                <button
                  key={drill.id}
                  type="button"
                  onClick={() => onSelect(drill)}
                  className={`group w-full rounded-[24px] border p-4 text-left transition ${
                    selected
                      ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-violet-600/20 shadow-lg shadow-cyan-500/10"
                      : "border-white/10 bg-black/20 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            selected
                              ? "bg-white/15 text-cyan-100"
                              : "bg-cyan-400/10 text-cyan-300"
                          }`}
                        >
                          {drill.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            selected
                              ? "bg-white/15 text-violet-100"
                              : "bg-violet-400/10 text-violet-300"
                          }`}
                        >
                          {drill.targetEvent}
                        </span>
                      </div>

                      <h4 className="mt-3 text-base font-black text-white">
                        {drill.name}
                      </h4>
                    </div>

                    <div
                      className={`flex h-8 min-w-8 items-center justify-center rounded-full border text-sm font-black ${
                        selected
                          ? "border-cyan-200/40 bg-cyan-400/20 text-cyan-100"
                          : "border-white/10 bg-white/[0.05] text-slate-500 group-hover:text-white"
                      }`}
                    >
                      {selected ? "✓" : "＋"}
                    </div>
                  </div>

                  {(drill.purposeTags?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {drill.purposeTags
                        ?.slice(0, 5)
                        .map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                              tag === openTag
                                ? "border-pink-300/20 bg-pink-400/10 text-pink-300"
                                : "border-white/10 bg-white/[0.04] text-slate-500"
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}

                      {(drill.purposeTags?.length ?? 0) > 5 && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-500">
                          +{(drill.purposeTags?.length ?? 0) - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniInfo
                      label="時間方式"
                      value={
                        drill.timeMode === "auto"
                          ? "自動計算"
                          : "標準時間"
                      }
                    />

                    <MiniInfo
                      label="基準"
                      value={
                        drill.timeMode === "auto"
                          ? `${drill.baseDistance || "-"}m / ${
                              drill.baseSeconds || "-"
                            }秒`
                          : `${drill.defaultMinutes || "-"}分`
                      }
                    />
                  </div>

                  <p
                    className={`mt-4 text-xs font-black ${
                      selected
                        ? "text-cyan-200"
                        : "text-slate-500"
                    }`}
                  >
                    {selected
                      ? "この曜日から外す"
                      : "この曜日に追加する"}
                  </p>
                </button>
              );
            })}
          </div>

          {displayedDrills.length === 0 && (
            <EmptyState message="このフォルダーには練習がありません" />
          )}
        </div>
      )}
    </div>
  );
}

type FolderAccent = "cyan" | "violet" | "pink";

function FolderGrid({
  title,
  description,
  items,
  icon,
  accent,
  getCount,
  onClick,
}: {
  title: string;
  description: string;
  items: string[];
  icon: string;
  accent: FolderAccent;
  getCount: (item: string) => number;
  onClick: (item: string) => void;
}) {
  const iconStyles: Record<FolderAccent, string> = {
    cyan:
      "from-cyan-400 to-blue-600 shadow-cyan-500/20",
    violet:
      "from-violet-500 to-indigo-600 shadow-violet-500/20",
    pink:
      "from-pink-500 to-rose-500 shadow-pink-500/20",
  };

  const textStyles: Record<FolderAccent, string> = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    pink: "text-pink-300",
  };

  return (
    <div className="mt-5">
      <p
        className={`text-xs font-black tracking-[0.2em] ${textStyles[accent]}`}
      >
        FOLDER
      </p>

      <h3 className="mt-1 text-lg font-black text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs font-bold text-slate-500">
        {description}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onClick(item)}
            className="group flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-black text-white shadow-lg ${iconStyles[accent]}`}
              >
                {icon}
              </div>

              <div className="min-w-0">
                <p className="truncate font-black text-white">
                  {item}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {getCount(item)}件
                </p>
              </div>
            </div>

            <span
              className={`text-xl transition group-hover:translate-x-1 ${textStyles[accent]}`}
            >
              →
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <EmptyState message="まだフォルダーがありません" />
      )}
    </div>
  );
}

function PathChip({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
        active
          ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-300"
          : "border-white/10 bg-white/[0.04] text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function PathArrow() {
  return (
    <span className="text-xs font-black text-slate-700">
      →
    </span>
  );
}

function MiniInfo({
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
      <p className="text-sm font-black text-slate-400">
        {message}
      </p>
    </div>
  );
}