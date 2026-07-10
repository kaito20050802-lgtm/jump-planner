"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Role = "leader" | "representative" | "athlete" | "coach";

type Member = {
  id: string;
  name: string;
  role: Role;
  event?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "first">("login");

  const selectedMember = members.find((m) => m.id === selectedId);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "members"));
      const loaded = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Member[];

      setMembers(loaded);
      setSelectedId(loaded[0]?.id ?? "");
    };

    load();
  }, []);

  const goAfterLogin = (member: Member) => {
    sessionStorage.setItem("currentMemberId", member.id);
    sessionStorage.setItem("currentRole", member.role);
    sessionStorage.setItem("currentEvent", member.event || "共通");

    if (member.role === "leader") router.push("/admin");
    else router.push("/home");
  };

  const login = () => {
    if (!selectedMember) return alert("メンバーがいません");

    if (!selectedMember.password) {
      setMode("first");
      return;
    }

    if (password !== selectedMember.password) {
      alert("パスワードが違います");
      return;
    }

    goAfterLogin(selectedMember);
  };

  const setFirstPassword = async () => {
    if (!selectedMember) return;

    if (newPassword.length < 4) {
      alert("パスワードは4文字以上にしてください");
      return;
    }

    await updateDoc(doc(db, "members", selectedMember.id), {
      password: newPassword,
    });

    goAfterLogin({ ...selectedMember, password: newPassword });
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Planner</p>
        <h1 className="mt-2 text-4xl font-black">
          {mode === "login" ? "ログイン" : "初回設定"}
        </h1>
        <p className="mt-3 text-sm font-bold text-slate-500">
          名前を選んでログインしてください。
        </p>

        <section className="mt-6 rounded-[28px] bg-white p-5 shadow-sm">
          <label className="text-sm font-black">名前</label>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={mode === "first"}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          {mode === "login" ? (
            <>
              <label className="mt-5 block text-sm font-black">パスワード</label>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
                type="password"
                value={password}
                placeholder={selectedMember?.password ? "パスワード" : "初回設定が必要です"}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={login}
                className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
              >
                {selectedMember?.password ? "ログイン" : "初回パスワード設定へ"}
              </button>
            </>
          ) : (
            <>
              <label className="mt-5 block text-sm font-black">新しいパスワード</label>
              <div className="relative mt-2">
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white p-4 pr-14 font-bold"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  placeholder="4文字以上"
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <button
                onClick={setFirstPassword}
                className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
              >
                設定して開始
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}