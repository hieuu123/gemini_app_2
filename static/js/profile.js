// static/js/profile.js
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
  if (!user) {
    // chưa login thì redirect về trang login
    return window.location.href = "/login";
  }

  const form       = document.getElementById("profile-form");
  const emailInput = form.email;
  const nameInput  = form.name;
  const phoneInput = form.phone;
  const uid        = user.uid;

  // Hiển thị email (lowercase)
  emailInput.value = user.email.toLowerCase();

  // Lấy dữ liệu hiện tại từ Firestore
  const docRef = doc(db, "users", uid);
  const snap   = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    nameInput.value  = data.name  || "";
    phoneInput.value = data.phone || "";
  }

  // Bắt sự kiện submit
  form.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await updateDoc(docRef, {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        updatedAt: serverTimestamp()
      });
      alert("Cập nhật hồ sơ thành công!");
    } catch(err) {
      console.error(err);
      alert("Có lỗi xảy ra: " + err.message);
    }
  });
});
