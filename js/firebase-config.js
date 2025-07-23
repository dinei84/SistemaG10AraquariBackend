// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDoc,
    deleteDoc,
    setDoc,
    query,
    orderBy,
    getDocs,
    doc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js"; // Versão atualizada para 11.4.0
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js"; // Versão atualizada para 11.4.0

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDcpggR7jf2BEPNLqRj1Iz368F0dDtD1-4",
    authDomain: "planilha-8938f.firebaseapp.com",
    databaseURL: "https://planilha-8938f-default-rtdb.firebaseio.com",
    projectId: "planilha-8938f",
    storageBucket: "planilha-8938f.firebasestorage.app",
    messagingSenderId: "211015132743",
    appId: "1:211015132743:web:45f443dc9e65b72fe37362"
};


export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);


export { collection, addDoc, getDoc, doc, deleteDoc, getDocs, setDoc, query, orderBy };