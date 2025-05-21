import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "./firebaseConfig.js"; // đảm bảo bạn đã có

document.addEventListener("DOMContentLoaded", () => {
  let eventSource = null;
  let currentJob = 0;
  let currentChatIndex = 0;
  let currentSearchId = null;
  let chatHistory = [];          // toàn bộ lịch sử chat
  let greeted = false;       // flag đã gửi greeting chưa
  let currentKeyword = "";          // lưu keyword hiện tại

  const form = document.getElementById("job-form");
  const logElem = document.getElementById("log");
  const jobListElem = document.getElementById("job-list");
  const jobDetailsElem = document.getElementById("job-details");
  const chatboxContainer = document.getElementById("chatbox-container");
  const toggleLogBtn = document.getElementById("toggle-log");

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

  // Mở chat lần đầu với greeting
  function openChat() {
    if (!greeted) {
      const greeting = "Hello! I’m Jack, your job search assistant. Tell me about your ideal job—things like salary, job type, working hours, location, and benefits.";
      appendMessage("Chatbot", greeting);
      // Đưa greeting này vào history như một hệ thống message
      chatHistory.push({ role: "system", parts: greeting });
      greeted = true;
    }
  }

  // Đảm bảo gọi cleanup khi reload / back / navigate away
  // window.addEventListener("beforeunload", cleanupSearch);
  // window.addEventListener("pagehide", cleanupSearch);
  // window.addEventListener("unload", cleanupSearch);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword = form.querySelector('input[name="keyword"]').value.trim();
    if (!keyword) return;

    // 1) Dọn UI cũ và hủy SSE cũ
    cleanupSearch();
    logElem.innerHTML = "";
    jobListElem.innerHTML = "";
    jobDetailsElem.innerHTML = "";
    currentJob = 0;

    // 2) reset chat state
    currentKeyword = keyword;
    chatHistory = [];
    greeted = false;

    // 3) load self-posted và mở chat + greeting
    await loadSelfPostedJobs(keyword);
    if (chatboxContainer.style.display === "" || chatboxContainer.style.display === "none") {
      toggleChatbox();
    }
    openChat();  // chỉ chạy 1 lần đầu

    // 4) gọi /search SSE
    const res1 = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    const { search_id } = await res1.json();
    currentSearchId = search_id;

    eventSource = new EventSource(`/stream/${encodeURIComponent(search_id)}`);
    eventSource.onmessage = onEventMessage;
    eventSource.onerror = () => { cleanupSearch(); };
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

  toggleLogBtn.addEventListener("click", () => {
    const lc = document.getElementById("log-container");
    lc.style.display = lc.style.display === "none" ? "block" : "none";
  });
});

// Hàm gửi message lên server
async function sendMessage() {
  const input = document.getElementById("input");
  const msg = input.value.trim();
  if (!msg) return;

  // 1) Hiển thị user lên UI và push vào history
  appendMessage("You", msg);
  chatHistory.push({ role: "user", parts: msg });
  input.value = "";

  // 2) Gọi API, kèm keyword và toàn bộ history
  const res = await fetch("/send_message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: currentKeyword,    // quan trọng để server load knowledge
      history: chatHistory,
      message: msg
    })
  });
  const data = await res.json();

  // 3) Hiển thị phản hồi và cập nhật history
  appendMessage("Chatbot", data.response);
  chatHistory = data.history;
}

// expose sendMessage cho button & Enter
window.sendMessage = sendMessage;

// helper để vẽ message
function appendMessage(sender, message) {
  const chatbox = document.getElementById('chatbox');
  const msgDiv = document.createElement('div');
  msgDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatbox.appendChild(msgDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// helper toggle chatbox
window.toggleChatbox = () => {
  if (chatboxContainer.style.display === 'none' || chatboxContainer.style.display === '') {
    chatboxContainer.style.display = 'flex';
  } else {
    chatboxContainer.style.display = 'none';
  }
};

