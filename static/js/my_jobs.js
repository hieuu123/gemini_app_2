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
    // const loader = document.getElementById("loader");
    const listEl = document.getElementById("applied-jobs-list");
    try {
        // 1) Query applicants_management where userIds array-contains current user
        const q = query(
            collection(db, "applicants_management"),
            where("userIds", "array-contains", userUid)
        );
        const appsSnap = await getDocs(q);

        if (appsSnap.empty) {
            listEl.innerHTML = `<p class="text-center text-muted">Bạn chưa ứng tuyển công việc nào.</p>`;
            return;
        }

        // 2) Với mỗi document (id = jobId), lấy từ jobs_self_posted
        for (const docSnap of appsSnap.docs) {
            const jobId = docSnap.id;
            const jobRef = doc(db, "jobs_self_posted", jobId);
            const jobSnap = await getDoc(jobRef);
            if (!jobSnap.exists()) continue;

            const job = jobSnap.data();
            // Build card
            const col = document.createElement("div");
            col.className = "col-12";
            col.innerHTML = `
      <div class="card job-card p-3 d-flex justify-content-between align-items-center flex-lg-row flex-column">
        <div class="d-flex align-items-center">
          <div class="me-3" style="width:60px; height:60px;">
            <img src="${job.company_logo || 'https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg'}"
                 alt="Logo" class="img-fluid rounded">
          </div>
          <div>
            <h5 class="mb-1">${job.title}</h5>
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
            // khi click vào card, cũng mở details
            col.querySelector(".job-card")
                .addEventListener("click", () => window.open(`/my_job/${jobId}`, '_blank'));
        }
    } catch (err) {
        console.error("Lỗi khi load My Jobs:", err);
        document.getElementById("applied-jobs-list").innerHTML =
            `<p class="text-center text-danger">Không tải được danh sách, vui lòng thử lại.</p>`;
    } finally {
        // Ẩn loader cho dù thành công hay lỗi
        document.getElementById("loader").style.display = "none";
    }
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        // chưa login -> redirect hoặc show alert
        window.location.href = "/";
        return;
    }
    // kiểm tra is_admin
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const isAdmin = userSnap.exists() && userSnap.data().is_admin;
    if (isAdmin) {
        // admin không được vô page này
        alert("Trang này chỉ dành cho ứng viên!");
        window.location.href = "/";
        return;
    }
    // load danh sách
    renderAppliedJobs(user.uid);
});
