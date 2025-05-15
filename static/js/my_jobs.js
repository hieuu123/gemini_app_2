// static/js/my_jobs.js
import { db, auth } from "./firebaseConfig.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

async function renderAppliedJobs(userUid) {
  const loader = document.getElementById("loader");
  const listEl = document.getElementById("applied-jobs-list");

  try {
    // 1) Tìm những job mà user đã apply
    const q = query(
      collection(db, "applicants_management"),
      where("userIds", "array-contains", userUid)
    );
    const appsSnap = await getDocs(q);

    if (appsSnap.empty) {
      listEl.innerHTML = `<p class="text-center text-muted">Bạn chưa ứng tuyển công việc nào.</p>`;
      return;
    }

    // 2) Với mỗi jobId, lấy job + trạng thái
    for (const docSnap of appsSnap.docs) {
      const jobId = docSnap.id;

      // a) Lấy data job
      const jobRef = doc(db, "jobs_self_posted", jobId);
      const jobSnap = await getDoc(jobRef);
      if (!jobSnap.exists()) continue;
      const job = jobSnap.data();

      // b) Lấy trạng thái từ applicants_management
      const appsRef = doc(db, "applicants_management", jobId);
      const appsDoc = await getDoc(appsRef);
      const { accepted = [], declined = [] } = appsDoc.exists()
        ? appsDoc.data()
        : {};

      let statusBadge = "";
      if (accepted.includes(userUid)) {
        statusBadge = `<span class="badge bg-success ms-2" style="margin-left: 15px;">Accepted</span>`;
      } else if (declined.includes(userUid)) {
        statusBadge = `<span class="badge bg-danger ms-2" style="margin-left: 15px;">Declined</span>`;
      }

      // c) Build card
      const col = document.createElement("div");
      col.className = "col-12";
      col.innerHTML = `
        <div class="card job-card p-3 d-flex justify-content-between align-items-center flex-lg-row flex-column">
          <div class="d-flex align-items-center">
            <div class="me-3" style="width:60px; height:60px; border:1px solid #cde1ff; border-radius:4px; overflow:hidden;">
              <img src="${job.company_logo || 'https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg'}"
                   alt="Logo" class="img-fluid rounded">
            </div>
            <div>
              <h5 class="mb-1">${job.title}${statusBadge}</h5>
              <p class="mb-0 text-secondary">${job.company_name}</p>
              <p class="mb-0 text-secondary"><i class="fas fa-map-marker-alt"></i> ${job.place}</p>
            </div>
          </div>
          <div class="text-end mt-3 mt-lg-0">
            <a href="/my_job/${jobId}" target="_blank"
               class="badge rounded-pill border border-primary text-primary py-2 px-3">
              ${job.employment_type}
            </a>
            <div class="mt-2 text-muted small">${job.posted_time}</div>
          </div>
        </div>
      `;
      listEl.appendChild(col);

      // mở chi tiết khi click card
      col.querySelector(".job-card")
         .addEventListener("click", () => window.open(`/my_job/${jobId}`, '_blank'));
    }
  } catch (err) {
    console.error("Lỗi khi load My Jobs:", err);
    listEl.innerHTML = `<p class="text-center text-danger">Không tải được danh sách, vui lòng thử lại.</p>`;
  } finally {
    loader.style.display = "none";
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "/";
    return;
  }
  // Chỉ user thường mới xem được
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (userSnap.exists() && userSnap.data().is_admin) {
    alert("Trang này chỉ dành cho ứng viên!");
    window.location.href = "/";
    return;
  }
  // Đã xác thực, render
  renderAppliedJobs(user.uid);
});
