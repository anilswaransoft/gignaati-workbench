// ===================================================================
// === GLOBAL STATE FOR LLMs ===
// ===================================================================
var allLLMs = []; // Stores all LLMs, will be REPLACED on each tab click

function openExternalLink(url) {
  if (window.electronAPI && window.electronAPI.openExternalLink) {
    window.electronAPI.openExternalLink(url);
  } else {
    window.open(url, "_blank");
  }
}

async function restartServices() {
  const apiUrl = 'http://localhost:5000/api/OllamaProvisioning/restartOllamaN8n';
  try {
    const response = await fetch(apiUrl, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();
    if (json.message) {
      console.log(json.message);
    } else {
      console.log(json.error);
    }

  } catch (error) {
    console.error('Error during restart request:', error.message);
  }
}



async function openCouponPopup() {
  // Show the modal and overlay immediately
  document.getElementById('coupon-modal-overlay').style.display = 'block';
  document.getElementById('coupon-modal').style.display = 'block';
  const redeemButton = document.getElementById('coupon-redeem-btn');
  const couponCodeHeading = document.getElementById('coupon-code-heading');
  // Get the display element and set it to a loading state
  const codeDisplay = document.getElementById('coupon-code-display');
  codeDisplay.textContent = 'Loading...';
  codeDisplay.style.color = '#333'; // Reset color
  const emailInput = document.querySelector(".email-box input");
  const email = emailInput ? emailInput.value.trim() : "";

  const apiUrl = `https://api.gignaati.com/api/Coupon?emailId=${encodeURIComponent(email)}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Handle HTTP errors like 404, 500, etc.
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const json = await response.json();

    if (json.message === 'Coupon not available') {
      redeemButton.textContent = 'Explore AI Academy';
      //codeDisplay.style.color = '#000000';      
      codeDisplay.style.fontWeight = 'normal';
      codeDisplay.style.fontSize = '.9rem';
      codeDisplay.style.fontStyle = 'italic';
      codeDisplay.style.borderRadius = '8px';
      codeDisplay.style.marginTop = '12px';
      couponCodeHeading.style.display = 'none';
    }

    // Check if the API response has the 'data' field and it's not null
    if (json.data) {
      codeDisplay.textContent = json.data; // Display the coupon code
      codeDisplay.style.color = '#080808ff'; // Set to brand color
    } else {
      // Handle cases where 'data' is null or missing, but API call was "successful"
      const errorMessage = json.message || 'Could not retrieve a valid code.';
      codeDisplay.textContent = errorMessage;
      codeDisplay.style.color = '#080808ff'; // Set to error/red color
    }



  } catch (error) {
    // Handle fetch errors (network down) or errors thrown above
    console.error('Error fetching coupon:', error);
    codeDisplay.textContent = 'Error. Please try again.';
    codeDisplay.style.color = '#dc3545'; // Set to error/red color
  }
}


// function openCouponPopup() {
//   document.getElementById('coupon-modal-overlay').style.display = 'block';
//   document.getElementById('coupon-modal').style.display = 'block';
// }

function closeCouponPopup() {
  document.getElementById('coupon-modal-overlay').style.display = 'none';
  document.getElementById('coupon-modal').style.display = 'none';
}


// ===================================================================
// === MODIFIED FUNCTION: downloadLlmModel (with Timeout Fix) ===
// ===================================================================
async function downloadLlmModel(modelName) {
  // Model name validation
  if (!modelName) {
    console.error("Model name is missing or invalid.");
    return;
  }
  const button = event?.target;
  if (button) {
    button.disabled = false;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Configuring...';
    button.style.pointerEvents = 'none';
  }

  // Get the inline progress bar elements
  const llmBox = button ? button.closest('.llm-box') : null;
  const progressWrapper = llmBox ? llmBox.querySelector('.progress-bar-new') : null;
  const progressBar = llmBox ? llmBox.querySelector('.progress-bar') : null;

  // Show and reset the inline progress bar
  if (progressWrapper) {
    progressWrapper.style.display = 'block';
  }
  if (progressBar) {
    progressBar.style.width = '5%';
    progressBar.setAttribute('aria-valuenow', 3);
    progressBar.textContent = '5%';
    progressBar.classList.remove('bg-success', 'bg-danger');
  }

  // === FIX: Define a named handler for this specific download ===
  const progressHandler = (data) => {
    if (data.modelName === modelName) {
      const progress = data.progress || 0;

      // Update inline progress bar
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressBar.textContent = `${Math.round(progress)}%`;
      }

      // Update button text
      if (button) {
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${Math.round(progress)}%`;
      }
    }
  };

  try {
    // Check if Electron API is available
    if (window.electronAPI && window.electronAPI.downloadModel) {
      console.log(`Starting real download of model: ${modelName}`);

      // ========================================
      // PROGRESS TRACKING SETUP
      // ========================================

      // === FIX: Add progress listener using the named handler ===
      if (window.electronAPI.onModelDownloadProgress) {
        window.electronAPI.onModelDownloadProgress(progressHandler);
      }

      // Start the actual download
      await window.electronAPI.downloadModel(modelName);
      // === FIX: Remove listener *before* updating UI ===
      if (window.electronAPI.removeProgressListener) {
        window.electronAPI.removeProgressListener(progressHandler);
      }

      // === FIX 2: Add a small delay (as you suggested) ===
      // This lets any final "100%" events clear the queue *before* we set the success state.
      setTimeout(() => {
        // Success
        if (button) {
          // Check if button hasn't been manually reset (e.g., by cancel)
          //if (button.disabled) {
          if (button.disabled === false) {
            button.innerHTML = '✓ Configured';
            button.disabled = false;
            button.classList.add('btn-success');
            button.style.pointerEvents = 'auto';
          }
        }

        // Update progress container to show success
        if (progressBar) {
          progressBar.style.width = '100%';
          progressBar.classList.add('bg-success');
          progressBar.textContent = '✓ Configured!';
        }
      }, 100); // 100ms delay is enough to fix the race condition

      // Hide progress bar after 3 seconds
      setTimeout(() => {
        if (progressWrapper) {
          progressWrapper.style.display = 'none';
        }
        if (progressBar) { // Reset for next time
          progressBar.style.width = '0%';
          progressBar.textContent = '';
          progressBar.classList.remove('bg-success');
        }
      }, 3000);

    } else {
      // Fallback
      throw new Error("Electron API not available. Please run this application in Electron environment for model downloads.");
    }

  } catch (err) {
    console.error("Model download failed:", err);

    // === FIX: Remove listener on error too! ===
    if (window.electronAPI.removeProgressListener) {
      window.electronAPI.removeProgressListener(progressHandler);
    }

    // Reset button state on error
    if (button) {
      button.disabled = false;
      button.innerHTML = 'Configure';
      button.classList.remove('btn-success');
      button.style.pointerEvents = 'auto';
    }

    // Update progress container to show error
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.classList.add('bg-danger');
      progressBar.textContent = '✗ Failed!';
    }

    // ========================================
    // ERROR HANDLING
    // ========================================
    let errorMessage = "Configuration failed: ";
    if (err.message.includes("not installed")) {
      errorMessage += "Ollama is not installed. Please install Ollama first.";
    } else if (err.message.includes("timeout") || err.message.includes("TLS handshake")) {
      errorMessage += "Network timeout. This might be due to slow internet connection. The app will automatically retry. If it continues to fail, please check your internet connection and try again later.";
    } else if (err.message.includes("network") || err.message.includes("connection")) {
      errorMessage += "Network error. Please check your internet connection and try again.";
    } else if (err.message.includes("space") || err.message.includes("disk")) {
      errorMessage += "Insufficient disk space. Please free up some space.";
    } else if (err.message.includes("permission")) {
      errorMessage += "Permission denied. Please run as administrator.";
    } else {
      errorMessage += err.message;
    }

    console.error(errorMessage); // Log error

    // Remove progress container after 5 seconds on error
    setTimeout(() => {
      if (progressWrapper) {
        progressWrapper.style.display = 'none';
      }
      if (progressBar) { // Reset for next time
        progressBar.style.width = '0%';
        progressBar.textContent = '';
        progressBar.classList.remove('bg-danger');
      }
    }, 5000);
  }
}


