import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBW-FduGV9tmTc_LuLbRhXBGbSL7yf_4Rg",
  authDomain: "jump---karte.firebaseapp.com",
  projectId: "jump---karte",
  storageBucket: "jump---karte.firebasestorage.app",
  messagingSenderId: "395302097751",
  appId: "1:395302097751:web:0222ae0f6364c2917ae412",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);