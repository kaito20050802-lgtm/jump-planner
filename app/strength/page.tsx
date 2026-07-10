"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Strength = {
  hangClean: string;
  highClean: string;
  quarterSquat: string;
  boxSquat: string;
  deadlift: string;
  benchPress: string;
  bodyWeight: string;
};

const target15m = {
  hangClean: 110,
  highClean: 105,
  quarterSquat: 220,
  boxSquat: 200,
  deadlift: 170,
  benchPress: 90,
};

export default function StrengthPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [form, setForm] = useState<Strength>({
    hangClean: "",
    highClean: "",
    quarterSquat: "",
    boxSquat: "",
    deadlift: "",
    benchPress: "",
    bodyWeight: "",
  });

  useEffect(() => {
    const id = sessionStorage.getItem("currentMemberId");
    if (!id) {
      router.push("/");
      return;
    }
    setMemberId(id);
    loadLatest(id);
  }, [router]);

  const loadLatest = async (id: string) => {
    const q = query(
      collection(db, "strengthRecords"),
      where("memberId", "==", id),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as Strength;
      setForm({
        hangClean: data.hangClean || "",
        highClean: data.highClean || "",
        quarterSquat: data.quarterSquat || "",
        boxSquat: data.boxSquat || "",
        deadlift: data.deadlift || "",
        benchPress: data.benchPress || "",
        bodyWeight: data.bodyWeight || "",
      });
    }
  };

  const save = async () => {
    if (!memberId) return;

    await addDoc(collection(db, "strengthRecords"), {
      memberId,
      ...form,
      createdAt: serverTimestamp(),
    });

    alert("筋トレMaxを保存しました");
  };

  const items = [
    ["ハングクリーン", "hangClean"],
    ["ハイクリーン", "highClean"],
    ["クウォータースクワット", "quarterSquat"],
    ["ボックススクワット", "boxSquat"],
    ["デッドリフト", "deadlift"],
    ["ベンチプレス", "benchPress"],
  ] as const;

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Karte</p>
        <h1 className="mt-1 text-3xl font-black">筋トレMax</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          現在値と15m目標の目安を比較します
        </p>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          {items.map(([label, key]) => (
            <Input
              key={key}
              label={label}
              value={form[key]}
              onChange={(v) => setForm({ ...form, [key]: v })}
              placeholder="kg"
            />
          ))}

          <Input
            label="体重"
            value={form.bodyWeight}
            onChange={(v) => setForm({ ...form, bodyWeight: v })}
            placeholder="kg"
          />

          <button
            onClick={save}
            className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
          >
            保存する
          </button>
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">目標との差</h2>

          <div className="mt-4 space-y-4">
            {items.map(([label, key]) => {
              const current = Number(form[key]);
              const target = target15m[key];
              const percent = current ? Math.min((current / target) * 100, 100) : 0;
              const diff = current ? target - current : target;

              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm font-bold">
                    <span>{label}</span>
                    <span>
                      {current || 0} / {target}kg
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div
                      className="h-3 rounded-full bg-blue-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {diff > 0 ? `あと ${diff}kg` : "目標到達"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] bg-slate-900 p-5 text-white">
          <h2 className="text-xl font-black">メモ</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            VBTの研究では、少ないトレーニング量でも最大筋力や跳躍力を高められる可能性が示されています。
            今後はMaxだけでなく、挙上速度も記録できるようにするとさらに良くなります。:
          </p>
        </section>

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

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <input
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold text-slate-900"
        value={value}
        placeholder={placeholder}
        type="number"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}