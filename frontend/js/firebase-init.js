// js/firebase-init.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAt0gq6_HmBIpH1LLBRBrNcmKjFuW1jUnA",
  authDomain: "robot-j4.firebaseapp.com",
  projectId: "robot-j4",
  storageBucket: "robot-j4.firebasestorage.app",
  messagingSenderId: "934067299754",
  appId: "1:934067299754:web:4be335ab326eff154a77d3",
  measurementId: "G-G4ZKC68G73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);