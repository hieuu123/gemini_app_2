// static/js/home_featured.js
import { db } from "./firebaseConfig.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function loadFeaturedJobs() {
  const container = document.getElementById("featured-jobs-container");
  if (!container) return;

  // Query 4 document mới nhất, theo createdAt hoặc submit_time nếu là timestamp
  // Giả sử bạn lưu serverTimestamp() vào trường createdAt
  const q = query(
    collection(db, "jobs_self_posted"),
    orderBy("submit_time", "desc"), // hoặc "submit_time" nếu lưu Timestamp
    limit(4)
  );

  try {
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      const job = docSnap.data();
      const id  = docSnap.id;

      // Tạo phần tử HTML
      const html = `
        <div class="single-job-items mb-30 d-flex justify-content-between align-items-center border">
          <div class="d-flex align-items-center">
            <div class="company-img me-3">
              ${job.company_logo
                ? `<img src="${job.company_logo}" alt="Logo" />`
                : `<img src="https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg" alt="Logo" />`}
            </div>
            <div>
              <a href="/my_job/${id}" target="_blank">
                <h4>${job.title}</h4>
              </a>
              <ul>
                <li>${job.company_name}</li>
                <li><i class="fas fa-map-marker-alt"></i> ${job.place}</li>
              </ul>
            </div>
          </div>
          <div class="text-end">
            <a href="/my_job/${id}" target="_blank"
               class="badge rounded-pill border border-primary text-primary py-2 px-3">
              ${job.employment_type}
            </a>
            <div class="mt-2 text-muted small">${job.posted_time}</div>
          </div>
        </div>
      `;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      container.appendChild(wrapper.firstElementChild);
    });
  } catch(err) {
    console.error("Không tải được featured jobs:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadFeaturedJobs);
