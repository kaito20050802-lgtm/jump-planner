"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Role = "leader" | "representative" | "athlete" | "coach";

type Member = {
  id: string;
  name: string;
  grade: string;
  event: string;
  role: Role;
  password?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [form, setForm] = useState({
    name: "",
    grade: "1回生",
    event: "走幅跳",
    role: "athlete" as Role,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    grade: "1回生",
    event: "走幅跳",
    role: "athlete" as Role,
  });

  useEffect(() => {
    const role = sessionStorage.getItem("currentRole");
    if (role !== "leader") {
      router.push("/");
      return;
    }
    loadMembers();
  }, [router]);

  useEffect(() => {
    if (selectedId) loadSelected(selectedId);
  }, [selectedId]);

  const loadMembers = async () => {
    const snap = await getDocs(collection(db, "members"));
    const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Member[];
    setMembers(loaded);
    if (!selectedId && loaded.length > 0) setSelectedId(loaded[0].id);
  };

  const loadSelected = async (id: string) => {
    const snap = await getDoc(doc(db, "members", id));
    if (!snap.exists()) return;
    const data = snap.data() as Member;

    setEditForm({
      name: data.name || "",
      grade: data.grade || "1回生",
      event: data.event || "走幅跳",
      role: data.role || "athlete",
    });
  };

  const addMember = async () => {
    if (!form.name.trim()) return alert("氏名を入力してください");

    const id = `member-${Date.now()}`;

    await setDoc(doc(db, "members", id), {
      name: form.name,
      grade: form.grade,
      event: form.event,
      role: form.role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setForm({
      name: "",
      grade: "1回生",
      event: "走幅跳",
      role: "athlete",
    });

    await loadMembers();
    alert("メンバーを追加しました");
  };

  const saveEdit = async () => {
    if (!selectedId) return;

    await updateDoc(doc(db, "members", selectedId), {
      name: editForm.name,
      grade: editForm.grade,
      event: editForm.event,
      role: editForm.role,
      updatedAt: serverTimestamp(),
    });

    await loadMembers();
    alert("メンバー情報を更新しました");
  };

  const resetPassword = async () => {
    if (!selectedId) return;
    const member = members.find((m) => m.id === selectedId);
    if (!member) return;

    if (!confirm(`${member.name}さんのパスワードをリセットしますか？`)) return;

    await updateDoc(doc(db, "members", selectedId), {
      password: "",
      updatedAt: serverTimestamp(),
    });

    alert("パスワードをリセットしました");
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Planner</p>
        <h1 className="mt-1 text-3xl font-black">管理者画面</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          メンバー・代表者を管理します。
        </p>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">登録済みメンバー編集</h2>

          <Select
            label="編集するメンバー"
            value={selectedId}
            onChange={setSelectedId}
            options={members.map((m) => ({
              label: `${m.name} / ${m.event} / ${roleLabel(m.role)}`,
              value: m.id,
            }))}
          />

          <Input label="氏名" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />

          <Select
            label="学年"
            value={editForm.grade}
            onChange={(v) => setEditForm({ ...editForm, grade: v })}
            options={["1回生", "2回生", "3回生", "4回生"].map((v) => ({ label: v, value: v }))}
          />

          <Select
            label="担当・専門種目"
            value={editForm.event}
            onChange={(v) => setEditForm({ ...editForm, event: v })}
            options={["走高跳", "棒高跳", "走幅跳", "三段跳", "共通"].map((v) => ({ label: v, value: v }))}
          />

          <Select
            label="役割"
            value={editForm.role}
            onChange={(v) => setEditForm({ ...editForm, role: v as Role })}
            options={[
              { label: "パート長", value: "leader" },
              { label: "種目代表", value: "representative" },
              { label: "選手", value: "athlete" },
              { label: "コーチ", value: "coach" },
            ]}
          />

          <button onClick={saveEdit} className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black text-white">
            変更を保存
          </button>

          <button onClick={resetPassword} className="mt-3 w-full rounded-2xl bg-red-100 py-4 font-black text-red-600">
            パスワードをリセット
          </button>
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">メンバー追加</h2>

          <Input label="氏名" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />

          <Select
            label="学年"
            value={form.grade}
            onChange={(v) => setForm({ ...form, grade: v })}
            options={["1回生", "2回生", "3回生", "4回生"].map((v) => ({ label: v, value: v }))}
          />

          <Select
            label="担当・専門種目"
            value={form.event}
            onChange={(v) => setForm({ ...form, event: v })}
            options={["走高跳", "棒高跳", "走幅跳", "三段跳", "共通"].map((v) => ({ label: v, value: v }))}
          />

          <Select
            label="役割"
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v as Role })}
            options={[
              { label: "パート長", value: "leader" },
              { label: "種目代表", value: "representative" },
              { label: "選手", value: "athlete" },
              { label: "コーチ", value: "coach" },
            ]}
          />

          <button onClick={addMember} className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black text-white">
            追加する
          </button>
        </section>

        <button
          onClick={() => router.push("/review")}
          className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
        >
          提出メニューを確認する
        </button>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">メンバー一覧</h2>

          <div className="mt-4 space-y-3">
            {members.map((m) => (             
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`w-full rounded-2xl p-4 text-left ${
                  selectedId === m.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                }`}
              >
                <p className="font-black">{m.name}</p>
                <p className="mt-1 text-sm font-bold opacity-80">
                  {m.grade} / {m.event} / {roleLabel(m.role)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <button onClick={() => router.push("/home")} className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-black text-white">
          ホームへ戻る
        </button>
      </div>
    </main>
  );
}

function roleLabel(role: Role) {
  if (role === "leader") return "パート長";
  if (role === "representative") return "種目代表";
  if (role === "coach") return "コーチ";
  return "選手";
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <input
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <select
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}