"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  CSS,
} from "@dnd-kit/utilities";

import {
  DayMenu,
  WeeklyItem,
} from "@/types/training";

import {
  calculateDaySeconds,
  calculateEndTime,
  calculateItemSeconds,
  formatDuration,
} from "@/lib/trainingTime";

type Props = {
  selectedDay: DayMenu;

  onReorderItems: (
    oldIndex: number,
    newIndex: number
  ) => void;
};

export default function WeeklySummary({
  selectedDay,
  onReorderItems,
}: Props) {
  const totalSeconds =
    calculateDaySeconds(selectedDay);

  const endTime = calculateEndTime(
    selectedDay.startTime,
    totalSeconds
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),

    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    }),

    useSensor(KeyboardSensor, {
      coordinateGetter:
        sortableKeyboardCoordinates,
    })
  );

  const sortableIds =
    selectedDay.items.map(
      (item, index) =>
        createSortableId(item, index)
    );

  const handleDragEnd = (
    event: DragEndEvent
  ) => {
    const {
      active,
      over,
    } = event;

    if (
      !over ||
      active.id === over.id
    ) {
      return;
    }

    const oldIndex =
      sortableIds.indexOf(
        String(active.id)
      );

    const newIndex =
      sortableIds.indexOf(
        String(over.id)
      );

    if (
      oldIndex < 0 ||
      newIndex < 0
    ) {
      return;
    }

    onReorderItems(
      oldIndex,
      newIndex
    );
  };

  return (
    <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-lg shadow-lg shadow-pink-500/20">
          📊
        </div>

        <div>
          <p className="text-xs font-black tracking-[0.2em] text-pink-300">
            SUMMARY
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            {selectedDay.label}曜日のまとめ
          </h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="練習数"
          value={`${selectedDay.items.length}件`}
          accent="cyan"
        />

        <SummaryCard
          label="合計時間"
          value={formatDuration(totalSeconds)}
          accent="violet"
        />

        <SummaryCard
          label="開始"
          value={
            selectedDay.startTime ||
            "--:--"
          }
          accent="pink"
        />

        <SummaryCard
          label="終了予定"
          value={endTime}
          accent="blue"
        />
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
              TRAINING ORDER
            </p>

            <h3 className="mt-1 text-lg font-black text-white">
              練習の実施順
            </h3>
          </div>

          {selectedDay.items.length > 1 && (
            <p className="text-right text-[10px] font-bold leading-4 text-slate-500">
              長押しして
              <br />
              並べ替え
            </p>
          )}
        </div>

        {selectedDay.items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={
              closestCenter
            }
            onDragEnd={
              handleDragEnd
            }
          >
            <SortableContext
              items={sortableIds}
              strategy={
                verticalListSortingStrategy
              }
            >
              <div className="mt-4 space-y-3">
                {selectedDay.items.map(
                  (item, index) => (
                    <SortableTrainingItem
                      key={createSortableId(
                        item,
                        index
                      )}
                      id={createSortableId(
                        item,
                        index
                      )}
                      item={item}
                      index={index}
                    />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-black/20 p-6 text-center">
            <p className="text-sm font-black text-slate-400">
              練習が登録されていません
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SortableTrainingItem({
  id,
  item,
  index,
}: {
  id: string;
  item: WeeklyItem;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    transform:
      CSS.Transform.toString(
        transform
      ),
    transition,
  };

  const itemSeconds =
    calculateItemSeconds(item);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`relative rounded-[22px] border bg-black/20 p-4 shadow-lg transition ${
        isDragging
          ? "z-[100] scale-[1.02] border-cyan-300/50 bg-[#18253b] opacity-95 shadow-cyan-500/20"
          : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-black text-white">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-white">
            {item.name}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-cyan-300">
              {item.category}
            </span>

            <span className="text-[10px] font-bold text-slate-500">
              {formatDuration(
                itemSeconds
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={`${item.name}を並べ替える`}
          {...attributes}
          {...listeners}
          className="touch-none select-none rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-lg font-black leading-none text-slate-400 active:bg-cyan-400/20 active:text-cyan-200"
        >
          ☰
        </button>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent:
    | "cyan"
    | "violet"
    | "pink"
    | "blue";
}) {
  const styles = {
    cyan:
      "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",

    violet:
      "border-violet-300/20 bg-violet-400/10 text-violet-300",

    pink:
      "border-pink-300/20 bg-pink-400/10 text-pink-300",

    blue:
      "border-blue-300/20 bg-blue-400/10 text-blue-300",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${styles[accent]}`}
    >
      <p className="text-[10px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </div>
  );
}

function createSortableId(
  item: WeeklyItem,
  index: number
): string {
  return `${item.drillId}-${index}`;
}