async function downloadDefaultLlmModel(modelName = "smollm:135m") {
  if (!modelName) {
    console.error("Model name is missing or invalid.");
    return;
  }
  try {
    if (window.electronAPI && window.electronAPI.downloadModel) {
      console.log(`Starting download of model: ${modelName}`);
      await window.electronAPI.downloadModel(modelName);
      console.log(`downloaded  model: ${modelName}`);

    } else {
      console.log(`Not able to download model: ${modelName}`);
    }

  } catch (err) {
    console.error("Model download failed:", err);
  }
}


// ===================================================================
// === END OF MODIFIED FUNCTION ===
// ===================================================================

function cancelModelDownload(modelName) {
  const progressContainer = document.getElementById(`progress-${modelName}`);
  if (progressContainer) {
    progressContainer.remove(); // Hide popup
  }
  // Reset main Configure button
  const button = document.querySelector(`[data-model='${modelName}']`) || event?.target;
  if (button) {
    button.disabled = false;
    button.innerHTML = 'Configure';
    button.classList.remove('btn-success');
    button.classList.add('btn-primary');
    button.style.pointerEvents = 'auto';

  }
  showToast(`Download cancelled for ${modelName}`, false);
}


// Handle Make AI Agent button click with trial check
function handleMakeAIAgentClick() {

  var daysElem = document.getElementById("remaining-days-count");
  var days = daysElem ? parseInt(daysElem.innerText, 10) : 0;

  let text = document.getElementById("remaining-days-text").innerText;
  let ValidDays = parseInt(text.match(/\d+/)[0], 10);
  if (ValidDays > 0) {
    days = ValidDays;
  }

  if (isNaN(days) || days <= 0) {
    // Show subscription modal
    var modal = new bootstrap.Modal(
      document.getElementById("subscriptionModal")
    );
    modal.show();
    return;
  }
  // If trial is active, open n8n as before
  //openN8NInApp();
  restartServices(); // restart services before opening n8n & ollama
  showN8NView();
}
// Fetch and render notifications dynamically, order by releaseDate desc
document.addEventListener("DOMContentLoaded", function () {
  var notificationsListContainer = document.getElementById(
    "notifications-list-container"
  );
  if (notificationsListContainer) {
    fetch("https://api.gignaati.com/api/UpcomingUpdate")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (
          data &&
          data.data &&
          Array.isArray(data.data) &&
          data.data.length > 0
        ) {
          // Sort by releaseDate desc
          var sorted = data.data.slice().sort(function (a, b) {
            return new Date(b.releaseDate) - new Date(a.releaseDate);
          });
          notificationsListContainer.innerHTML = sorted
            .map(function (item) {
              var dateStr = "";
              if (item.releaseDate) {
                var d = new Date(item.releaseDate);
                dateStr = d.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
              }
              return `
              <div class="notifications mb-2">
                <h3>${item.title || ""}</h3>
                <p class="time"><b>${dateStr}</b></p>
                ${item.description
                  ? `<div style="font-size: 12px; color: #555; margin-top: 2px;">${item.description}</div>`
                  : ""
                }
              </div>
            `;
            })
            .join("");
        } else {
          notificationsListContainer.innerHTML =
            '<div class="notifications mb-2">No notifications found.</div>';
        }
      })
      .catch(function (err) {
        notificationsListContainer.innerHTML =
          '<div class="notifications mb-2 text-danger">Failed to load notifications.</div>';
      });
  }
});




function loadTemplateCategory() {
  fetch("https://api.gignaati.com/api/Template/templateCategory")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("tamplate-btn-grp");
      container.innerHTML = ""; // clear previous content

      if (data && data.data && data.data.length > 0) {
        data.data.forEach(item => {
          const option = document.createElement("div");
          option.classList.add("drop-down-item");
          option.textContent = item.value;
          option.setAttribute("data-key", item.key);

          option.addEventListener("click", () => {
            document.getElementById("drop-down-btn-text").textContent = item.value;

            reloadTemplateData();
          });

          container.appendChild(option);
        });
      }
    })
    .catch(error => {
      console.error("Error loading categories:", error);
    });
}
document.addEventListener("DOMContentLoaded", loadTemplateCategory);



