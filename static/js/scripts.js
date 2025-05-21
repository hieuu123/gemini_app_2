// static/js/scripts.js
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

(() => {
  // ---- 1. Biến toàn cục của module ----
  let eventSource     = null;
  let currentJob      = 0;
  let currentSearchId = null;
  let chatHistory     = [];
  let greeted         = false;
  let currentKeyword  = "";

  // ---- 2. Lấy các element ----
  const form             = document.getElementById("job-form");
  const logElem          = document.getElementById("log");
  const jobListElem      = document.getElementById("job-list");
  const jobDetailsElem   = document.getElementById("job-details");
  const chatboxContainer = document.getElementById("chatbox-container");
  const chatboxToggleBtn = document.getElementById("chatbox-toggle");
  const inputEl          = document.getElementById("input");

  // ---- 3. Helpers ----
  function appendMessage(sender, message) {
    const chatbox = document.getElementById("chatbox");
    const div     = document.createElement("div");
    div.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatbox.appendChild(div);
    chatbox.scrollTop = chatbox.scrollHeight;
  }

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

  async function loadSelfPostedJobs(keyword) {
    jobListElem.innerHTML = "";
    currentJob = 0;
    try {
      const snap = await getDocs(collection(db, "jobs_self_posted"));
      snap.forEach(docSnap => {
        const job = docSnap.data();
        if (!job.keyword?.toLowerCase().includes(keyword.toLowerCase())) return;
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
      console.error("Lỗi load self-posted:", e);
    }
  }

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

  function fetchJobDetails(jobId) {
    fetch(`/job/${jobId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.job_id) return;
        const btn = data.self_posted
          ? `<a href="/my_job/${data.job_id}" target="_blank"><button class="btn btn-primary">View Job</button></a>`
          : `<a href="https://www.linkedin.com/jobs/view/${data.job_id}" target="_blank"><button class="btn btn-primary">View on LinkedIn</button></a>`;
        jobDetailsElem.innerHTML = `
          <h2>${data.title}</h2>
          ${btn}
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

  function openChat() {
    if (!greeted) {
      const txt = "Hello! I’m Jack, your job search assistant. Tell me about your ideal job—things like salary, job type, working hours, location, and benefits.";
      appendMessage("Chatbot", txt);
      chatHistory.push({ role: "system", parts: txt });
      greeted = true;
    }
  }

  // ---- 4. Bắt event Search ----
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const kw = form.querySelector('input[name="keyword"]').value.trim();
    if (!kw) return;

    // reset UI + SSE + chat state
    cleanupSearch();
    logElem.innerHTML = "";
    jobDetailsElem.innerHTML = "";
    currentKeyword = kw;
    chatHistory    = [];
    greeted        = false;

    // load tự đăng → mở chat + greeting
    await loadSelfPostedJobs(kw);
    openChat();
    chatboxContainer.style.display = "flex";

    // gọi /search SSE
    const r = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: kw })
    });
    const { search_id } = await r.json();
    currentSearchId = search_id;
    eventSource    = new EventSource(`/stream/${encodeURIComponent(search_id)}`);
    eventSource.onmessage = onEventMessage;
    eventSource.onerror   = cleanupSearch;
  });

  // ---- 5. Bắt event gửi chat ----
  window.sendMessage = async () => {
    const msg = inputEl.value.trim();
    if (!msg) return;
    appendMessage("You", msg);
    chatHistory.push({ role: "user", parts: msg });
    inputEl.value = "";

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
  };

  // ---- 6. Toggle chatbox ----
  window.toggleChatbox = () => {
    chatboxContainer.style.display = (chatboxContainer.style.display === "flex")
      ? "none"
      : "flex";
  };

  chatboxToggleBtn.addEventListener("click", window.toggleChatbox);
})();
