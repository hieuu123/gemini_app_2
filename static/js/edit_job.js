// static/js/edit_job.js
import { db } from "./firebaseConfig.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function main() {
  // Lấy ID từ query-string ?id=...
  const loader = document.getElementById("loader");
  const formContainer = document.getElementById("form-container");
  const params = new URLSearchParams(window.location.search);
  const id     = params.get("id");
  if (!id) {
    alert("Không tìm thấy ID công việc!");
    loader.style.display = "none";
    return;
  }

  const form = document.getElementById("edit-job-form");
  const ref  = doc(db, "jobs_self_posted", id);

  // 1) Load dữ liệu hiện tại
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("Công việc không tồn tại!");
    return;
  }
  const job = snap.data();

  // Điền form
  form.title.value           = job.title;
  form.seniority_level.value = job.seniority_level;
  form.posted_time.value     = job.posted_time;
  form.place.value           = job.place;
  form.num_applicants.value  = job.num_applicants;
  form.keyword.value         = job.keyword;
  form.employment_type.value = job.employment_type;
  form.company_name.value    = job.company_name;
  form.company_logo.value    = job.company_logo || ""; 
  form.job_description.value = job.job_description;

  loader.style.display = "none";
  formContainer.style.display = "block";

  // 2) Xử lý submit
  form.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await updateDoc(ref, {
        title:           form.title.value.trim(),
        seniority_level: form.seniority_level.value,
        posted_time:     form.posted_time.value.trim(),
        place:           form.place.value.trim(),
        num_applicants:  Number(form.num_applicants.value),
        keyword:         form.keyword.value.trim(),
        employment_type: form.employment_type.value,
        company_name:    form.company_name.value.trim(),
        company_logo:    form.company_logo.value.trim(),
        job_description: form.job_description.value.trim(),
      });
      alert("Cập nhật thành công!");
      // quay về quản lý hoặc bất cứ chỗ nào bạn muốn
      window.location.href = "/manage_jobs";
    } catch(err) {
      console.error(err);
      alert("Cập nhật thất bại, vui lòng thử lại.");
    } finally {
        loader.style.display        = "none";
        formContainer.style.display = "block";
    }
  });
}

main().catch(err => {
  console.error("Lỗi edit_job.js:", err);
});