document.addEventListener("DOMContentLoaded", function () {
  var templateListContainer = document.getElementById("template-list-container");
  var templateSearchBar = document.getElementById("template-search-bar");
  var allTemplates = [];

  // Default template HTML
  function getDefaultTemplateHtml() {
    return `
      <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
        <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='handleMakeAIAgentClick()'>
          <div class="plus">+</div>
          <h2 class="title">Build from Scratch</h2>
          <p>Transform your idea into an AI agent</p>
        </div>
      </div>
    `;
  }

  function renderTemplates(templates) {
    let templatesHtml = getDefaultTemplateHtml(); // always show default first

    if (templates.length > 0) {

      var footerElement = document.getElementById("footer");
      if (footerElement) {
        if (templates.length == 0) {
          footerElement.classList.add("active");
        } else {
          footerElement.classList.remove("active");
        }
      }

      templatesHtml += templates
        .map((tpl, idx) => {
          const imgSrc = tpl.imageUrl
            ? "https://api.gignaati.com" + tpl.imageUrl
            : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

          const tagsHTML = tpl.tags && tpl.tags.length > 0
            ? tpl.tags.map(tag => `<li>${tag}</li>`).join("")
            : "<li></li>";

          return `
            <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
              <div class="tamplate-box">
                <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
                  <img src="${imgSrc}" alt="" style="width:100%; max-height:200px; border-radius:8px;" />
                </div>
                <div class="cap-list mt-3">
                    <ul>
                      ${tagsHTML}
                    </ul>
                   </div>
                <h3>${tpl.name}</h3>
                <p class="picup-line"><i>"${tpl.tagLine}"</i></p>
                <p>${tpl.description || ""}</p>
                <button 
                  type="button" 
                  class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
                  data-json='${tpl.jsonValue
              .replace(/'/g, "&#39;")
              .replace(/"/g, "&quot;")}'
                  id="copy-json-btn-${idx}">
                  Copy
                </button>

               <button type="button" class="btn btn-primary custom-btn custom-btn-white"
    data-bs-toggle="modal" data-bs-target="#previewModal"
    onclick="loadTemplatePreview(${tpl.id}, '${tpl.name?.replace(/'/g, "\\'") || "--"}', '${tpl.tagLine?.replace(/'/g, "\\'") || "--"}')">
    Preview
</button>


              </div>
            </div>
          `;
        })
        .join("");
    } else {
      // Even if no templates found, show default template only (already added)
      templatesHtml += ''; // nothing else to add
    }

    templateListContainer.innerHTML = templatesHtml;

    setTimeout(attachCopyJsonEvents, 100);
  }

  if (templateListContainer) {
    fetch("https://api.gignaati.com/api/Template")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data && data.data && Array.isArray(data.data)) {
          allTemplates = data.data;

          var footerElement = document.getElementById("footer");
          if (footerElement) {
            if (allTemplates.length == 0) {
              footerElement.classList.add("active");
            } else {
              footerElement.classList.remove("active");
            }
          }
          // Initial render with default + all templates
          renderTemplates(allTemplates);

          // Attach search event
          if (templateSearchBar) {
            templateSearchBar.addEventListener("input", function (e) {
              var val = e.target.value.toLowerCase();
              var filtered = allTemplates.filter(function (tpl) {
                return (
                  (tpl.name && tpl.name.toLowerCase().includes(val)) ||
                  (tpl.description &&
                    tpl.description.toLowerCase().includes(val))
                );
              });
              renderTemplates(filtered);
            });
          }
        } else {
          renderTemplates([]); // default template only
        }
      })
      .catch(function (err) {
        renderTemplates([]); // default template only
      });
  }
});

// ===================================================================
// === CONSOLIDATED LLM FUNCTIONS (REFRESH ON CLICK) ===
// ===================================================================

/**
 * Takes a list of LLM models and returns the HTML string to render them.
 */
/**
 * Takes a list of LLM models and returns the HTML string to render them.
 */
function renderLLMCardHTML(models) {
  return models.length > 0
    ? models
      .map(function (llm, idx) {
        var imgSrc =
          llm.imageUrl && llm.imageUrl !== "string"
            ? "https://api.gignaati.com" + llm.imageUrl
            : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

        const tagsHTML = llm.tags && llm.tags.length > 0
          ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
          : "<li></li>";

        // --- NEW: Unique ID for the file input ---
        const fileInputId = `byom-file-${idx}`;

        return `
        <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
          <div class="llm-box">
            <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
              <img src="${imgSrc}" alt="" style="width:100%; max-height:200px; border-radius:8px; " />
            </div>
            <h3>${llm.name || ""}</h3>
            <p>${llm.description || ""}</p>
            <div class="flex-column align-items-start mb-3 why">
              <div style="font-size: 14px; color: #555; margin-top: 2px; font-weight: 500;">Why this model:</div>
              <p style="font-size: 14px;">${llm.useCase}</p>
            </div>
            <div class="cap-list mb-3">
              <ul>
                ${tagsHTML}
              </ul>
            </div>
            <div class="system-info-2" style="display: block;
              background: #e8e8e8;
              padding: 10px 10px;
              border-radius: 9px;">
              <div style="font-size: 14px; color: #555; margin-top: 2px; margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
              <div class="row">
                <div class="col-6 mb-2" style="font-size: 12px;">
                  RAM: ${llm.ram}
                </div>
                <div class="col-6 mb-2" style="font-size: 12px;">
                  GPU: ${llm.gpu}
                </div>
                <div class="col-6 mb-2" style="font-size: 12px;">
                  CPU: ${llm.cpu}
                </div>
                <div class="col-6 mb-2" style="font-size: 12px;">
                  NPU: ${llm.npu}
                </div>
              </div>
            </div>
            <button 
              type="button" 
              class="btn btn-primary custom-btn custom-btn-white" 
              style="margin-top:16px;"
              onclick="downloadLlmModel('${llm.command}')"
            >
              Configure
            </button>

            

            <div class="progress progress-bar-new" style="display: none;">
              <div class="progress-bar progress-bar-striped" role="progressbar" aria-label="Default striped example" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          </div>
        </div>
      `;
      })
      .join("")
    : '<div class="col-12">No models found.</div>';
}

/**
 * Handles the "Bring your own model" modal submission.
 * 1. Reads the path from the modal's text input.
 * 2. Closes the modal.
 * 3. Sends the path to the .NET API as a URL query parameter.
 * 4. Shows a success/error toast and refreshes the model list.
 */
