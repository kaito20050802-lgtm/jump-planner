"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Standards = {
  hangClean: string;
  highClean: string;
  quarterSquat: string;
  boxSquat: string;
  deadlift: string;
  benchPress: string;
};

const defaultStandards: Standards = {
  hangClean: "110",
  highClean: "105",
  quarterSquat: "220",
  boxSquat: "200",
  deadlift: "170",
  benchPress: "90",
};

export default function StandardsPage() {
  const router = useRouter();
  const [form, setForm] = useState<Standards>(defaultStandards);

  useEffect(() => {
    const role = sessionStorage.getItem("currentRole");
    if (role !== "leader") {
      router.push("/");
      return;
    }

    const load = async () => {
      const snap = await getDoc(doc(db, "standards", "current"));
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          hangClean: String(data.hangClean ?? "110"),
          highClean: String(data.highClean ?? "105"),
          quarterSquat: String(data.quarterSquat ?? "220"),
          boxSquat: String(data.boxSquat ?? "200"),
          deadlift: String(data.deadlift ?? "170"),
          benchPress: String(data.benchPress ?? "90"),
        });
      }
    };

    load();
  }, [router]);

  const save = async () => {
    await setDoc(doc(db, "standards", "current"), {
      hangClean: Number(form.hangClean),
      highClean: Number(form.highClean),
      quarterSquat: Number(form.quarterSquat),
      boxSquat: Number(form.boxSquat),
      deadlift: Number(form.deadlift),
      benchPress: Number(form.benchPress),
      updatedAt: serverTimestamp(),
    });

    alert("基準値を保存しました");
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Karte</p>
        <h1 className="mt-1 text-3xl font-black">基準値管理</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          筑波資料を参考にした暫定基準。立命館データが集まったら更新します。
        </p>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <Input label="ハングクリーン" value={form.hangClean} onChange={(v) => setForm({ ...form, hangClean: v })} />
          <Input label="ハイクリーン" value={form.highClean} onChange={(v) => setForm({ ...form, highClean: v })} />
          <Input label="クウォータースクワット" value={form.quarterSquat} onChange={(v) => setForm({ ...form, quarterSquat: v })} />
          <Input label="ボックススクワット" value={form.boxSquat} onChange={(v) => setForm({ ...form, boxSquat: v })} />
          <Input label="デッドリフト" value={form.deadlift} onChange={(v) => setForm({ ...form, deadlift: v })} />
          <Input label="ベンチプレス" value={form.benchPress} onChange={(v) => setForm({ ...form, benchPress: v })} />

          <button
            onClick={save}
            className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
          >
            保存する
          </button>
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

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <input
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold text-slate-900"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="kg"
      />
    </div>
  );
}