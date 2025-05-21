import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", () => {
  let eventSource     = null;
  let currentJob      = 0;
  let currentSearchId = null;
  let chatHistory     = [];
  let greeted         = false;
  let currentKeyword  = "";

  const form             = document.getElementById("job-form");
  const logElem          = document.getElementById("log");
  const jobListElem      = document.getElementById("job-list");
  const jobDetailsElem   = document.getElementById("job-details");
  const chatboxContainer = document.getElementById("chatbox-container");
  const toggleLogBtn     = document.getElementById("toggle-log");

  // 1) Helper để append message vào chatbox UI
  function appendMessage(sender, message) {
    const chatbox = document.getElementById("chatbox");
    const msgDiv  = document.createElement("div");
    msgDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatbox.appendChild(msgDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
  }

  // 2) Dọn SSE cũ và flag tìm kiếm
  function cleanupSearch() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (currentSearchId) {
      fetch("/cancel_search", { method: "POST" }).catch(() => {});
      currentSearchId = null;
    }
  }

  // 3) Mở chat và chạy greeting 1 lần
  function openChat() {
    if (!greeted) {
      const greeting = "Hello! I’m Jack, your job search assistant. Tell me about your ideal job—things like salary, job type, working hours, location, and benefits.";
      appendMessage("Chatbot", greeting);
      chatHistory.push({ role: "system", parts: greeting });
      greeted = true;
    }
  }

  // 4) Load self-posted jobs (không block chat)
  async function loadSelfPostedJobs(keyword) {
    try {
      const snap = await getDocs(collection(db, "jobs_self_posted"));
      snap.forEach(docSnap => {
        const job = docSnap.data();
        if (!job.keyword || !job.keyword.toLowerCase().includes(keyword.toLowerCase())) return;
        const div = document.createElement("div");
        div.className    = "job-item";
        div.dataset.jobId = docSnap.id;
        div.innerHTML    = `<strong>${job.title}</strong><br>${job.company_name}<br>${job.place}<br>${job.posted_time}`;
        div.onclick      = () => {
          fetchJobDetails(docSnap.id);
          selectJobItem(div);
        };
        jobListElem.appendChild(div);
        currentJob++;
      });
    } catch (e) {
      console.error("Không load được self-posted jobs:", e);
    }
  }

  // 5) SSE callback để append từng job mới / log
  function onEventMessage(event) {
    if (event.data.startsWith("new_job:")) {
      const job = JSON.parse(event.data.replace("new_job:", ""));
      const div = document.createElement("div");
      div.className    = "job-item";
      div.dataset.jobId = job.job_id;
      div.innerHTML    = `<strong>${job.title} — ${++currentJob}</strong><br>${job.company_name}<br>${job.place}<br>${job.posted_time}`;
      div.onclick      = () => {
        fetchJobDetails(job.job_id);
        selectJobItem(div);
      };
      jobListElem.appendChild(div);
    } else {
      const p = document.createElement("p");
      p.textContent = event.data;
      logElem.appendChild(p);
      logElem.scrollTop = logElem.scrollHeight;
    }
  }

  // 6) Fetch chi tiết job khi click
  function fetchJobDetails(jobId) {
    fetch(`/job/${jobId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.job_id) return;
        const btnHtml = data.self_posted
          ? `<a href="/my_job/${data.job_id}" target="_blank"><button class="btn btn-primary">View Job</button></a>`
          : `<a href="https://www.linkedin.com/jobs/view/${data.job_id}" target="_blank"><button class="btn btn-primary">View on LinkedIn</button></a>`;
        jobDetailsElem.innerHTML = `
          <h2>${data.title}</h2>
          ${btnHtml}
          <p><strong>Company:</strong> ${data.company_name}</p>
          <p><strong>Location:</strong> ${data.place}</p>
          <p><strong>Posted:</strong> ${data.posted_time}</p>
          <p><strong>Applicants:</strong> ${data.num_applicants}</p>
          <p><strong>Seniority:</strong> ${data.seniority_level}</p>
          <p><strong>Type:</strong> ${data.employment_type}</p>
          ${!data.self_posted ? `<p><strong>Function:</strong> ${data.job_function}</p><p><strong>Industries:</strong> ${data.industries}</p>` : ""}
          <p><strong>Description:</strong></p>
          <div>${data.job_description}</div>
        `;
      })
      .catch(console.error);
  }

  function selectJobItem(el) {
    document.querySelectorAll(".job-item").forEach(x => x.classList.remove("selected"));
    el.classList.add("selected");
  }

  // 7) Khi user bấm Search
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const keyword = form.querySelector('input[name="keyword"]').value.trim();
    if (!keyword) return;

    // dọn UI & SSE cũ
    cleanupSearch();
    logElem.innerHTML      = "";
    jobListElem.innerHTML  = "";
    jobDetailsElem.innerHTML = "";
    currentJob             = 0;

    // reset chat state
    currentKeyword = keyword;
    chatHistory    = [];
    greeted        = false;

    // load self-posted + open chat
    await loadSelfPostedJobs(keyword);
    openChat();
    if (!chatboxContainer.style.display || chatboxContainer.style.display === "none") {
      chatboxContainer.style.display = "flex";
    }

    // gọi backend /search và subscribe SSE
    const r = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword })
    });
    const { search_id } = await r.json();
    currentSearchId = search_id;
    eventSource    = new EventSource(`/stream/${encodeURIComponent(search_id)}`);
    eventSource.onmessage = onEventMessage;
    eventSource.onerror   = cleanupSearch;
  });

  // 8) Gọi chat endpoint khi user gửi message
  async function sendMessage() {
    const input = document.getElementById("input");
    const msg   = input.value.trim();
    if (!msg) return;

    appendMessage("You", msg);
    chatHistory.push({ role: "user", parts: msg });
    input.value = "";

    const r = await fetch("/send_message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: currentKeyword,
        history: chatHistory,
        message: msg
      })
    });
    const data = await r.json();
    appendMessage("Chatbot", data.response);
    chatHistory = data.history;
  }
  window.sendMessage = sendMessage;

  // 9) Toggle chatbox button
  window.toggleChatbox = () => {
    if (!chatboxContainer.style.display || chatboxContainer.style.display === "none") {
      chatboxContainer.style.display = "flex";
    } else {
      chatboxContainer.style.display = "none";
    }
  };

  toggleLogBtn.addEventListener("click", () => {
    const lc = document.getElementById("log-container");
    lc.style.display = lc.style.display === "none" ? "block" : "none";
  });
});
