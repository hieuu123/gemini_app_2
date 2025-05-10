// static/js/notifications.js
import { db, auth } from "./firebaseConfig.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

onAuthStateChanged(auth, user => {
  if (!user) return;

  const notifArea     = document.getElementById("notif-area");
  const notifBtn      = document.getElementById("notif-btn");
  const notifCountEl  = document.getElementById("notif-count");
  const notifDropdown = document.getElementById("notif-dropdown");

  // show khu vực bell
  notifArea.style.display = "";

  // realtime lắng nghe notifications/{uid}/items
  const q = query(
    collection(db, "notifications", user.uid, "items"),
    orderBy("createdAt", "desc")
  );
  onSnapshot(q, snapshot => {
    const docs   = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = docs.filter(n => !n.read).length;

    // Cập nhật badge
    if (unread > 0) {
      notifCountEl.style.display = "";
      notifCountEl.textContent   = unread;
    } else {
      notifCountEl.style.display = "none";
    }

    // Build dropdown
    if (docs.length === 0) {
      notifDropdown.innerHTML = `<li class="text-center text-muted small">Chưa có thông báo</li>`;
    } else {
      notifDropdown.innerHTML = docs.map(n => `
        <li>
          <div class="notif-item d-flex justify-content-between align-items-start p-2 ${n.read? 'text-muted':''}"
               data-id="${n.id}" style="cursor:pointer;">
            <div>
              ${n.message}
              <br><small class="text-muted">${n.createdAt.toDate().toLocaleString()}</small>
            </div>
            ${n.read ? '' : `<span class="badge bg-primary rounded-pill">Mới</span>`}
          </div>
          <hr class="my-1" />
        </li>
      `).join("");
    }
  });

  // Toggle dropdown
  notifBtn.addEventListener("click", e => {
    e.preventDefault();
    notifDropdown.classList.toggle("show");
  });

  // Mark-as-read khi click từng notification
  notifDropdown.addEventListener("click", async e => {
    const item = e.target.closest(".notif-item");
    if (!item) return;
    const nid = item.dataset.id;
    await updateDoc(doc(db, "notifications", user.uid, "items", nid), {
      read: true
    });
  });
});
