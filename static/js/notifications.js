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

  const notifBtn      = document.getElementById("notif-btn");
  const notifCountEl  = document.getElementById("notif-count");
  const notifDropdown = document.getElementById("notif-dropdown");

  const q = query(
    collection(db, "notifications", user.uid, "items"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snapshot => {
    const docs   = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = docs.filter(n => !n.read).length;

    // badge
    if (unread) {
      notifCountEl.style.display = "";
      notifCountEl.textContent   = unread;
    } else {
      notifCountEl.style.display = "none";
    }

    // dropdown content
    notifDropdown.innerHTML = docs.length
      ? docs.map(n => `
          <li>
            <div class="notif-item ${n.read ? 'text-muted':''}" data-id="${n.id}" style="cursor:pointer;">
              <div>${n.message}<br>
                <small>${n.createdAt.toDate().toLocaleString()}</small>
              </div>
              ${n.read ? '' : '<span class="badge bg-primary">Mới</span>'}
            </div>
            <hr class="my-1"/>
          </li>`).join("")
      : `<li class="text-center text-muted small">Chưa có thông báo</li>`;
  });

  // toggle
  notifBtn.addEventListener("click", e => {
    e.preventDefault();
    notifDropdown.classList.toggle("show");
  });

  // mark read
  notifDropdown.addEventListener("click", async e => {
    const item = e.target.closest(".notif-item");
    if (!item) return;
    const nid = item.dataset.id;
    await updateDoc(doc(db, "notifications", user.uid, "items", nid), { read: true });
  });
});
