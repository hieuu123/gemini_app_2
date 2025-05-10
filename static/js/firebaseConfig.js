// static/js/firebaseConfig.js

// 1) import các phương thức cần thiết từ CDN
import { initializeApp }   from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth }         from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore }    from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 2) Dán firebaseConfig từ console của bạn vào đây
const firebaseConfig = {
  apiKey: "AIzaSyClr-o_KuuqNEOESy4xd5XhvYAQ4D4LAeM",
  authDomain: "gemini-app-c2dd8.firebaseapp.com",
  projectId: "gemini-app-c2dd8",
  storageBucket: "gemini-app-c2dd8.appspot.com",    // thường là .appspot.com
  messagingSenderId: "235334768884",
  appId: "1:235334768884:web:fe6dc14f6eec16b753a6a1",
  measurementId: "G-MB2JBDZRBY"
};

// 3) Khởi tạo app, auth và firestore client
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// 4) xuất ra để các module khác dùng
export { auth, db };
