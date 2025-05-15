// static/js/manage_jobs.js
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function loadJobs() {
  const container = document.getElementById("job-list");
  const snapshot = await getDocs(collection(db, "jobs_self_posted"));

  snapshot.forEach(docSnap => {
    const job = docSnap.data();
    const id  = docSnap.id;

    // tạo 1 cột full-width với margin dưới
    const col = document.createElement("div");
    col.className = "col-12 mb-3";

    col.innerHTML = `
      <div class="single-job-items d-flex justify-content-between align-items-center p-3 border rounded">
        <div class="d-flex align-items-center flex-grow-1 job-click-area" style="cursor:pointer;">
          <div class="company-logo me-3">
            <img src="${job.company_logo || 'https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg'}"
                 alt="Logo" style="width:50px;height:50px;object-fit:contain;">
          </div>
          <div>
            <h5 class="mb-1">${job.title}</h5>
            <p class="mb-0 text-secondary">${job.company_name}</p>
            <p class="mb-0 text-secondary">
              <i class="fas fa-map-marker-alt"></i> ${job.place}
            </p>
          </div>
        </div>
        <div class="d-flex flex-column align-items-end">
          <span class="badge rounded-pill border border-primary text-primary py-2 px-3">
            ${job.employment_type}
          </span>
          <div class="mt-2 text-muted small">${job.posted_time}</div>
          <div class="mt-2">
            <button class="btn btn-sm btn-info manage-btn ms-1">Manage Applicants</button>
            <button class="btn btn-sm btn-warning edit-btn ms-1">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn ms-1">Delete</button>
          </div>
        </div>
      </div>`;

    // 1) Click mở chi tiết
    col.querySelector(".job-click-area").addEventListener("click", () => {
      window.open(`/my_job/${id}`, "_blank");
    });

    // 2) Edit
    col.querySelector(".edit-btn").addEventListener("click", e => {
      e.stopPropagation();
      window.open(`/edit_job.html?id=${id}`, "_blank");
    });

    // 3) Manage Applicants
    col.querySelector(".manage-btn").addEventListener("click", e => {
      e.stopPropagation();
      window.open(`/manage_applicants/${id}`, "_blank");
    });

    // 4) Delete
    col.querySelector(".delete-btn").addEventListener("click", async e => {
      e.stopPropagation();
      if (!confirm(`Bạn có chắc muốn xóa công việc "${job.title}" không?`)) return;
      try {
        await deleteDoc(doc(db, "jobs_self_posted", id));
        // gỡ thẻ khỏi DOM
        col.remove();
      } catch (err) {
        console.error("Xóa thất bại:", err);
        alert("Không thể xóa, vui lòng thử lại.");
      }
    });

    container.appendChild(col);
  });
}

loadJobs().catch(err => {
  console.error("Không tải được danh sách công việc:", err);
});
