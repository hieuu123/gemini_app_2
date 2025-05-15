// static/js/all_jobs.js
import { db } from "./firebaseConfig.js";
import {
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function loadAllJobs() {
  const container = document.getElementById("all-jobs-container");
  if (!container) return;

  // Lấy tất cả jobs_self_posted, sắp xếp theo submit_time giảm dần
  const q = query(
    collection(db, "jobs_self_posted"),
    orderBy("submit_time", "desc")
  );

  try {
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      const job = docSnap.data();
      const id  = docSnap.id;

      const html = `
        <div class="col-12">
          <div class="single-job-items d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center flex-grow-1">
              <div class="company-img">
                ${job.company_logo
                  ? `<img src="${job.company_logo}" alt="Logo" />`
                  : `<img src="https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg" alt="Logo" />`}
              </div>
              <div>
                <a href="/my_job/${id}" target="_blank">
                  <h5>${job.title}</h5>
                </a>
                <ul class="list-unstyled mb-0">
                  <li>${job.company_name}</li>
                  <li><i class="fas fa-map-marker-alt"></i> ${job.place}</li>
                </ul>
              </div>
            </div>
            <div class="text-end">
              <a href="/my_job/${id}" target="_blank"
                 class="badge rounded-pill border border-primary text-primary py-1 px-2">
                ${job.employment_type}
              </a>
              <div class="mt-1 text-muted small">${job.posted_time}</div>
            </div>
          </div>
        </div>
      `;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      container.appendChild(wrapper.firstElementChild);
    });
  } catch (err) {
    console.error("Không tải được tất cả jobs:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadAllJobs);
