"use client";

type Props = {
  minDate: string;
  maxDate: string;
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

export default function DateRangePicker({
  minDate,
  maxDate,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: Props) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl shadow-2xl">
      <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
        OUTPUT RANGE
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        出力期間
      </h2>

      <p className="mt-2 text-sm font-bold text-slate-400">
        スクリーンショット・印刷する期間を選択します。
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-black text-slate-300">
            開始日
          </label>

          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182033] px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="text-sm font-black text-slate-300">
            終了日
          </label>

          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182033] px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-cyan-400/10 p-4">
        <p className="text-sm font-bold text-cyan-200">
          現在の出力期間
        </p>

        <p className="mt-2 text-xl font-black text-white">
          {startDate} ～ {endDate}
        </p>
      </div>
    </section>
  );
}