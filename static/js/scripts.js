// scripts.js

import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "./firebaseConfig.js"; // đảm bảo bạn đã có

// const chatboxContainer = document.getElementById("chatbox-container");
// const inputEl = document.getElementById("input");
window.chatHistory = [];          // toàn bộ lịch sử chat
window.currentKeyword = "";          // lưu keyword hiện tại

document.addEventListener("DOMContentLoaded", () => {
  let eventSource = null;
  let currentJob = 0;
  let currentChatIndex = 0;
  let currentSearchId = null;

  const form = document.getElementById("job-form");
  const logElem = document.getElementById("log");
  const jobListElem = document.getElementById("job-list");
  const jobDetailsElem = document.getElementById("job-details");
  const chatboxContainer = document.getElementById("chatbox-container");
  // const toggleLogBtn = document.getElementById("log-container");

  async function loadSelfPostedJobs(searchKeyword) {
    try {
      const snapshot = await getDocs(collection(db, "jobs_self_posted"));
      snapshot.forEach(docSnap => {
        const job = docSnap.data();
        const id = docSnap.id;

        // nếu job.keyword không tồn tại hoặc không chứa searchKeyword thì bỏ qua
        if (
          !job.keyword ||
          !job.keyword.toLowerCase().includes(searchKeyword.toLowerCase())
        ) {
          return;
        }

        // tạo phần tử giống như onEventMessage
        const jobItem = document.createElement("div");
        jobItem.className = "job-item";
        jobItem.dataset.jobId = id;
        jobItem.innerHTML = `
          <strong>${job.title}</strong><br>
          ${job.company_name}<br>
          ${job.place}<br>
          ${job.posted_time}
        `;
        jobItem.onclick = () => {
          fetchJobDetails(id);
          selectJobItem(jobItem);
        };

        jobListElem.appendChild(jobItem);
        currentJob++;  // đánh số tiếp theo cho scraped
      });
    } catch (err) {
      console.error("Không load được jobs_self_posted:", err);
    }
  }

  // Hàm dọn dẹp SSE / hủy backend
  function cleanupSearch() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (currentSearchId) {
      // Gửi POST để backend set reset_flag ngay
      fetch("/cancel_search", { method: "POST" }).catch(() => { });
      currentSearchId = null;
    }
  }

  // Đảm bảo gọi cleanup khi reload / back / navigate away
  window.addEventListener("beforeunload", cleanupSearch);
  window.addEventListener("pagehide", cleanupSearch);
  window.addEventListener("unload", cleanupSearch);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword = form.querySelector('input[name="keyword"]').value.trim();
    if (!keyword) return;

    window.currentKeyword = keyword;

    // 1) Dọn UI cũ và hủy SSE cũ
    cleanupSearch();
    logElem.innerHTML = "";
    jobListElem.innerHTML = "";
    jobDetailsElem.innerHTML = "";
    currentJob = 0;

    // 2) lưu keyword, reset lịch sử chat
    window.currentKeyword = keyword;
    window.chatHistory = [];
    currentChatIndex = 0;

    // Load trước các job tự đăng
    await loadSelfPostedJobs(keyword);

    // 2) Mở chatbot nếu cần
    if (!chatboxContainer.style.display || chatboxContainer.style.display === "none") {
      toggleChatbox();
    }

    // Greeting lần đầu
    if (currentChatIndex === 0) {
      const greeting = "Hello! I’m Jack, your job search assistant. Tell me about your ideal job—things like salary, job type (full-time, part-time, freelance), working hours, location, and benefits.";
      appendMessage("Chatbot", greeting);
      window.chatHistory.push({ role: "system", parts: greeting });
    }
    currentChatIndex++;

    appendMessage("Chatbot", '<i id="processing-message">Processing your request...</i><br><br>');

    // 3) Gọi /search lấy search_id
    const res = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    const { search_id } = await res.json();
    currentSearchId = search_id;

    // 4) Tạo EventSource mới trỏ đến đúng phiên search
    eventSource = new EventSource(`/stream/${encodeURIComponent(search_id)}`);
    eventSource.onmessage = onEventMessage;
    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      cleanupSearch();
    };

    // 5) Lời chào lần đầu
    if (currentChatIndex === 0) {
      setTimeout(() => {
        appendMessage(
          "Chatbot",
          "Hello! I’m Jack, your job search assistant. Tell me about your ideal job—things like salary, job type (full-time, part-time, freelance), working hours, location, and benefits. The more details you provide, the better I can help you find the right match!<br><br>"
        );
      }, 1000);
    }
    currentChatIndex++;
  });

  function onEventMessage(event) {
    if (event.data.startsWith("new_job:")) {
      const job = JSON.parse(event.data.replace("new_job:", ""));
      const jobItem = document.createElement("div");
      jobItem.className = "job-item";
      jobItem.dataset.jobId = job.job_id;
      jobItem.innerHTML = `<strong>${job.title} — ${++currentJob}</strong><br>
                             ${job.company_name}<br>
                             ${job.place}<br>
                             ${job.posted_time}`;
      jobItem.onclick = () => {
        fetchJobDetails(job.job_id);
        selectJobItem(jobItem);
      };
      jobListElem.appendChild(jobItem);
    } else {
      const p = document.createElement("p");
      p.textContent = event.data;
      logElem.appendChild(p);
      logElem.scrollTop = logElem.scrollHeight;
    }
  }

  function fetchJobDetails(jobId) {
    fetch(`/job/${jobId}`)
      .then(r => r.json())
      .then(data => {
        if (!data || !data.job_id) return;
        // Chọn link & label dựa vào self_posted
        let btnHtml;
        if (data.self_posted) {
          // job tự đăng → link về trang nội bộ
          btnHtml = `<a href="/my_job/${data.job_id}" target="_blank">
                       <button class="btn btn-primary" id="btn-details">View Job</button>
                     </a>`;
        } else {
          // job scraped → đi LinkedIn
          btnHtml = `<a href="https://www.linkedin.com/jobs/view/${data.job_id}" target="_blank">
                       <button class="btn btn-primary" id="btn-details">View Job on LinkedIn</button>
                     </a>`;
        }
        jobDetailsElem.innerHTML = `
          <h2>${data.title}</h2>
          ${btnHtml}
          <p><strong>Company:</strong> ${data.company_name}</p>
          <p><strong>Location:</strong> ${data.place}</p>
          <p><strong>Posted:</strong> ${data.posted_time}</p>
          <p><strong>Applicants:</strong> ${data.num_applicants}</p>
          <p><strong>Seniority:</strong> ${data.seniority_level}</p>
          <p><strong>Type:</strong> ${data.employment_type}</p>
          ${!data.self_posted ? `<p><strong>Function:</strong> ${data.job_function}</p>
                                  <p><strong>Industries:</strong> ${data.industries}</p>` : ""}
          <p><strong>Description:</strong></p>
          <div>${data.job_description}</div>
        `;
      })
      .catch(console.error);
  }

  function selectJobItem(item) {
    document.querySelectorAll(".job-item").forEach((el) => el.classList.remove("selected"));
    item.classList.add("selected");
  }

  // toggleLogBtn.addEventListener("click", () => {
  //   const lc = document.getElementById("log-container");
  //   lc.style.display = lc.style.display === "none" ? "block" : "none";
  // });
});

document.addEventListener('DOMContentLoaded', function () {
  const links = document.querySelectorAll('#chatbox a');
  links.forEach(link => {
    link.setAttribute('target', '_blank');
  });
});

// override nút onclick gọi này
window.sendMessage = function () {
  const inputEl = document.getElementById("input");
  const message = inputEl.value.trim();
  if (!message) return;

  // 1) Hiển thị user lên UI và ghi vào lịch sử toàn cầu
  appendMessage("You", message);
  window.chatHistory.push({ role: "user", parts: message });
  inputEl.value = "";

  // 2) hiệu ứng thinking
  showThinking();

  // 3) POST lên server
  fetch("/send_message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message,
      keyword: window.currentKeyword 
    })
  })
    .then(res => res.json())
    .then(data => {
      hideThinking();
      if (data.error) {
        appendMessage("Chatbot", "Có lỗi xảy ra, vui lòng thử lại.");
      } else {
        appendMessage("Chatbot", data.response);
        // 4) lưu lại reply vào lịch sử
        window.chatHistory.push({ role: "model", parts: data.response });
      }
    })
    .catch(() => {
      hideThinking();
      appendMessage("Chatbot", "Có lỗi xảy ra, vui lòng thử lại.");
    });
};
