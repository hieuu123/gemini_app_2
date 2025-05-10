// static/js/post_job.js
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const form = document.getElementById("post-job-form");
form.addEventListener("submit", async e => {
  e.preventDefault();

  // 1) Tính thời gian submit theo GMT+7, định dạng "YYYY-MM-DD HH:mm"
  const now = new Date();
  const local = new Date(now.getTime() + 7*60*60*1000);
  const iso = local.toISOString().slice(0,16).replace("T"," ");

  // 2) Thu thập dữ liệu
  const data = {
    title:            form.title.value.trim(),
    submit_time:      iso,
    seniority_level:  form.seniority_level.value,
    posted_time:      form.posted_time.value.trim(),
    place:            form.place.value.trim(),
    num_applicants:   Number(form.num_applicants.value),
    keyword:          form.keyword.value.trim(),
    employment_type:  form.employment_type.value,
    company_name:     form.company_name.value.trim(),
    job_description:  form.job_description.value.trim(),
    company_logo: "https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg"
  };

  try {
    // 3) Lấy số lượng job hiện có để làm ID tăng dần
    const snap = await getDocs(collection(db, "jobs_self_posted"));
    const newId = snap.size + 1;

    // 4) Ghi vào Firestore
    await setDoc(
      doc(db, "jobs_self_posted", String(newId)),
      data
    );

    alert("Job đã được lưu thành công!");

    // 5) Chuyển hướng sang trang view job
    window.location.href = `/`;
  } catch(err) {
    console.error("Lỗi khi post job:", err);
    alert("Không thể lưu job, vui lòng thử lại.");
  }
});
