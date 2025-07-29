import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD9yEQy_7iKfnLLqwfglkaVLcKceMS3MsA",
  authDomain: "emergency-go-bag.firebaseapp.com",
  projectId: "emergency-go-bag",
  storageBucket: "emergency-go-bag.appspot.com",
  messagingSenderId: "7832059811",
  appId: "1:7832059811:web:9d436c185a47937d0fe416",
  measurementId: "G-JNVXK8LXVH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = firebaseConfig.appId;
