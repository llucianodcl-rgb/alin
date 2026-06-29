import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBBiUFrHR3MhAX8m33xJhMb3OYA5BGHEN4",
  authDomain: "gen-lang-client-0193695018.firebaseapp.com",
  projectId: "gen-lang-client-0193695018",
  storageBucket: "gen-lang-client-0193695018.firebasestorage.app",
  messagingSenderId: "720175897692",
  appId: "1:720175897692:web:9593198c4a31fb3d125a99"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-alingestointelig-86303faa-71a1-4e84-909e-b05403c7873e");
