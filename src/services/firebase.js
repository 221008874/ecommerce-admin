// src/lib/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBOHwckfAbEYHOhmhKzmOYd8GEY7mywqE4",
  authDomain: "louable-b4c1a.firebaseapp.com",
  projectId: "louable-b4c1a",
  storageBucket: "louable-b4c1a.firebasestorage.app",
  messagingSenderId: "966810994370",
  appId: "1:966810994370:web:6c691e3a0d3afcb6439d5b"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)