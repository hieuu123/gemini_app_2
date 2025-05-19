// static/js/applicant_profile.js
import { db, auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

async function loadApplicantProfile(uid) {
  // 1) Load thông tin user
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    document.getElementById("user-profile").innerHTML =
      `<p class="text-danger">Không tìm thấy hồ sơ ứng viên.</p>`;
  } else {
    const u = userSnap.data();
    document.getElementById("user-profile").innerHTML = `
      <div class="card p-3">
        <h5>${u.name}</h5>
        <p><strong>Email:</strong> ${u.email}</p>
        <p><strong>Phone:</strong> ${u.phone || "–"}</p>
        <p><strong>Ngày tạo:</strong> ${u.createdAt?.toDate().toLocaleString() || "–"}</p>
      </div>
    `;
  }

  // 2) Load danh sách jobs đã apply
  const jobsListEl = document.getElementById("applied-jobs-list");
  const q = query(
    collection(db, "applicants_management"),
    where("userIds", "array-contains", uid)
  );
  const appsSnap = await getDocs(q);
  if (appsSnap.empty) {
    jobsListEl.innerHTML = `<p class="text-muted">Chưa có công việc nào.</p>`;
  } else {
    for (const docSnap of appsSnap.docs) {
      const jobId = docSnap.id;
      const jobSnap = await getDoc(doc(db, "jobs_self_posted", jobId));
      if (!jobSnap.exists()) continue;
      const job = jobSnap.data();
      const col = document.createElement("div");
      col.className = "col-12";
      col.innerHTML = `
        <div class="card job-card p-3 d-flex">
          <div>
            <h6 class="mb-1">${job.title}</h6>
            <p class="mb-0 text-secondary">${job.company_name}</p>
            <p class="mb-0 text-secondary"><i class="fas fa-map-marker-alt"></i> ${job.place}</p>
          </div>
          <div class="text-end" style="margin-top: 5px;">
            <a href="/my_job/${jobId}" target="_blank" class="btn btn-sm btn-primary">Xem chi tiết</a>
          </div>
        </div>
      `;
      jobsListEl.appendChild(col);
    }
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "/";
    return;
  }
  // Kiểm tra admin
  const meSnap = await getDoc(doc(db, "users", user.uid));
  if (!meSnap.exists() || !meSnap.data().is_admin) {
    alert("Chỉ admin mới được truy cập.");
    window.location.href = "/";
    return;
  }

  // Lấy uid từ URL
  const parts = window.location.pathname.split("/");
  const uid = parts[parts.length - 1];

  // Chạy load profile
  await loadApplicantProfile(uid);

  // ẩn loader, hiện content
  document.getElementById("loader").style.display = "none";
  document.getElementById("content").style.display = "block";
});
