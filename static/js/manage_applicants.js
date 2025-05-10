// static/js/manage_applicants.js
import { db } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function loadApplicants() {
  const loader = document.getElementById("loader");
  const content = document.getElementById("content");
  const listEl = document.getElementById("applicants-list");

  // Lấy job_id từ URL
  const parts = window.location.pathname.split("/");
  const jobId = parts[parts.length - 1];

  try {
    const appsRef = doc(db, "applicants_management", jobId);
    const appsSnap = await getDoc(appsRef);

    if (!appsSnap.exists() || !(appsSnap.data().userIds || []).length) {
      listEl.innerHTML = `<p class="text-center text-muted">Chưa có ai ứng tuyển.</p>`;
    } else {
      const { userIds, accepted = [] } = appsSnap.data();

      for (const uid of userIds) {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) continue;
        const u = userSnap.data();

        const col = document.createElement("div");
        col.className = "col-md-6 applicant-card";

        // Nếu user đã được accept, chỉ hiển thị status
        const isAccepted = accepted.includes(uid);

        col.innerHTML = `
          <div class="card p-3">
            <h5>${u.name || "–"}</h5>
            <p class="mb-1"><strong>Email:</strong> ${u.email}</p>
            <p class="mb-1"><strong>Phone:</strong> ${u.phone || "–"}</p>
            <div class="mt-3">
              ${
                isAccepted
                  ? `<span class="text-success"><strong>Status:</strong> Accepted</span>`
                  : `
                    <button class="btn btn-sm btn-success accept-btn me-2">Accept</button>
                    <button class="btn btn-sm btn-danger decline-btn">Decline</button>
                  `
              }
            </div>
          </div>
        `;
        listEl.appendChild(col);

        if (!isAccepted) {
          // Accept
          col.querySelector(".accept-btn")
            .addEventListener("click", async () => {
              if (!confirm("Chắc chắn muốn Accept ứng viên này?")) return;
              try {
                await updateDoc(appsRef, {
                  accepted: arrayUnion(uid)
                });
                // reload trang
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
                await updateDoc(appsRef, {
                  userIds: arrayRemove(uid)
                });
                // reload trang
                window.location.reload();
              } catch (e) {
                console.error("Lỗi Decline:", e);
                alert("Không thể Decline, thử lại sau.");
              }
            });
        }
      }
    }
  } catch (e) {
    console.error("Lỗi khi load applicants:", e);
    listEl.innerHTML = `<p class="text-center text-danger">Không tải được danh sách.</p>`;
  } finally {
    loader.style.display = "none";
    content.style.display = "block";
  }
}

loadApplicants();