async function handleSubmitModelPath() {
  const input = document.getElementById("byomFolderPathInput");
  const errorDiv = document.getElementById("byomModalError");

  if (!input || !input.value) {
    errorDiv.textContent = "Please paste the folder path first.";
    errorDiv.style.display = "block";
    return;
  }

  const folderPath = input.value.trim();
  errorDiv.style.display = "none"; // Hide error
  clearBuildOwnAgentInput();
  // 1. Close the modal
  try {
    const modalElement = document.getElementById('byomModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance.hide();
  } catch (e) {
    console.error("Could not close modal", e);
  }

  // 2. Show "in-progress" toast
  showToast("Installing model from path... This may take time.", true);

  try {
    // 3. Send the folder path to the .NET API
    //const baseUrl = "http://localhost:5000/api/OllamaProvisioning/insert-models";
    const baseUrl = "http://localhost:5000/api/OllamaProvisioning/insert-models";
    const apiUrl = new URL(baseUrl);
    apiUrl.searchParams.append('folderPath', folderPath); // Add path as query param

    const response = await fetch(apiUrl, {
      method: "GET"
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Server error: ${response.status}`);
    }

    if (result.success) {
      setTimeout(() => {
        showToast(result.message, true); // Show success toast
      }, 3000);
      //showToast(result.message, true); // Show success toast
      refreshLLMTab(); // Refresh the list to show the new model
      input.value = ""; // Clear the input for next time

    } else {
      throw new Error(result.message || "Failed to create model.");
    }

  } catch (err) {
    console.error("Failed to create model from folder:", err);
    showToast(`Error: ${err.message}`, false); // Show error toast
  }
}

/**
 * === MODIFIED: Reads search bar *first*. ===
 * If search bar has text, filters ALL models and resets category to "All".
 * If search bar is empty, filters by the active category.
 */
function filterAndRenderLLMs() {
  const llmListContainer = document.getElementById("llm-list-container");
  if (!llmListContainer) return;

  const searchBar = document.getElementById("llm-search-bar");
  const searchTerm = searchBar ? searchBar.value.toLowerCase() : "";
  let filteredModels = [];

  if (searchTerm !== "") {
    // 1. USER IS SEARCHING: Filter ALL models
    filteredModels = allLLMs.filter(llm =>
      (llm.name && llm.name.toLowerCase().includes(searchTerm)) ||
      (llm.description && llm.description.toLowerCase().includes(searchTerm))
    );

    // 2. (Good UX) Reset category buttons to "All"
    const buttons = document.querySelectorAll("#llm-btn-grp .llm-btn");
    buttons.forEach(b => {
      if (b.textContent === "All") {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

  } else {
    // 1. USER IS NOT SEARCHING: Filter by active category
    const activeButton = document.querySelector("#llm-btn-grp .llm-btn.active");
    const activeCategory = activeButton ? activeButton.textContent : "All";

    filteredModels = (activeCategory === "All")
      ? allLLMs
      : allLLMs.filter(llm => (llm.category || "Uncategorized") === activeCategory);
  }

  // Check footer state
  var footerElement = document.getElementById("footer");
  if (footerElement) {
    if (filteredModels.length == 0) {
      footerElement.classList.add("active");
    } else {
      footerElement.classList.remove("active");
    }
  }

  // Render the final list
  llmListContainer.innerHTML = renderLLMCardHTML(filteredModels);
}


/**
 * Creates the category buttons for the LLM tab with custom sorting.
 */
function renderLLMCategories(models) {
  const container = document.getElementById("llm-btn-grp");
  if (!container) return;

  // Preserve the active category if it exists
  const oldActiveButton = document.querySelector("#llm-btn-grp .llm-btn.active");
  const oldActiveCategory = oldActiveButton ? oldActiveButton.textContent : "All";

  container.innerHTML = ""; // Clear

  // === MODIFIED: Custom sort logic ===
  const order = ['Entry Level', 'Mid Level', 'Advanced Level'];
  const categories = [...new Set(models.map(m => m.category || "Uncategorized"))];

  categories.sort((a, b) => {
    let indexA = order.indexOf(a);
    let indexB = order.indexOf(b);

    if (indexA !== -1 && indexB !== -1) {
      // Both are in the custom order list
      return indexA - indexB;
    } else if (indexA !== -1) {
      // Only 'a' is in the list, 'b' is not. 'a' comes first.
      return -1;
    } else if (indexB !== -1) {
      // Only 'b' is in the list, 'a' is not. 'b' comes first.
      return 1;
    } else {
      // Neither are in the list, sort them alphabetically
      return a.localeCompare(b);
    }
  });
  // === END OF MODIFICATION ===

  // Add "All" button
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.textContent = "All";
  allBtn.classList.add("llm-btn", "custom-btn", "btn", "btn-primary", "me-2");
  if (oldActiveCategory === "All") allBtn.classList.add("active");
  allBtn.addEventListener("click", () => {
    // Clear search bar when a category is clicked
    const searchBar = document.getElementById("llm-search-bar");
    if (searchBar) searchBar.value = "";

    document.querySelectorAll("#llm-btn-grp .llm-btn").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    //filterAndRenderLLMs();
    refreshLLMTab(); // Call refresh instead of filter to get fresh data
  });
  container.appendChild(allBtn);

  // Add other category buttons
  categories.forEach(category => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = category;
    btn.classList.add("llm-btn", "custom-btn", "btn", "btn-primary", "me-2");
    // Re-select the previously active category if it still exists
    if (category === oldActiveCategory) btn.classList.add("active");
    btn.addEventListener("click", () => {
      // Clear search bar when a category is clicked
      const searchBar = document.getElementById("llm-search-bar");
      if (searchBar) searchBar.value = "";

      document.querySelectorAll("#llm-btn-grp .llm-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterAndRenderLLMs();
    });
    container.appendChild(btn);
  });

  // Ensure 'All' is active if the old category no longer exists
  const anyActive = container.querySelector('.llm-btn.active');
  if (!anyActive) {
    allBtn.classList.add('active');
  }
}

/**
 * Fetches latest LLMs and re-renders the tab.
 * Called by `handleTabbutton` every time LLM tab is clicked.
 */
function refreshLLMTab() {
  const llmListContainer = document.getElementById("llm-list-container");
  if (!llmListContainer) return;

  // Show a loading state
  llmListContainer.innerHTML = '<div class="col-12" style="text-align: center;">Loading latest models...</div>';

  fetch("https://api.gignaati.com/api/Template/llmList")
    .then(res => res.json())
    .then(data => {
      if (data && data.data && Array.isArray(data.data)) {
        allLLMs = data.data; // Store latest data globally
        renderLLMCategories(allLLMs); // Re-build categories
        filterAndRenderLLMs(); // Render using new data
      } else {
        allLLMs = []; // Clear old data
        renderLLMCategories(allLLMs); // Render empty categories
        llmListContainer.innerHTML = '<div class="col-12">No models found.</div>';
      }
    })
    .catch(err => {
      console.error("Failed to load LLMs:", err);
      llmListContainer.innerHTML = '<div class="col-12 text-danger">Failed to load models.</div>';
    });
}

function searchedLLMModels(searchParameter) {
  const llmListContainer = document.getElementById("llm-list-container");
  if (!llmListContainer) return;

  // Show a loading state
  llmListContainer.innerHTML = '<div class="col-12" style="text-align: center;">Loading latest models...</div>';

  fetch("https://api.gignaati.com/api/Template/llmList?searchParameter=" + searchParameter)
    .then(res => res.json())
    .then(data => {
      if (data && data.data && Array.isArray(data.data)) {
        allLLMs = data.data; // Store latest data globally
        renderLLMCategories(allLLMs); // Re-build categories
        filterAndRenderLLMs(); // Render using new data
      } else {
        allLLMs = []; // Clear old data
        renderLLMCategories(allLLMs); // Render empty categories
        llmListContainer.innerHTML = '<div class="col-12">Try adding a bit more detail for a better recommendation.</div>';
      }
    })
    .catch(err => {
      console.error("Failed to load LLMs:", err);
      llmListContainer.innerHTML = '<div class="col-12 text-danger">Failed to load models.</div>';
    });
}
// ===================================================================
// === END OF LLM FUNCTIONS ===
// ===================================================================


async function clickToLaunchInstall() {

  const panel = document.getElementById('launch-progress-panel');
  const bar = document.getElementById('launch-progress-bar');
  const text = document.getElementById('launch-progress-text');
  const consoleEl = document.getElementById('launch-console');
  const button = document.querySelector('.install-btn');
  
    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.add("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.remove("active");
    document.getElementById("EarnBtn").classList.remove("active");


  restartServices();  // restart ollama & n8n services before installation
  // 🔹 Console Log Helper
  function logMessage(message, color = "white") {
    const div = document.createElement("div");
    div.style.color = color;
    div.style.marginBottom = "4px";
    div.innerHTML = `${new Date().toLocaleTimeString()}: ${message}`;
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  // 🔹 Progress Update Helper
  function updateProgress(percent, message) {
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.textContent = `${percent}%`;
    }
    if (text) text.textContent = message;
    logMessage(message, "lightgreen");
  }

  // 🔹 Download Button Generator
  function createDownloadButton(label, url) {
    return `<button style="
        background-color: #007bff;
        color: white;
        border: none;
        padding: 3px 10px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 5px;
        font-size: 12px;
      " onclick="openExternalLink('${url}')">${label}</button>`;
  }

  function createBuildButton() {
    return `<button style="
        background-color: #007bff;
        color: white;
        border: none;
        padding: 3px 10px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 5px;
        font-size: 12px;
      " onclick="clickToLaunchInstall()">Build Again</button>`;
  }

  // 🔹 Check Node.js Installation
  async function checkNodeInstallation() {
    updateProgress(5, "Configuring AI Brain integration...");
    updateProgress(10, "Checking Node.js installation...");
    try {
      const res = await fetch("http://localhost:5000/api/OllamaProvisioning/checkNodeInstalled");
      const result = await res.json();

      if (result?.data) {
        updateProgress(35, `✅ ${result.message}`);
        return true;
      } else {
        const button = createDownloadButton("Download Node.js", "https://nodejs.org/en/download");
        logMessage(`❌ ${result.message || "Node.js not found."} ${button}`, "red");
        updateProgress(35);
        return false;
      }
    } catch (err) {
      logMessage(`❌ Error checking Node.js: ${err.message}`, "red");
      return false;
    }
  }

  // 🔹 Check Ollama Installation
  async function checkOllamaInstallation() {
    updateProgress(40, "Checking Ollama installation...");
    try {
      const res = await fetch("http://localhost:5000/api/OllamaProvisioning/checkOllamaInstalled");
      const result = await res.json();

      if (result?.data) {
        updateProgress(70, `✅ ${result.message}`);
        //downloadDefaultLlmModel(); // download default model after ollama is confirmed
        return true;
      } else {
        const button = createDownloadButton("Download Ollama", "https://ollama.com/download");
        const buildButton = createBuildButton();
        logMessage(`❌ ${result.message || "Ollama not found."} ${button}`, "red");
        updateProgress(70, ` ${"After downloading & install Ollama, please click on this button."} ${buildButton}`);
        return false;
      }
    } catch (err) {
      logMessage(`❌ Error checking Ollama: ${err.message}`, "red");
      return false;
    }
  }


  async function checkN8NInstallation() {

    downloadDefaultLlmModel(); // download default model before n8n is confirmed
    updateProgress(75, "Checking N8N installation...");
    let currentProgress = 75;
    let lastStatus = null;
    let pollInterval = null;

    async function pollN8NInstallStatus() {
      try {
        const response = await fetch('http://localhost:5000/api/Provisioning/install-n8n', {
          method: 'GET',
          headers: { accept: 'application/json' }
        });

        const result = await response.json();
        const status = result?.data;
        const message = result?.message || 'Checking installation status...';

        if (result?.error) {
          //updateProgress(currentProgress, `Error: ${result.error}`);
          logMessage(`❌${result.error}`, "red");
          clearInterval(pollInterval);
          return;
        }

        if (status === 'installed') {
          updateProgress(100, 'N8N installed successfully!');
          clearInterval(pollInterval);
          document.getElementById('startJourney').classList.remove('disable-click');

          handleMakeAIAgentClick();
          if (panel) panel.style.display = 'none';
          if (bar) bar.style.display = 'none';
          if (text) text.style.display = 'none';
          if (consoleEl) text.style.display = 'none';

          return;
        }

        if (status === 'In-progress' && status !== lastStatus) {
          currentProgress = Math.min(currentProgress + 5, 95);
          updateProgress(currentProgress, message);
          lastStatus = status;
        }

        if (status === 'started') {
          updateProgress(currentProgress + 2, message);
          lastStatus = status;
        }
      } catch (err) {
        logMessage(`❌${err.message}`, "red");
        clearInterval(pollInterval);
      }
    }

    // Call immediately, then poll every 2 mins
    await pollN8NInstallStatus();
    pollInterval = setInterval(pollN8NInstallStatus, 2 * 60 * 1000);
  }

  // 🔹 Sequential Execution (Dependency Order)
  try {
    if (panel) panel.style.display = "block";
    if (button) button.disabled = true;

    const isNodeInstalled = await checkNodeInstallation();
    if (!isNodeInstalled) {
      //logMessage("⛔ Node.js not installed. Stopping further checks.", "red");
      return;
    }

    const isOllamaInstalled = await checkOllamaInstallation();
    if (!isOllamaInstalled) {
      //logMessage("⛔ Ollama not installed. Stopping further checks.", "red");
      return;
    }

    const isN8nInstalled = await checkN8NInstallation();
    if (!isN8nInstalled) {
      // logMessage("⛔ N8N not installed. Stopping further checks.", "red");
      return;
    }

    //logMessage("🎉 Environment verification completed successfully.", "lightgreen");
    updateProgress(100, "AI Magic added! Setup completed successfully! ✨");


  } catch (error) {
    logMessage(`❌ ${error.message}`, "red");
  } finally {
    if (button) button.disabled = false;
  }
}



const handleTabbutton = (target) => {
  // Recall APIs on every tab click
  if (typeof loadUpcomingUpdate === "function") loadUpcomingUpdate();
  if (typeof loadTemplates === "function") loadTemplates();
  // Note: LLM logic is now handled INSIDE the "LLM" block below

  if (target === "Template") {
    
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "block";
    document.getElementById("chatbot-container").style.display = "none";
    document.getElementById("earn-container").style.display = "none";
    // // tab button
    // document.getElementById("footer").classList.remove("active");
    // document.getElementById("footer").classList.add("active");
    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.add("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.remove("active");
    document.getElementById("EarnBtn").classList.remove("active");

  } else if (target === "Build") {
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    document.getElementById("chatbot-container").style.display = "none";
    document.getElementById("earn-container").style.display = "none";
    // tab button
    document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");

    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn").classList.add("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.remove("active");
    document.getElementById("EarnBtn").classList.remove("active");
    handleMakeAIAgentClick()
  } else if (target === "LLM") {
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "block";
    document.getElementById("tamplate-container").style.display = "none";
    document.getElementById("chatbot-container").style.display = "none";
    document.getElementById("earn-container").style.display = "none";
    // === MODIFIED: Call refresh function every time ===
    refreshLLMTab();

    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.add("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.remove("active");
    document.getElementById("EarnBtn").classList.remove("active");
    // tab button
    document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");


  } else if (target === "AI-Assistant") {
    document.getElementById("chatbot-container").style.display = "block";
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    document.getElementById("earn-container").style.display = "none";

    document.getElementById("Dashboard-btn").classList.remove("active");
    //document.getElementById("Build-btn").classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.add("active");
    document.getElementById("EarnBtn").classList.remove("active");
  }
  else if (target === "Earn") {
    document.getElementById("chatbot-container").style.display = "none";
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    document.getElementById("earn-container").style.display = "block";

    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.remove("active");
    document.getElementById("EarnBtn").classList.add("active");
  }
  else {
    loadVideos();
    // conatiner
    document.getElementById("dashboard-container").style.display = "block";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    document.getElementById("chatbot-container").style.display = "none";
    document.getElementById("earn-container").style.display = "none";

    // tab button
    // document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");



    document.getElementById("Dashboard-btn").classList.add("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
    document.getElementById("AI-AssistantBtn").classList.remove("active");
    document.getElementById("EarnBtn").classList.remove("active");
    //var economicsElement = document.getElementById("economics-container");
    var ideaElement = document.getElementById("idea-container");
    //economicsElement.style.display = "none";
    ideaElement.style.display = "block";


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
  // const brandingContainer = document.getElementById("branding-container");
  const actionFeaturesSetup = document.getElementById("action-features-setup");
  gignaatiWorkBenchContainer.style.display = "none";
  // brandingContainer.style.display = "none";
  actionFeaturesSetup.style.display = "block";
}
function OTPVerify1() {
  const gignaatiWorkBenchContainer = document.getElementById(
    "gignaati-workBench-container"
  );
  //const actionFeaturesSetup = document.getElementById("action-features-setup");
  const footer = document.getElementById("footer");
  gignaatiWorkBenchContainer.style.display = "none";
  footer.classList.remove("active");
  //actionFeaturesSetup.style.display = "block";

  validateAndStartJourney();


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
  var footerElement = document.getElementById("footer");
  nav.style.display = "block";
  profile.style.display = "block";
  actionFeaturesSetup.style.display = "none";
  dashBoardBuildLLmContainer.style.display = "block";
  footerElement.classList.add("active");

}
////////////////////////////////////////////////////

// === New Implementation: Reload APIs when nav buttons clicked ===

// Reload Notifications (Dashboard)
function reloadDashboardData() {
  var notificationsListContainer = document.getElementById(
    "notifications-list-container"
  );
  if (notificationsListContainer) {
    fetch("https://api.gignaati.com/api/UpcomingUpdate")
      .then((res) => res.json())
      .then((data) => {
        if (
          data &&
          data.data &&
          Array.isArray(data.data) &&
          data.data.length > 0
        ) {
          var sorted = data.data
            .slice()
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
          notificationsListContainer.innerHTML = sorted
            .map((item) => {
              var dateStr = "";
              if (item.releaseDate) {
                var d = new Date(item.releaseDate);
                dateStr = d.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
              }
              return `
              <div class="notifications mb-2">
                <h3>${item.title || ""}</h3>
                <p class="time"><b>${dateStr}</b></p>
                ${item.description
                  ? `<div style="font-size: 12px; color: #555; margin-top: 2px;">${item.description}</div>`
                  : ""
                }
              </div>
            `;
            })
            .join("");
        } else {
          notificationsListContainer.innerHTML =
            '<div class="notifications mb-2">No notifications found.</div>';
        }
      })
      .catch(() => {
        notificationsListContainer.innerHTML =
          '<div class="notifications mb-2 text-danger">Failed to load notifications.</div>';
      });
  }
}


function reloadTemplateData() {
  handleTabbutton("Template");
  var dropdownValue = document.getElementById("drop-down-btn-text").textContent;

  var categoryType = "";
  var storedIdeaText = "";
  // var ideaInputElement = document.getElementById("idea-input");
  // var ideaText = ideaInputElement.value;
  // if (ideaText && ideaText.trim() !== '') {
  //   storedIdeaText = ideaText.trim();
  //   ideaInputElement.value = "";
  // }

  if (dropdownValue && dropdownValue !== "Select Category" && dropdownValue !== "All") {
    categoryType = dropdownValue;
  } else if (dropdownValue === "All" || dropdownValue === "Select Category") {
    categoryType = "";
  }
  // var footerForTemplate = document.getElementById("footer");
  // footerForTemplate.classList.remove("active");

  // var dropdownElement = document.getElementById("drop-down-btn-text");
  // dropdownElement.textContent = "Select Category";

  var templateListContainer = document.getElementById("template-list-container");
  // Ensure the Template tab/view is visible when this function is called
  try {
    // var tamplateContainer = document.getElementById("tamplate-container");
    // if (tamplateContainer) tamplateContainer.style.display = "block";
    // // hide other containers
    // var dashboardContainer = document.getElementById("dashboard-container"); if (dashboardContainer) dashboardContainer.style.display = "none";
    // var buildContainer = document.getElementById("build-container"); if (buildContainer) buildContainer.style.display = "none";
    // var llmContainer = document.getElementById("llm-container"); if (llmContainer) llmContainer.style.display = "none";
    // // set nav button active states
    // document.getElementById("Dashboard-btn")?.classList.remove("active");
    // document.getElementById("Build-btn")?.classList.remove("active");
    // document.getElementById("LLM-btn")?.classList.remove("active");
    // document.getElementById("Template-btn")?.classList.add("active");
    // ensure footer is active for this view
    // document.getElementById("footer")?.classList.add("active");


  } catch (e) { /* ignore UI adjustments if elements missing */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reloadTemplateData);
    return;
  }
  if (templateListContainer) {
    let url = "https://api.gignaati.com/api/Template";
    if (storedIdeaText && storedIdeaText.trim() !== '') {
      url = url + "?searchParameter=" + storedIdeaText.trim();
      storedIdeaText = "";
    } else {
      url = url + "?type=" + categoryType;
    }
    //fetch("https://api.gignaati.com/api/Template?type=" + storedIdeaText)
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data && Array.isArray(data.data)) {
          // Static "Create New Agent" card
          var footerElement = document.getElementById("footer");
          var templateList = data.data;
          if (footerElement) {
            if (templateList.length == 0) {
              footerElement.classList.add("active");
            } else {
              footerElement.classList.remove("active");
            }
          }
          //alert("2 " +data.totalRecords);
          document.getElementById("templateCount").innerText = "Templates :" + " " + data.totalRecords;



          const createNewTemplateHTML = `
            <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
              <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='handleMakeAIAgentClick()'>
                <div class="plus">+</div>
                <h2 class="title">Build from Scratch</h2>
                <p>Transform your idea into an AI agent</p>
              </div>
            </div>
          `;

          // Dynamic template cards showN8NView()
          const templateCardsHTML = data.data
            .map((tpl, idx) => {
              const imgSrc = tpl.imageUrl
                ? "https://api.gignaati.com" + tpl.imageUrl
                : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

              const tagsHTML = tpl.tags && tpl.tags.length > 0
                ? tpl.tags.map(tag => `<li>${tag}</li>`).join("")
                : "<li></li>";


              return `
                <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
                  <div class="tamplate-box">
                    <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
                      <img src="${imgSrc}" alt="" style="width:100%; max-height:200px; border-radius:8px;" />
                    </div>
                    <div class="cap-list">
                    <ul>
                      ${tagsHTML}
                    </ul>
                   </div>
                    <h3>${tpl.name}</h3>
                    <p class="picup-line"><i>"${tpl.tagLine}"</i></p>
                    <p>${tpl.description || ""}</p>
                    <button 
                      type="button" 
                      class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
                      data-json='${tpl.jsonValue
                  .replace(/'/g, "&#39;")
                  .replace(/"/g, "&quot;")}'
                      id="copy-json-btn-${idx}">
                      Copy
                    </button>

                    <button type="button" class="btn btn-primary custom-btn custom-btn-white"
    data-bs-toggle="modal" data-bs-target="#previewModal"
    onclick="loadTemplatePreview(${tpl.id}, '${tpl.name?.replace(/'/g, "\\'") || "--"}', '${tpl.tagLine?.replace(/'/g, "\\'") || "--"}')">
    Preview
</button>


                  </div>
                </div>
              `;
            })
            .join("");

          // Combine the static and dynamic HTML
          templateListContainer.innerHTML = createNewTemplateHTML + templateCardsHTML;

          setTimeout(attachCopyJsonEvents, 100);
        } else {

          var ideaText = document.getElementById("idea-input").value;
          ideaText.value = "";
          var footerDiv = document.getElementById("footer");
          footerDiv.classList.add("active");


          //templateListContainer.innerHTML = '<div class="col-12">No templates found.</div>';
          templateListContainer.innerHTML = `
            <div class="col-xl-3 col-lg-3 col-md-4 col-sm-12 col-12 mb-3">
              <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='handleMakeAIAgentClick()'>
                <div class="plus">+</div>
                <h2 class="title">Build from Scratch</h2>
                <p>Transform your idea into an AI agent</p>
              </div>
            </div>
          `;
        }
      })
      .catch((err) => {
        //alert(err.message);
        templateListContainer.innerHTML =
          '<div class="col-12 text-danger">Failed to load templates.</div>';
      });
  }
}


// === Attach to Navbar Buttons ===
document.addEventListener("DOMContentLoaded", () => {
  const dashboardBtn = document.getElementById("Dashboard-btn");
  const buildBtn = document.getElementById("Build-btn");
  const llmBtn = document.getElementById("LLM-btn"); // This button is handled by handleTabbutton
  const templateBtn = document.getElementById("Template-btn");

  // Attach tab click handlers
  if (dashboardBtn) dashboardBtn.addEventListener("click", reloadDashboardData);
  if (templateBtn) templateBtn.addEventListener("click", reloadTemplateData);

  // === MODIFIED: Attach search listener ONCE on load ===
  const llmSearchBar = document.getElementById("llm-search-bar");
  if (llmSearchBar) {
    llmSearchBar.addEventListener("input", filterAndRenderLLMs); // This filters the global 'allLLMs'
  }

  // Load initial data for LLM tab only if it's the default view
  // (Assuming dashboard is the default view, so we don't need to load LLMs here)

  if (buildBtn)
    buildBtn.addEventListener("click", () => {
      // No API call for build tab yet
      console.log("Build tab clicked - no API to reload");
    });
});

async function validateAndStartJourney() {
  try {

    StartJourney();

    document.getElementById("chatBotDiv").style.display = "none";


  } catch (e) {
    showToast("Please complete step 1 & step 2 and try again!", false);
  }
}

// --- Utility: Safe Copy JSON ---
function attachCopyJsonEvents() {
  document.querySelectorAll(".copy-json-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const jsonVal = btn.getAttribute("data-json"); // raw JSON string
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonVal);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = jsonVal;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast("Copied! Add a new workflow and paste the template to start using it instantly. Redirecting...", true);
      //openN8NInApp();
      //showN8NView();
      setTimeout(() => {
        handleMakeAIAgentClick();
      }, 6000);

      setTimeout(() => {
        btn.innerText = "Copy";
      }, 1200);
    });
  });
}


