// static/js/manage_applicants.js
import { db, auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "/";
    return;
  }
  // Chỉ admin mới được truy cập
  const meSnap = await getDoc(doc(db, "users", user.uid));
  if (!meSnap.exists() || !meSnap.data().is_admin) {
    alert("Chỉ admin mới được truy cập.");
    window.location.href = "/";
    return;
  }

  // Load danh sách applicants
  await loadApplicants();
});

async function loadApplicants() {
  const loader  = document.getElementById("loader");
  const content = document.getElementById("content");
  const listEl  = document.getElementById("applicants-list");
  const parts   = window.location.pathname.split("/");
  const jobId   = parts[parts.length - 1];

  // ref tới applicants_management và job document
  const appsRef = doc(db, "applicants_management", jobId);
  const appsSnap = await getDoc(appsRef);
  const jobSnap  = await getDoc(doc(db, "jobs_self_posted", jobId));
  const jobTitle = jobSnap.exists() ? jobSnap.data().title : "(Unknown)";

  if (!appsSnap.exists() || !(appsSnap.data().userIds?.length)) {
    listEl.innerHTML = `<p class="text-center text-muted">Chưa có ai ứng tuyển.</p>`;
  } else {
    const { userIds, accepted = [], declined = [] } = appsSnap.data();

    for (const uid of userIds) {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) continue;
      const u = userSnap.data();

      // Kiểm tra trạng thái
      const isAccepted = accepted.includes(uid);
      const isDeclined = declined.includes(uid);

      // Xây card
      const col = document.createElement("div");
      col.className = "col-md-6 applicant-card";
      col.innerHTML = `
        <div class="card p-3">
          <h5>${u.name || "–"}</h5>
          <p class="mb-1"><strong>Email:</strong> ${u.email}</p>
          <p class="mb-1"><strong>Phone:</strong> ${u.phone || "–"}</p>
          <div class="mt-3">
            ${
              isAccepted
                ? `<span class="text-success"><strong>Status:</strong> Accepted</span>`
              : isDeclined
                ? `<span class="text-danger"><strong>Status:</strong> Declined</span>`
                : `
                    <button class="btn btn-sm btn-success accept-btn me-2">Accept</button>
                    <button class="btn btn-sm btn-danger decline-btn">Decline</button>
                  `
            }
          </div>
        </div>
      `;
      listEl.appendChild(col);

      // Nếu chưa xử lý thì gắn sự kiện
      if (!isAccepted && !isDeclined) {
        // Accept
        col.querySelector(".accept-btn")
          .addEventListener("click", async () => {
            if (!confirm("Chắc chắn muốn Accept ứng viên này?")) return;
            try {
              // 1) thêm vào accepted
              await updateDoc(appsRef, {
                accepted: arrayUnion(uid)
              });
              // 2) tạo notification cho user
              const notifRef = doc(
                db,
                "notifications", uid,
                "items", `${jobId}_${Date.now()}`
              );
              await setDoc(notifRef, {
                message: `Bạn đã được chấp nhận cho công việc "${jobTitle}".`,
                read: false,
                createdAt: serverTimestamp()
              });
              window.location.reload();
            } catch (e) {
              console.error("Lỗi Accept:", e);
              alert("Không thể Accept, thử lại sau.");
            }
          });

        // Decline
        col.querySelector(".decline-btn")
          .addEventListener("click", async () => {
            if (!confirm("Chắc chắn muốn Decline ứng viên này?")) return;
            try {
              // 1) thêm vào declined (không xóa khỏi userIds)
              await updateDoc(appsRef, {
                declined: arrayUnion(uid)
              });
              // 2) tạo notification
              const notifRef = doc(
                db,
                "notifications", uid,
                "items", `${jobId}_${Date.now()}`
              );
              await setDoc(notifRef, {
                message: `Bạn đã bị từ chối cho công việc "${jobTitle}".`,
                read: false,
                createdAt: serverTimestamp()
              });
              window.location.reload();
            } catch (e) {
              console.error("Lỗi Decline:", e);
              alert("Không thể Decline, thử lại sau.");
            }
          });
      }
    }
  }

  // Ẩn loader, show content
  loader.style.display  = "none";
  content.style.display = "block";
}
