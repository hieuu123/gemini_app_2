// static/js/auth.js
import { auth, db } from "./firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// --- Đăng ký ---
const signupForm = document.getElementById("signup-form");
if (signupForm) {
    const signupBtn = document.getElementById("signup-btn");
    signupBtn.addEventListener("click", async () => {
      const name     = signupForm.name.value.trim();
      const phone    = signupForm.phone.value.trim();
      const email    = signupForm.email.value.trim();
      const password = signupForm.password.value;
      const confirm  = signupForm.confirm_password.value;
    
      if (password !== confirm) {
        return alert("Mật khẩu xác nhận không khớp!");
      }
    
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCred.user.uid;
        await setDoc(doc(db, "users", uid), {
          name, phone, email, is_admin: false, createdAt: serverTimestamp()
        });
        window.location.href = "/";
      } catch(err) {
        alert(err.message);
      }
    });
}

// --- Đăng nhập ---
const signinForm = document.getElementById("signin-form");
if (signinForm) {
  signinForm.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth,
        signinForm.email.value,
        signinForm.password.value
      );
      window.location.href = "/";
    } catch (err) {
      alert(err.message);
    }
  });
}

// --- Đăng xuất ---
const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).catch(console.error);
  });
}

const authButtons  = document.getElementById('auth-buttons');
const userDropdown = document.getElementById('user-dropdown');
const userEmailEl  = document.getElementById('user-email');
const adminItems = document.querySelectorAll('.admin-only');

// khi trạng thái auth thay đổi
onAuthStateChanged(auth, async user => {
  if (user) {
    authButtons.style.display  = 'none';
    userDropdown.style.display = 'inline-block';
    userEmailEl.textContent    = user.email.toLowerCase();

    // fetch profile để xem is_admin
    const snap = await getDoc(doc(db, "users", user.uid));
    const isAdmin = snap.exists() && snap.data().is_admin;

    // show/hide các phần tử admin-only
    adminItems.forEach(el => {
      if (isAdmin) el.classList.remove('d-none');
      else          el.classList.add   ('d-none');
    });

    // Show/hide user-only
    document.querySelectorAll('.user-only')
    .forEach(el => el.style.display = isAdmin ? 'none' : '');
  } else {
    // khi logout
    authButtons.style.display  = 'inline-block';
    userDropdown.style.display = 'none';
    userEmailEl.textContent    = '';

    // luôn ẩn admin-only
    adminItems.forEach(el => el.classList.add('d-none'));
  }
});