function footerStyle(response) {
  var footerElement = document.getElementById("footer");
  var llmList = response.data;
  if (footerElement) {
    if (llmList.length == 0) {
      footerElement.classList.add("active");
    } else {
      footerElement.classList.remove("active");
    }
  }
}


function DashboardEconomics() {

  if (!validateIdea()) {
    return; // stop if validation fails
  }

  var economicsElement = document.getElementById("economics-container");
  var ideaElement = document.getElementById("idea-container");
  var footerElement = document.getElementById("footer");
  var ideaInput = document.getElementById("idea-input");
  var agentEconomic = document.getElementById("agentEconomic");
  var tokenCostEl = document.getElementById("token-cost");
  var roiEl = document.getElementById("roi-value");
  var hoursSavedEl = document.getElementById("hours-saved");
  var benefitsList = document.getElementById("benefits-list");

  // Read input
  var query = (ideaInput && ideaInput.value) ? ideaInput.value.trim() : "";

  // Static fallback values
  var fallback = {
    benefits: [
      { benefit: "Save 10-15 hours per week on repetitive tasks" },
      { benefit: "Reduce operational costs by 40-60%" },
      { benefit: "Improve response time by 80%" }
    ],
    roi: 255,
    hoursSaved: 15,
    tokenCost: 124,
    idea: "AI Agent"
  };

  // Helper to render economics data
  function renderEconomics(data) {
    try {
      agentEconomic.textContent = (data.idea !== undefined ? data.idea : fallback.idea);
      tokenCostEl.textContent = (data.tokenCost !== undefined ? data.tokenCost : fallback.tokenCost);
      roiEl.textContent = (data.roi !== undefined ? data.roi : fallback.roi) + "%";
      hoursSavedEl.textContent = (data.hoursSaved !== undefined ? data.hoursSaved : fallback.hoursSaved) + "h";

      // Render benefits list
      if (benefitsList) {
        var benefits = Array.isArray(data.benefits) && data.benefits.length ? data.benefits : fallback.benefits;
        benefitsList.innerHTML = benefits
          .map(function (b) {
            var text = b.benefit || b || "";
            return `<li><span></span>${text}</li>`;
          })
          .join("");
      }
    } catch (e) {
      console.error("Error rendering economics:", e);
    }
  }

  // If no query provided, show a toast and do nothing further
  if (!query) {
    if (typeof showToast === 'function') {
      showToast('Please enter your idea before building an agent.', false);
    }
    return;
  }

  // Create or show a small loader inside the idea container while waiting
  var loaderId = "economics-loader";
  var loader = document.getElementById(loaderId);
  if (!loader) {
    loader = document.createElement("div");
    loader.id = loaderId;
    loader.style.cssText = "margin-top:12px; display:flex; align-items:center; gap:8px; font-size:0.95rem; color:#333;";
    loader.innerHTML = '<div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div><span>Generating economics...</span>';
    ideaElement.appendChild(loader);
  } else {
    loader.style.display = "flex";
  }

  // Show a temporary loading state in the target fields
  tokenCostEl.textContent = "...";
  roiEl.textContent = "...";
  hoursSavedEl.textContent = "...";
  benefitsList.innerHTML = '<li>Loading...</li>';

  // Call API
  fetch("https://api.gignaati.com/api/Chat/generate-response", {
    method: "POST",
    headers: {
      accept: "text/plain",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userQuery: query, outputFormat: "string" })
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("API returned status " + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      // Expecting shape: { benefits: [{benefit:...}], roi, hoursSaved, tokenCost }
      renderEconomics(data);
      // hide loader
      if (loader) loader.style.display = "none";
      // Show economics panel and hide idea panel after getting a response
      economicsElement.style.display = "block";
      ideaElement.style.display = "none";
      footerElement.classList.remove("active");
      // Clear the textarea input now that response is received
      //if (ideaInput) ideaInput.value = "";
    })
    .catch(function (err) {
      console.error("DashboardEconomics error:", err);
      // On error, render fallback static data
      renderEconomics(fallback);
      if (loader) loader.style.display = "none";
      // Show economics panel (with fallback) and hide idea panel
      economicsElement.style.display = "block";
      ideaElement.style.display = "none";
      footerElement.classList.remove("active");
      // Clear the textarea input even on error (response received)
      if (ideaInput) ideaInput.value = "";
    });
}

