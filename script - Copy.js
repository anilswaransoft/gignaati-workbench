// Fetch and render notifications dynamically, order by releaseDate desc
document.addEventListener('DOMContentLoaded', function () {
  var notificationsListContainer = document.getElementById('notifications-list-container');
  if (notificationsListContainer) {
    fetch('http://45.114.245.191:8085/api/UpcomingUpdate')
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          // Sort by releaseDate desc
          var sorted = data.data.slice().sort(function(a, b) {
            return new Date(b.releaseDate) - new Date(a.releaseDate);
          });
          notificationsListContainer.innerHTML = sorted.map(function (item) {
            var dateStr = '';
            if (item.releaseDate) {
              var d = new Date(item.releaseDate);
              dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
            return `
              <div class="notifications mb-2">
                <h3>${item.title || ''}</h3>
                <p class="time"><b>${dateStr}</b></p>
                ${item.description ? `<div style="font-size: 12px; color: #555; margin-top: 2px;">${item.description}</div>` : ''}
              </div>
            `;
          }).join('');
        } else {
          notificationsListContainer.innerHTML = '<div class="notifications mb-2">No notifications found.</div>';
        }
      })
      .catch(function (err) {
        notificationsListContainer.innerHTML = '<div class="notifications mb-2 text-danger">Failed to load notifications.</div>';
      });
  }
});
// Fetch and render Templates card dynamically, enable Copy Json
document.addEventListener('DOMContentLoaded', function () {
  var templateListContainer = document.getElementById('template-list-container');
  if (templateListContainer) {
    fetch('http://45.114.245.191:8085/api/Template')
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data && data.data && Array.isArray(data.data)) {
          templateListContainer.innerHTML = data.data.map(function (tpl, idx) {
            return `
              <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
                <div class="tamplate-box">
                  <h3>${tpl.name}</h3>
                  <p>${tpl.description || ''}</p>
                  <button type="button" class="btn btn-primary custom-btn custom-btn-white copy-json-btn" data-json='${encodeURIComponent(tpl.jsonValue)}' id="copy-json-btn-${idx}">Copy Json</button>
                </div>
              </div>
            `;
          }).join('');
          // Add event listeners for copy buttons
          setTimeout(function() {
            var copyBtns = document.querySelectorAll('.copy-json-btn');
            copyBtns.forEach(function(btn) {
              btn.addEventListener('click', function() {
                var jsonVal = decodeURIComponent(btn.getAttribute('data-json'));
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(jsonVal);
                } else {
                  // fallback for older browsers
                  var textarea = document.createElement('textarea');
                  textarea.value = jsonVal;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                }
                btn.innerText = 'Copied!';
                setTimeout(function() { btn.innerText = 'Copy Json'; }, 1200);
              });
            });
          }, 100);
        } else {
          templateListContainer.innerHTML = '<div class="col-12">No templates found.</div>';
        }
      })
      .catch(function (err) {
        templateListContainer.innerHTML = '<div class="col-12 text-danger">Failed to load templates.</div>';
      });
  }
});
// Fetch and render LLM list in Language Models card
document.addEventListener('DOMContentLoaded', function () {
  var llmListContainer = document.getElementById('llm-list-container');
  if (llmListContainer) {
    fetch('http://45.114.245.191:8085/api/Template/llmList')
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data && data.data && Array.isArray(data.data)) {
          llmListContainer.innerHTML = data.data.map(function (llm) {
            return `
              <div class="col-xl-4 col-lg-4 col-md-6 col-12 mb-3">
                <div class="llm-box">
                  <h3>${llm.value}</h3>
                  <div>
                    <p>Status: <span>Active</span></p>
                    <button type="button" class="btn btn-primary custom-btn custom-btn-white">Configure</button>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        } else {
          llmListContainer.innerHTML = '<div class="col-12">No models found.</div>';
        }
      })
      .catch(function (err) {
        llmListContainer.innerHTML = '<div class="col-12 text-danger">Failed to load models.</div>';
      });
  }
});
// Setup card click handlers for Docker, n8n, and Ollama
document.addEventListener('DOMContentLoaded', function () {
  var dockerBox = document.getElementById('docker-setup-box');
  var n8nBox = document.getElementById('n8n-setup-box');
  var ollamaBox = document.getElementById('ollama-setup-box');
  if (dockerBox) {
    dockerBox.addEventListener('click', function () {
      handleProvisioning('docker-loader', 'docker-result', 'http://localhost:5000/api/Provisioning/1', 'Docker');
      
    });
  }
  if (n8nBox) {
    n8nBox.addEventListener('click', function () {
      handleProvisioning('n8n-loader', 'n8n-result', 'http://localhost:5000/api/Provisioning/4', 'n8n');
    });
  }
  if (ollamaBox) {
    ollamaBox.addEventListener('click', function () {
      handleProvisioning('ollama-loader', 'ollama-result', 'http://localhost:5000/api/Provisioning/4', 'Ollama');
    });
  }
});

function handleProvisioning(loaderId, resultId, apiUrl, label) {
  var loader = document.getElementById(loaderId);
  var result = document.getElementById(resultId);
  if (!loader || !result) return;
  result.style.display = 'none';
  loader.style.display = 'block';
  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      
      // If Docker was just installed, try to open Docker Desktop before showing result
      if (label === 'Docker' && data.success && window.electronAPI && window.electronAPI.openDockerDesktop) {
        window.electronAPI.openDockerDesktop();
      }
      loader.style.display = 'none';
      result.style.display = 'block';
      if (data.success) {
        result.innerHTML = '<span style="color:green; font-size: 12px">' + data.message + '</span>';
      } else {
        result.innerHTML = '<span style="color:red; font-size: 12px">' + (data.message || ('Failed to install ' + label + '.')) + '</span>';
      }
    })
    .catch(function (err) {
      loader.style.display = 'none';
      result.style.display = 'block';
      result.innerHTML = '<span style="color:red;">Error: ' + err.message + '</span>';
    });
}
const handleTabbutton = (target) => {
  // Recall APIs on every tab click
  if (typeof loadUpcomingUpdate === 'function') loadUpcomingUpdate();
  if (typeof loadTemplates === 'function') loadTemplates();
  if (typeof loadLLMList === 'function') loadLLMList();

  if (target === "Template") {
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "block";
    // tab button
    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn").classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.add("active");
  } else if (target === "Build") {
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "block";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    // tab button
    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn").classList.add("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
  } else if (target === "LLM") {
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "block";
    document.getElementById("tamplate-container").style.display = "none";
    // tab button
    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn").classList.remove("active");
    document.getElementById("LLM-btn").classList.add("active");
    document.getElementById("Template-btn").classList.remove("active");
  } else {
    // conatiner
    document.getElementById("dashboard-container").style.display = "block";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    // tab button
    document.getElementById("Dashboard-btn").classList.add("active");
    document.getElementById("Build-btn").classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
  }
};

function verify() {
  const emailBox = document.getElementById("email-box");
  const otpBox = document.getElementById("otp-box");

  otpBox.style.display = "block";
  emailBox.style.display = "none";
}

function OTPVerify() {
  const gignaatiWorkBenchContainer = document.getElementById(
    "gignaati-workBench-container"
  );
  const brandingContainer = document.getElementById("branding-container");
  const actionFeaturesSetup = document.getElementById("action-features-setup");
  gignaatiWorkBenchContainer.style.display = "none";
  brandingContainer.style.display = "none";
  actionFeaturesSetup.style.display = "block";
}
function OTPVerify1() {
  const gignaatiWorkBenchContainer = document.getElementById(
    "gignaati-workBench-container"
  );
  const brandingContainer = document.getElementById("branding-container");
  const actionFeaturesSetup = document.getElementById("action-features-setup");
  gignaatiWorkBenchContainer.style.display = "none";
  brandingContainer.style.display = "none";
  actionFeaturesSetup.style.display = "block";
}

function backToVerify() {
  const emailBox = document.getElementById("email-box");
  const otpBox = document.getElementById("otp-box");
  otpBox.style.display = "none";
  emailBox.style.display = "block";
}

function StartJourney() {
  const actionFeaturesSetup = document.getElementById("action-features-setup");
  const dashBoardBuildLLmContainer = document.getElementById(
    "dash-board-build-llm-container"
  );
  const nav = document.getElementById("nav");
  const profile = document.getElementById("profile");

  nav.style.display = "block";
  profile.style.display = "block";
  actionFeaturesSetup.style.display = "none";
  dashBoardBuildLLmContainer.style.display = "block";
}
