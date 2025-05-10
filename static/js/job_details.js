import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// 1) Lấy ID của job ngay khi module được load
const parts = window.location.pathname.split("/");
const jobId = parts[parts.length - 1];

async function loadJobDetail() {
  const snap  = await getDoc(doc(db, "jobs_self_posted", jobId));
  if (!snap.exists()) {
    document.getElementById("job-not-found").style.display = "block";
    return;
  }
  const job = snap.data();
  document.getElementById("job-detail").style.display = "block";

  // điền dữ liệu...
  document.getElementById("job-logo").src        = job.company_logo || "https://t3.ftcdn.net/jpg/05/25/17/98/360_F_525179852_dPo0NiSY6GsguULdiHAH4X2mFIuk9HQ2.jpg";
  document.getElementById("job-title").textContent    = job.title;
  document.getElementById("job-company").textContent  = job.company_name;
  document.getElementById("job-place").textContent    = job.place;
  document.getElementById("job-description").innerHTML= job.job_description;
  document.getElementById("job-seniority").textContent = job.seniority_level;
  document.getElementById("job-applicants").textContent= job.num_applicants;
  document.getElementById("job-employment").textContent= job.employment_type;
  document.getElementById("job-posted").textContent    = job.posted_time;
}

loadJobDetail().catch(err => {
  console.error("Lỗi khi tải chi tiết công việc:", err);
  document.getElementById("job-not-found").style.display = "block";
});

// 2) Bật nút Apply chỉ với user thường
onAuthStateChanged(auth, async user => {
  if (!user) return;
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const isAdmin  = userSnap.exists() && userSnap.data().is_admin;
  if (!isAdmin) {
    const applyBtn = document.getElementById("apply-btn");
    applyBtn.style.display = ""; 
    applyBtn.addEventListener("click", async () => {
      try {
        // tăng số ứng viên
        const jobRef = doc(db, "jobs_self_posted", jobId);
        await updateDoc(jobRef, { num_applicants: increment(1) });

        // ghi vào applicants_management
        const appRef = doc(db, "applicants_management", jobId);
        await updateDoc(appRef, {
          userIds: arrayUnion(user.uid)
        }).catch(async err => {
          if (err.code === 'not-found') {
            await setDoc(appRef, { userIds: [user.uid] });
          } else throw err;
        });

        alert("Ứng tuyển thành công. Hãy chờ thông báo của chúng tôi!");
        applyBtn.disabled = true;
      } catch(e) {
        console.error("Lỗi khi ứng tuyển:", e);
        alert("Không thể ứng tuyển, vui lòng thử lại sau.");
      }
    });
  }
});