function validateIdea() {
  const ideaInput = document.getElementById("idea-input");
  const errorDiv = document.getElementById("idea-error");

  const text = ideaInput.value.trim();
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

  if (text.length < 10) {
    errorDiv.textContent = "Minimum 10 characters required.";
    return false;
  } else if (text.length > 500) {
    errorDiv.textContent = "Maximum 500 characters allowed.";
    return false;
  } else if (wordCount < 2) {
    // optional: enforce minimum word count
    errorDiv.textContent = "Please write at least 2 words.";
    return false;
  }

  // Clear error if valid
  errorDiv.textContent = "";
  return true;
}


function loadTemplatePreview(templateId, templateName = "--", templateTagline = "--") {

  const apiUrl = `https://api.gignaati.com/api/Template/GetTemplatePreviewById?templateId=${templateId}`;

  fetch(apiUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(response => {
      if (response && response.data) {
        const preview = response.data;

        // Set template name & tagline
        const nameEl = document.getElementById("previewTemplateName");
        const taglineEl = document.getElementById("previewTemplateTagline");
        if (nameEl) nameEl.textContent = templateName || "--";
        if (taglineEl) taglineEl.textContent = `"${templateTagline || "--"}"`;

        // Set video link
        const videoIframe = document.getElementById("previewVideo");
        if (videoIframe && preview.videoLink) {
          videoIframe.src = preview.videoLink.replace(/&amp;/g, "&");
        }

        // Set ROI and Annual Savings
        document.getElementById("roi").textContent = preview.roi || "--";
        document.getElementById("annualSavings").textContent = preview.annualSavings || "--";

        // Set Time Saved
        document.getElementById("dailyTasksHours").textContent = preview.dailyTasksHours || "--";
        document.getElementById("monthlyReportsHours").textContent = preview.monthlyReportsHours || "--";
        document.getElementById("customerSupportHours").textContent = preview.customerSupportHours || "--";

        // Set Benefits
        const benefitsList = document.getElementById("benefitsList");
        if (benefitsList) {
          benefitsList.innerHTML = "";
          if (preview.benefits && preview.benefits.length > 0) {
            preview.benefits.forEach(benefit => {
              const li = document.createElement("li");
              li.textContent = benefit || "--";
              benefitsList.appendChild(li);
            });
          } else {
            const li = document.createElement("li");
            li.textContent = "--";
            benefitsList.appendChild(li);
          }
        }

        // Total hours saved
        document.getElementById("totalHoursSaved").textContent = "500+ hours saved annually";
      } else {
        //showToast("Preview is not available.", false);
      }
    })
    .catch(err => {
      //showToast(`Failed to load preview: ${err.message}`, false);
    });
}

function triggerCtrlR() {
  location.reload(true);
}

document.addEventListener('DOMContentLoaded', () => {
  loadVideos();
});

async function loadVideos() {
  const videoContainer = document.getElementById('video-container-row');
  const apiUrl = 'https://api.gignaati.com/api/Template/getLearnVideo';

  // Show a loading message (using bootstrap-like classes)
  videoContainer.innerHTML = '<p class="col-12" style="text-align: center;">Loading videos...</p>';

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    // Check if the API returned data successfully
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      // Clear the loading message
      videoContainer.innerHTML = '';

      // Loop through each video in the data array
      result.data.forEach(video => {
        // Create elements using your exact structure

        // 1. Create the column div
        const colDiv = document.createElement('div');
        colDiv.className = 'col-xl-3 col-lg-3 col-md-4 col-sm-12 col-12 mb-3';

        // 2. Create the share-box div
        const shareBoxDiv = document.createElement('div');
        shareBoxDiv.className = 'share-box';

        // 3. Create the share-box-video div
        const videoDiv = document.createElement('div');
        videoDiv.className = 'share-box-video';

        // 4. Create the iframe
        const iframe = document.createElement('iframe');
        iframe.className = 'w-100'; // From your original code (assuming w-100 is a valid class, e.g., from Bootstrap)
        // Note: ID "idea-video" is removed to avoid duplicates in a loop
        iframe.src = video.videoLink;
        iframe.title = video.title; // Set title for accessibility
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

        // 5. Create the h3 title
        const titleH3 = document.createElement('h3');
        titleH3.textContent = video.title;

        // 6. Assemble the elements
        videoDiv.appendChild(iframe);
        shareBoxDiv.appendChild(videoDiv);
        shareBoxDiv.appendChild(titleH3);
        colDiv.appendChild(shareBoxDiv);

        // 7. Append the new column to the row container
        videoContainer.appendChild(colDiv);
      });

    } else {
      // Show a message if no videos are found
      videoContainer.innerHTML = '<p class="col-12" style="text-align: center;">No videos found.</p>';
    }

  } catch (error) {
    // Show an error message if the fetch fails
    console.error('Failed to load videos:', error);
    videoContainer.innerHTML = '<p class="col-12" style="text-align: center; color: red;">Error loading videos. Please try again later.</p>';
  }
}


/**
 * Calls the n8n start API on page load and logs the response.
 */
async function startN8nOnLoad() {
  const apiUrl = "http://localhost:5000/api/Provisioning/start-n8n";

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Cache-Control": "no-store"
      }
    });

    if (!response.ok) {
      //throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("n8n start API response:", data.message);
  } catch (error) {
    console.error("Failed to start n8n:", error);
  }
}

window.addEventListener('load', startN8nOnLoad);


async function logoutUser() {
  const emailId = document.querySelector(".email-box input").value;
  const apiUrl = `https://api.gignaati.com/api/User/logout?emailId=${encodeURIComponent(emailId)}`;
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (response.ok) {
      const result = await response.json();
      if (result.data === true) {
        window.location.href = 'index.html';
      } else {
        window.location.href = 'index.html';
      }

    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('An error occurred during logout:', error);
  }
}


async function SuggestionModalSubmit() {
  const input = document.getElementById("SuggestionModalInput");
  const errorDiv = document.getElementById("SuggestionModalError");

  if (!input || !input.value) {
    errorDiv.textContent = "Please write something.";
    errorDiv.style.display = "block";
    return;
  }

  const searchParameter = input.value.trim();
  errorDiv.style.display = "none";

  // 1. Close the modal
  try {
    const modalElement = document.getElementById('SuggestionModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance.hide();
  } catch (e) {
    console.error("Could not close modal", e);
  }
  //showToast("Creating model from path... This may take time.", true);
  searchedLLMModels(searchParameter);
  clearSuggestionInput();
}

function clearSuggestionInput() {
  const inputField = document.getElementById('SuggestionModalInput');
  if (inputField) {
    inputField.value = '';
  }
}
function clearBuildOwnAgentInput() {
  const inputField = document.getElementById('byomFolderPathInput');
  if (inputField) {
    inputField.value = '';
  }
}