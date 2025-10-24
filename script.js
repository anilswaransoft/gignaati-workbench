// // Global function for Configure button
// // function downloadLlmModel(modelName) {
// //   //alert(modelName);

// //   if (!modelName) {
// //     showToast && showToast("Model name is missing or invalid.", false);
// //     return;
// //   }
// //   fetch('http://localhost:5000/api/DownloadLlmModel/download-model', {
// //     method: 'POST',
// //     headers: {
// //       'accept': '*/*',
// //       'Content-Type': 'application/json'
// //     },
// //     body: JSON.stringify(modelName)
// //   })
// //     .then(res => res.json())
// //     .then(data => {
// //       if (typeof showToast === 'function') {
// //         showToast(data.message || "No message from backend.", data.data === true);
// //       } else {
// //         //alert(data.message || "No message from backend.");
// //       }
// //     })
// //     .catch(err => {
// //       if (typeof showToast === 'function') {
// //         showToast("Error: " + err.message, false);
// //       } else {
// //         //alert("Error: " + err.message);
// //       }
// //     });
// // }
// // Handle Make AI Agent button click with trial check

// async function downloadLlmModel(modelName) {
//   // Model name validation - agar model name nahi hai to error show karo
//   if (!modelName) {
//     showToast && showToast("Model name is missing or invalid.", false);
//     return;
//   }

//   // Button ko disable kar do taaki multiple downloads na ho sake
//   // Disable button to prevent multiple simultaneous downloads
//   const button = event?.target;
//   if (button) {
//     button.disabled = true;
//     button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Downloading...';
//     button.style.pointerEvents = 'none';
//   }

//   // ========================================
//   // PROGRESS INDICATOR CREATION
//   // ========================================
//   // Pehle sirf toast messages the, ab ek proper progress bar bhi hai
//   // Previously only toast messages, now there's a proper progress bar too
  
//   // Progress container banate hai jo screen ke top-right mein dikhega
//   // Create progress container that will show in top-right of screen
//   const progressContainer = document.createElement('div');
//   progressContainer.id = `progress-${modelName}`;
//   progressContainer.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     background: white;
//     border: 1px solid #ddd;
//     border-radius: 8px;
//     padding: 15px;
//     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
//     z-index: 10000;
//     min-width: 300px;
//     max-width: 400px;
//   `;
  
//   // Progress bar aur text add karte hai
//   // Add progress bar and text
//   progressContainer.innerHTML = `
//     <div style="display: flex; align-items: center; margin-bottom: 10px;">
//       <span class="spinner-border spinner-border-sm me-2"></span>
//       <strong>Downloading ${modelName}</strong>
//     </div>
//     <div class="progress" style="height: 8px; margin-bottom: 10px;">
//       <div class="progress-bar" role="progressbar" style="width: 0%"></div>
//     </div>
//     <div class="progress-text" style="font-size: 12px; color: #666;">Starting download...</div>
//   `;
  
//   document.body.appendChild(progressContainer);

//   try {
//     // ========================================
//     // MAIN DOWNLOAD LOGIC
//     // ========================================
//     // Pehle sirf API call tha, ab real Ollama download hai
//     // Previously only API call, now it's real Ollama download
    
//     // Electron API check karte hai - agar available hai to real download karenge
//     // Check if Electron API is available for real download
//     if (window.electronAPI && window.electronAPI.downloadModel) {
//       console.log(`Starting real download of model: ${modelName}`);
//       showToast(`Starting download of ${modelName}...`, true);
      
//       // ========================================
//       // PROGRESS TRACKING SETUP
//       // ========================================
//       // Real-time progress tracking ke liye variables
//       // Variables for real-time progress tracking
//       let progressInterval;
//       let lastProgress = 0;
      
//       // Progress handler function - ye har progress update pe call hota hai
//       // Progress handler function - called on every progress update
//       const progressHandler = (event, data) => {
//         if (data.step === 'model-download' && data.model === modelName) {
//           const progress = data.progress || 0;
//           const message = data.message || 'Downloading...';
          
//           // Progress bar update karte hai
//           // Update progress bar
//           const progressBar = progressContainer.querySelector('.progress-bar');
//           const progressText = progressContainer.querySelector('.progress-text');
          
//           if (progressBar) {
//             progressBar.style.width = `${progress}%`;
//             progressBar.setAttribute('aria-valuenow', progress);
//           }
          
//           if (progressText) {
//             progressText.textContent = `${message} (${progress}%)`;
//           }
          
//           // Button text bhi update karte hai
//           // Update button text too
//           if (button) {
//             button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${message} (${progress}%)`;
//           }
          
//           // Har 10% pe toast message show karte hai
//           // Show toast message every 10%
//           if (progress - lastProgress >= 10 || message.includes('success') || message.includes('error')) {
//             showToast(`${message} (${progress}%)`, true);
//             lastProgress = progress;
//           }
//         }
//       };
      
//       // Add progress listener
//       if (window.electronAPI.onProgressUpdate) {
//         window.electronAPI.onProgressUpdate(progressHandler);
//       }
      
//       // Start the actual download
//       await window.electronAPI.downloadModel(modelName);
      
//       // Success
//       if (button) {
//         button.innerHTML = '✓ Downloaded';
//         button.classList.remove('btn-primary');
//         button.classList.add('btn-success');
//         button.style.pointerEvents = 'auto';
//       }
      
//       // Update progress container to show success
//       const progressBar = progressContainer.querySelector('.progress-bar');
//       const progressText = progressContainer.querySelector('.progress-text');
//       const spinner = progressContainer.querySelector('.spinner-border');
      
//       if (progressBar) {
//         progressBar.style.width = '100%';
//         progressBar.classList.add('bg-success');
//       }
      
//       if (progressText) {
//         progressText.textContent = `Successfully downloaded ${modelName}!`;
//         progressText.style.color = '#28a745';
//       }
      
//       if (spinner) {
//         spinner.className = 'me-2';
//         spinner.innerHTML = '✓';
//         spinner.style.color = '#28a745';
//       }
      
//       showToast(`Successfully downloaded ${modelName}!`, true);
      
//       // Remove progress container after 3 seconds
//       setTimeout(() => {
//         if (progressContainer && progressContainer.parentNode) {
//           progressContainer.parentNode.removeChild(progressContainer);
//         }
//       }, 3000);
      
//       // Remove progress listener
//       if (window.electronAPI.removeProgressListener) {
//         window.electronAPI.removeProgressListener(progressHandler);
//       }
      
//     } else {
//       // Fallback: Try to download using Node.js child_process (if available)
//       throw new Error("Electron API not available. Please run this application in Electron environment for model downloads.");
//     }
    
//   } catch (err) {
//     console.error("Model download failed:", err);
    
//     // Reset button state on error
//     if (button) {
//       button.disabled = false;
//       button.innerHTML = 'Configure';
//       button.classList.remove('btn-success');
//       button.classList.add('btn-primary');
//       button.style.pointerEvents = 'auto';
//     }
    
//     // Update progress container to show error
//     const progressBar = progressContainer.querySelector('.progress-bar');
//     const progressText = progressContainer.querySelector('.progress-text');
//     const spinner = progressContainer.querySelector('.spinner-border');
    
//     if (progressBar) {
//       progressBar.classList.add('bg-danger');
//     }
    
//     if (progressText) {
//       progressText.textContent = 'Download failed!';
//       progressText.style.color = '#dc3545';
//     }
    
//     if (spinner) {
//       spinner.className = 'me-2';
//       spinner.innerHTML = '✗';
//       spinner.style.color = '#dc3545';
//     }
    
//     // Different messages for different types of errors
//     let errorMessage = "Download failed: ";
//     if (err.message.includes("not installed")) {
//       errorMessage += "Ollama is not installed. Please install Ollama first.";
//     } else if (err.message.includes("timeout") || err.message.includes("TLS handshake")) {
//       // NEW: Network timeout handling with retry information
//       errorMessage += "Network timeout. This might be due to slow internet connection. The app will automatically retry. If it continues to fail, please check your internet connection and try again later.";
//     } else if (err.message.includes("network") || err.message.includes("connection")) {
//       errorMessage += "Network error. Please check your internet connection and try again.";
//     } else if (err.message.includes("space") || err.message.includes("disk")) {
//       errorMessage += "Insufficient disk space. Please free up some space.";
//     } else if (err.message.includes("permission")) {
//       errorMessage += "Permission denied. Please run as administrator.";
//     } else {
//       errorMessage += err.message;
//     }
    
//     showToast(errorMessage, false);
    
//     // Remove progress container after 5 seconds on error
//     setTimeout(() => {
//       if (progressContainer && progressContainer.parentNode) {
//         progressContainer.parentNode.removeChild(progressContainer);
//       }
//     }, 5000);
//   }
// }
// // Handle Make AI Agent button click with trial check



// function handleMakeAIAgentClick() {
//   var daysElem = document.getElementById("remaining-days-count");
//   var days = daysElem ? parseInt(daysElem.innerText, 10) : 0;

//   let text = document.getElementById("remaining-days-text").innerText;
//   let ValidDays = parseInt(text.match(/\d+/)[0], 10);
//   if (ValidDays > 0) {
//     days = ValidDays;
//   }

//   if (isNaN(days) || days <= 0) {
//     // Show subscription modal
//     var modal = new bootstrap.Modal(
//       document.getElementById("subscriptionModal")
//     );
//     modal.show();
//     return;
//   }
//   // If trial is active, open n8n as before
//   openN8NInApp();
// }
// // Fetch and render notifications dynamically, order by releaseDate desc
// document.addEventListener("DOMContentLoaded", function () {
//   var notificationsListContainer = document.getElementById(
//     "notifications-list-container"
//   );
//   if (notificationsListContainer) {
//     fetch("https://api.gignaati.com/api/UpcomingUpdate")
//       .then(function (response) {
//         return response.json();
//       })
//       .then(function (data) {
//         if (
//           data &&
//           data.data &&
//           Array.isArray(data.data) &&
//           data.data.length > 0
//         ) {
//           // Sort by releaseDate desc
//           var sorted = data.data.slice().sort(function (a, b) {
//             return new Date(b.releaseDate) - new Date(a.releaseDate);
//           });
//           notificationsListContainer.innerHTML = sorted
//             .map(function (item) {
//               var dateStr = "";
//               if (item.releaseDate) {
//                 var d = new Date(item.releaseDate);
//                 dateStr = d.toLocaleDateString(undefined, {
//                   year: "numeric",
//                   month: "short",
//                   day: "numeric",
//                 });
//               }
//               return `
//               <div class="notifications mb-2">
//                 <h3>${item.title || ""}</h3>
//                 <p class="time"><b>${dateStr}</b></p>
//                 ${item.description
//                   ? `<div style="font-size: 12px; color: #555; margin-top: 2px;">${item.description}</div>`
//                   : ""
//                 }
//               </div>
//             `;
//             })
//             .join("");
//         } else {
//           notificationsListContainer.innerHTML =
//             '<div class="notifications mb-2">No notifications found.</div>';
//         }
//       })
//       .catch(function (err) {
//         notificationsListContainer.innerHTML =
//           '<div class="notifications mb-2 text-danger">Failed to load notifications.</div>';
//       });
//   }
// });
// // Fetch and render Templates card dynamically, enable Copy Json
// // document.addEventListener('DOMContentLoaded', function () {
// //   var templateListContainer = document.getElementById('template-list-container');
// //   if (templateListContainer) {
// //     fetch('https://api.gignaati.com/api/Template')
// //       .then(function (response) { return response.json(); })
// //       .then(function (data) {
// //         if (data && data.data && Array.isArray(data.data)) {
// //           templateListContainer.innerHTML = data.data.map(function (tpl, idx) {
// //             var imgSrc = 'https://api.gignaati.com' + tpl.imageUrl || 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300';
// //             // Use a hidden textarea to store the full JSON for each card
// //             return `
// //               <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
// //                 <div class="tamplate-box">
// //                   <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
// //                     <img src="${imgSrc}" alt="" style="max-width:100%; max-height:120px; border-radius:8px; object-fit:cover;" />
// //                   </div>
// //                   <h3>${tpl.name}</h3>
// //                   <p>${tpl.description || ''}</p>
// //                   <textarea id="json-value-${idx}" style="display:none;">${tpl.jsonValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
// //                   <button type="button" class="btn btn-primary custom-btn custom-btn-white copy-json-btn" data-idx="${idx}" id="copy-json-btn-${idx}">Copy Json</button>
// //                 </div>
// //               </div>
// //             `;
// //           }).join('');
// //           setTimeout(function() {
// //             var copyBtns = document.querySelectorAll('.copy-json-btn');
// //             copyBtns.forEach(function(btn) {
// //               btn.addEventListener('click', function() {
// //                 var idx = btn.getAttribute('data-idx');
// //                 var textarea = document.getElementById('json-value-' + idx);
// //                 if (textarea) {
// //                   textarea.style.display = 'block';
// //                   textarea.select();
// //                   try {
// //                     document.execCommand('copy');
// //                   } catch (e) {
// //                     // fallback for clipboard API
// //                     if (navigator.clipboard) {
// //                       navigator.clipboard.writeText(textarea.value);
// //                     }
// //                   }
// //                   textarea.style.display = 'none';
// //                   btn.innerText = 'Copied!';
// //                   setTimeout(function() { btn.innerText = 'Copy Json'; }, 1200);
// //                 }
// //               });
// //             });
// //           }, 100);

// //         } else {
// //           templateListContainer.innerHTML = '<div class="col-12">No templates found.</div>';
// //         }
// //       })
// //       .catch(function (err) {
// //         templateListContainer.innerHTML = '<div class="col-12 text-danger">Failed to load templates.</div>';
// //       });
// //   }
// // });

// function loadTemplateCategory() {
//   fetch("https://api.gignaati.com/api/Template/templateCategory")
//     .then(response => response.json())
//     .then(data => {
//       const container = document.getElementById("tamplate-btn-grp");
//       container.innerHTML = ""; // clear previous content

//       if (data && data.data && data.data.length > 0) {
//         data.data.forEach(item => {
//           const option = document.createElement("div");
//           option.classList.add("drop-down-item");
//           option.textContent = item.value;
//           option.setAttribute("data-key", item.key);

//           option.addEventListener("click", () => {
//             document.getElementById("drop-down-btn-text").textContent = item.value;

//             reloadTemplateData();
//           });

//           container.appendChild(option);
//         });
//       }
//     })
//     .catch(error => {
//       console.error("Error loading categories:", error);
//     });
// }
// document.addEventListener("DOMContentLoaded", loadTemplateCategory);


// // Fetch and render Templates card dynamically, enable Copy Json
// // document.addEventListener("DOMContentLoaded", function () {
// //   var templateListContainer = document.getElementById(
// //     "template-list-container"
// //   );
// //   var templateSearchBar = document.getElementById("template-search-bar");
// //   var allTemplates = [];

// //   function renderTemplates(templates) {
// //     templateListContainer.innerHTML =
// //       templates.length > 0
// //         ? templates
// //           .map((tpl, idx) => {
// //             const imgSrc = tpl.imageUrl
// //               ? "https://api.gignaati.com" + tpl.imageUrl
// //               : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";
// //             return `
// //       <div class="col-xl-3 col-lg-3 col-md-6 col-sm-12 col-12 mb-3">
// //         <div class="tamplate-box">
// //           <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
// //             <img src="${imgSrc}" alt="" style="width:100%; max-height:120px; border-radius:8px;" />
// //           </div>
// //           <h3>${tpl.name}</h3>
// //           <p>${tpl.description || ""}</p>
// //           <button 
// //             type="button" 
// //             class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
// //             data-json='${tpl.jsonValue
// //                 .replace(/'/g, "&#39;")
// //                 .replace(/"/g, "&quot;")}'
// //             id="copy-json-btn-${idx}">
// //             Copy Json
// //           </button>
// //         </div>
// //       </div>
// //     `;
// //           })
// //           .join("")
// //         : '<div class="col-12">No templates found.</div>';

// //     setTimeout(attachCopyJsonEvents, 100);
// //   }

// //   if (templateListContainer) {
// //     fetch("https://api.gignaati.com/api/Template")
// //       .then(function (response) {
// //         return response.json();
// //       })
// //       .then(function (data) {
// //         if (data && data.data && Array.isArray(data.data)) {

// //           if (templateSearchBar) {
// //             templateSearchBar.addEventListener("input", function (e) {
// //               var val = e.target.value.toLowerCase();
// //               var filtered = allTemplates.filter(function (tpl) {
// //                 return (
// //                   (tpl.name && tpl.name.toLowerCase().includes(val)) ||
// //                   (tpl.description &&
// //                     tpl.description.toLowerCase().includes(val))
// //                 );
// //               });
// //               renderTemplates(filtered);
// //             });
// //           }
// //         } else {
// //           renderTemplates([]);
// //         }
// //       })
// //       .catch(function (err) {
// //         renderTemplates([]);
// //       });
// //   }
// // });

// // document.addEventListener("DOMContentLoaded", function () {
// //   var templateListContainer = document.getElementById("template-list-container");
// //   var templateSearchBar = document.getElementById("template-search-bar");
// //   var allTemplates = [];

// //   function renderTemplates(templates) {
// //     templateListContainer.innerHTML =
// //       templates.length > 0
// //         ? templates
// //             .map((tpl, idx) => {
// //               const imgSrc = tpl.imageUrl
// //                 ? "https://api.gignaati.com" + tpl.imageUrl
// //                 : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";
// //               return `
// //       <div class="col-xl-3 col-lg-3 col-md-6 col-sm-12 col-12 mb-3">
// //         <div class="tamplate-box">
// //           <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
// //             <img src="${imgSrc}" alt="" style="width:100%; max-height:120px; border-radius:8px;" />
// //           </div>
// //           <h3>${tpl.name}</h3>
// //           <p>${tpl.description || ""}</p>
// //           <button 
// //             type="button" 
// //             class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
// //             data-json='${tpl.jsonValue
// //               .replace(/'/g, "&#39;")
// //               .replace(/"/g, "&quot;")}'
// //             id="copy-json-btn-${idx}">
// //             Copy Json
// //           </button>
// //         </div>
// //       </div>
// //     `;
// //             })
// //             .join("")
// //         : '<div class="col-12">No templates found.</div>';

// //     setTimeout(attachCopyJsonEvents, 100);
// //   }

// //   if (templateListContainer) {
// //     fetch("https://api.gignaati.com/api/Template")
// //       .then(function (response) {
// //         return response.json();
// //       })
// //       .then(function (data) {
// //         if (data && data.data && Array.isArray(data.data)) {
// //           // ✅ Store fetched templates in allTemplates
// //           allTemplates = data.data;

// //           // Render initially
// //           renderTemplates(allTemplates);

// //           // Attach search event
// //           if (templateSearchBar) {
// //             templateSearchBar.addEventListener("input", function (e) {
// //               var val = e.target.value.toLowerCase();
// //               var filtered = allTemplates.filter(function (tpl) {
// //                 return (
// //                   (tpl.name && tpl.name.toLowerCase().includes(val)) ||
// //                   (tpl.description &&
// //                     tpl.description.toLowerCase().includes(val))
// //                 );
// //               });
// //               renderTemplates(filtered);
// //             });
// //           }
// //         } else {
// //           renderTemplates([]);
// //         }
// //       })
// //       .catch(function (err) {
// //         renderTemplates([]);
// //       });
// //   }
// // });
// document.addEventListener("DOMContentLoaded", function () {
//   var templateListContainer = document.getElementById("template-list-container");
//   var templateSearchBar = document.getElementById("template-search-bar");
//   var allTemplates = [];

//   // Default template HTML
//   function getDefaultTemplateHtml() {
//     return `
//       <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
//         <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='openN8NInApp()'>
//           <div class="plus">+</div>
//           <h2 class="title">Build from Scratch</h2>
//           <p>Transform your idea into an AI agent</p>
//         </div>
//       </div>
//     `;
//   }

//   function renderTemplates(templates) {
//     let templatesHtml = getDefaultTemplateHtml(); // always show default first

//     if (templates.length > 0) {

//       var footerElement = document.getElementById("footer");
//       if (footerElement) {
//         if (templates.length == 0) {
//           footerElement.classList.add("active");
//         } else {
//           footerElement.classList.remove("active");
//         }
//       }

//       templatesHtml += templates
//         .map((tpl, idx) => {
//           const imgSrc = tpl.imageUrl
//             ? "https://api.gignaati.com" + tpl.imageUrl
//             : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

//           const tagsHTML = tpl.tags && tpl.tags.length > 0
//             ? tpl.tags.map(tag => `<li>${tag}</li>`).join("")
//             : "<li></li>";

//           return `
//             <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
//               <div class="tamplate-box">
//                 <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//                   <img src="${imgSrc}" alt="" style="width:100%; max-height:200px; border-radius:8px;" />
//                 </div>
//                 <div class="cap-list mt-3">
//                     <ul>
//                       ${tagsHTML}
//                     </ul>
//                    </div>
//                 <h3>${tpl.name}</h3>
//                 <p class="picup-line"><i>"${tpl.tagLine}"</i></p>
//                 <p>${tpl.description || ""}</p>
//                 <button 
//                   type="button" 
//                   class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
//                   data-json='${tpl.jsonValue
//               .replace(/'/g, "&#39;")
//               .replace(/"/g, "&quot;")}'
//                   id="copy-json-btn-${idx}">
//                   Build Now
//                 </button>

//                <button type="button" class="btn btn-primary custom-btn custom-btn-white"
//     data-bs-toggle="modal" data-bs-target="#previewModal"
//     onclick="loadTemplatePreview(${tpl.id}, '${tpl.name?.replace(/'/g, "\\'") || "--"}', '${tpl.tagLine?.replace(/'/g, "\\'") || "--"}')">
//     Preview
// </button>


//               </div>
//             </div>
//           `;
//         })
//         .join("");
//     } else {
//       // Even if no templates found, show default template only (already added)
//       templatesHtml += ''; // nothing else to add
//     }

//     templateListContainer.innerHTML = templatesHtml;

//     setTimeout(attachCopyJsonEvents, 100);
//   }

//   if (templateListContainer) {
//     fetch("https://api.gignaati.com/api/Template")
//       .then(function (response) {
//         return response.json();
//       })
//       .then(function (data) {
//         if (data && data.data && Array.isArray(data.data)) {
//           allTemplates = data.data;

//           var footerElement = document.getElementById("footer");
//           if (footerElement) {
//             if (allTemplates.length == 0) {
//               footerElement.classList.add("active");
//             } else {
//               footerElement.classList.remove("active");
//             }
//           }
//           // Initial render with default + all templates
//           renderTemplates(allTemplates);

//           // Attach search event
//           if (templateSearchBar) {
//             templateSearchBar.addEventListener("input", function (e) {
//               var val = e.target.value.toLowerCase();
//               var filtered = allTemplates.filter(function (tpl) {
//                 return (
//                   (tpl.name && tpl.name.toLowerCase().includes(val)) ||
//                   (tpl.description &&
//                     tpl.description.toLowerCase().includes(val))
//                 );
//               });
//               renderTemplates(filtered);
//             });
//           }
//         } else {
//           renderTemplates([]); // default template only
//         }
//       })
//       .catch(function (err) {
//         renderTemplates([]); // default template only
//       });
//   }
// });


// function renderLLMsButton(models) {
//   const container = document.getElementById("llm-btn-grp");
//   if (!container) {
//     console.error("Container not found!");
//     return;
//   }
//   container.innerHTML = ""; // Clear existing buttons
//   // Create a Set to track unique categories
//   const seenCategories = new Set();
//   models.forEach((model, idx) => {
//     const category = model.category || `Model ${idx + 1}`;

//     // Skip duplicates
//     if (seenCategories.has(category)) return;

//     seenCategories.add(category);

//     const btn = document.createElement("button");
//     btn.type = "button";
//     btn.textContent = category; // Set button text
//     btn.id = `llm-btn-${idx}`; // Unique ID
//     // btn.classList.add("llm-btn");
//     // btn.classList.add("custom-btn");
//     // btn.classList.add("btn");
//     // btn.classList.add("btn-primary");
//     // btn.classList.add("me-2");
//     btn.classList.add("llm-btn", "custom-btn", "btn", "btn-primary", "me-2");
//     // btn.addEventListener("click", () => {
//     //   categoryLLMData(category);
//     // });
//     btn.addEventListener("click", () => {
//       // remove active from all
//       document.querySelectorAll("#llm-btn-grp .llm-btn").forEach(b => {
//         b.classList.remove("active");
//       });
//       // add active to clicked
//       btn.classList.add("active");

//       // call your function
//       categoryLLMData(category);
//     });

//     container.appendChild(btn);
//   });

// }

// function categoryLLMData(str) {
//   var llmListContainer = document.getElementById("llm-list-container");
//   if (llmListContainer) {
//     // fetch(`https://api.gignaati.com/api/Template/llmList?type=${str}`)
//     fetch(`https://api.gignaati.com/api/Template/llmList`)
//       .then((res) => res.json())
//       .then((data) => {
//         if (data && data.data && Array.isArray(data.data)) {
//           llmListContainer.innerHTML = data.data
//             .filter((curELe, index) => {
//               return curELe.category === str;
//             })
//             .map((llm, idx) => {
//               var imgSrc =
//                 llm.imageUrl && llm.imageUrl !== "string"
//                   ? "https://api.gignaati.com" + llm.imageUrl
//                   : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

//               const tagsHTML = llm.tags && llm.tags.length > 0
//                 ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
//                 : "<li></li>";

//               return `
//               <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
//                 <div class="llm-box">
//                   <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//                     <img src="${imgSrc}" alt="" 
//                          style="width:100%; max-height:200px; border-radius:8px; " />
//                   </div>
//                   <h3>${llm.name || ""}</h3>
//                   <p>${llm.description || ""}</p>
//                          <div class="flex-column align-items-start mb-3 why">
//                 <div style="font-size: 14px; color: #555; margin-top: 2px; font-weight: 500;">Why this model:</div>
//                 <p style="font-size: 14px;">${llm.useCase}</p>
//               </div>
//                  <div class="cap-list mb-3">
//                     <ul>
//                      ${tagsHTML}
//                     </ul>
//                    </div>
//              <div class="system-info-2" style="display: block;
//     background: #e8e8e8;
//     padding: 10px 10px;
//     border-radius: 9px;">
//               <div style="font-size: 14px; color: #555; margin-top: 2px;     margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
//            <div class="row">
//               <div class="col-6 mb-2" style="font-size: 12px;">
// RAM: ${llm.ram}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// GPU: ${llm.gpu}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// CPU: ${llm.cpu}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// NPU: ${llm.npu}
//               </div></div>
//               </div>
           
//                   <button 
//                     type="button" 
//                     class="btn btn-primary custom-btn custom-btn-white" 
//                     style="margin-top:16px;"
//                     onclick="downloadLlmModel('${llm.command}')"
//                   >
//                     Configure
//                   </button>
//                 </div>
//               </div>
//             `;
//             })
//             .join("");
//         } else {
//           llmListContainer.innerHTML =
//             '<div class="col-12">No models found.</div>';
//         }
//       })
//       .catch(() => {
//         llmListContainer.innerHTML =
//           '<div class="col-12 text-danger">Failed to load models.</div>';
//       });
//   }
// }

// // Fetch and render LLM list in Language Models card
// document.addEventListener("DOMContentLoaded", function () {
//   var llmListContainer = document.getElementById("llm-list-container");
//   var llmSearchBar = document.getElementById("llm-search-bar");
//   var allLLMs = [];

//   function renderLLMs(models) {
//     llmListContainer.innerHTML =
//       models.length > 0
//         ? models
//           .map(function (llm, idx) {
//             var imgSrc =
//               llm.imageUrl && llm.imageUrl !== "string"
//                 ? "https://api.gignaati.com" + llm.imageUrl
//                 : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

//             const tagsHTML = llm.tags && llm.tags.length > 0
//               ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
//               : "<li></li>";


//             return `
//         <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
//           <div class="llm-box">
//             <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//               <img src="${imgSrc}" alt="" style="width:100%; max-height:200px; border-radius:8px; " />
//             </div>
//             <h3>${llm.name || ""}</h3>
//             <p>${llm.description || ""}</p>
//                     <div class="flex-column align-items-start mb-3 why">
//                 <div style="font-size: 14px; color: #555; margin-top: 2px; font-weight: 500;">Why this model:</div>
//                 <p style="font-size: 14px;">${llm.useCase}</p>
//               </div>
//                  <div class="cap-list mb-3">
//                     <ul>
//                       ${tagsHTML}
//                     </ul>
//                    </div>
//              <div class="system-info-2" style="display: block;
//     background: #e8e8e8;
//     padding: 10px 10px;
//     border-radius: 9px;">
//               <div style="font-size: 14px; color: #555; margin-top: 2px;     margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
//            <div class="row">
//               <div class="col-6 mb-2" style="font-size: 12px;">
// RAM: ${llm.ram}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// GPU: ${llm.gpu}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// CPU: ${llm.cpu}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// NPU: ${llm.npu}
//               </div></div>
//               </div>
           
//                   <button 
//                     type="button" 
//                     class="btn btn-primary custom-btn custom-btn-white" 
//                     style="margin-top:16px;"
//                     onclick="downloadLlmModel('${llm.command}')"
//                   >
//                     Configure
//                   </button>
          
//             </div>
//         </div>
//       `;
//           })
//           .join("")
//         : '<div class="col-12">No models found.</div>';
//   }
//   //<button type="button" class="btn btn-primary custom-btn custom-btn-white" style="margin-top:16px;">Configure</button>


//   if (llmListContainer) {
//     fetch("https://api.gignaati.com/api/Template/llmList?type=Chat")
//       .then(function (response) {
//         return response.json();
//       })
//       .then(function (data) {
//         if (data && data.data && Array.isArray(data.data)) {
//           // allLLMs = data.data;

//           // renderLLMsButton(allLLMs);

//           // 🔹 Step 2: Call the second API here
//           fetch("https://api.gignaati.com/api/Template/llmList")
//             .then(function (res) {
//               return res.json();
//             })
//             .then(function (newApi) {
//               if (newApi && newApi.data && Array.isArray(newApi.data)) {
//                 // 🔹 Step 3: Pass newApi.data to renderLLMsButton
//                 allLLMs = newApi.data;
//                 renderLLMs(allLLMs);
//                 renderLLMsButton(newApi.data);
//               } else {
//                 renderLLMsButton([]);
//               }
//             })
//             .catch(function (err) {
//               renderLLMsButton([]);
//             });

//           if (llmSearchBar) {
//             llmSearchBar.addEventListener("input", function (e) {
//               var val = e.target.value.toLowerCase();
//               var filtered = allLLMs.filter(function (llm) {
//                 return (
//                   (llm.name && llm.name.toLowerCase().includes(val)) ||
//                   (llm.description &&
//                     llm.description.toLowerCase().includes(val))
//                 );
//               });
//               // ⭐ Get the footer element
//               var footerElement = document.getElementById("footer");
//               var llmList = filtered; // Store the list for length check
//               if (footerElement) {
//                 if (llmList.length == 0) {
//                   footerElement.classList.add("active");
//                 } else {
//                   footerElement.classList.remove("active");
//                 }
//               }
//               renderLLMs(filtered);
//             });
//           }
//         } else {
//           renderLLMs([]);
//         }
//       })
//       .catch(function (err) {
//         renderLLMs([]);
//       });
//   }
// });



// // // Setup card click handlers for Docker, n8n, and Ollama
// // document.addEventListener("DOMContentLoaded", function () {
// //   var dockerBox = document.getElementById("docker-setup-box");
// //   var n8nBox = document.getElementById("n8n-setup-box");
// //   var ollamaBox = document.getElementById("ollama-setup-box");
  
// //   if (n8nBox) {
// //     alert();
// //     const systeminfo = document.getElementById("system-info");
// //     systeminfo.style.display = "block";
// //   }
  
// // });

// // function handleProvisioning(loaderId, resultId, apiUrl, label) {
// //   var loader = document.getElementById(loaderId);
// //   var result = document.getElementById(resultId);
// //   var dockerManualButton = document.getElementById('dockerManualButton');


// //   if (!loader || !result) return;
// //   result.style.display = "none";
// //   loader.style.display = "block";
// //   fetch(apiUrl, {
// //     method: "GET",
// //     headers: {
// //       "Content-Type": "application/json",
// //     },
// //   })
// //     .then(function (response) {
// //       return response.json();
// //     })
// //     .then(function (data) {
// //       // If Docker was just installed, try to open Docker Desktop before showing result
// //       if (
// //         label === "Docker" &&
// //         data.success &&
// //         window.electronAPI &&
// //         window.electronAPI.openDockerDesktop
// //       ) {
// //         window.electronAPI.openDockerDesktop();
// //       }
// //       loader.style.display = "none";
// //       result.style.display = "block";
// //       if (data.success) {

// //         const systeminfo = document.getElementById("system-info");
// //         document.getElementById("n8n-setup-box").classList.remove('disable-click');
// //         if (label === "n8n") {
// //           document.getElementById("startJourney").classList.remove('disable-click');
// //         }

// //         systeminfo.style.display = "block";
// //         result.innerHTML =
// //           '<span style="color:green; font-size: 12px">' +
// //           data.message +
// //           "</span>";
// //       } else {

// //         if (label === "Docker") {
// //           //dockerManualButton.style.display = "block";
// //           document.getElementById("dockerManualButton").classList.remove('disable-click');
// //         }

// //         // if (label === "n8n") {
// //         //   alert("remove this code");
// //         //   document.getElementById("startJourney").classList.remove('disable-click');
// //         // }


// //         if (data.message && data.message.toLowerCase().includes("task")) {
// //           alert();
// //           data.message = "Your internet connection is not stable. Please try again.";

// //         }

// //         result.innerHTML =
// //           '<span style="color:red; font-size: 12px">' +
// //           (data.message || "Failed to install " + label + ".") +
// //           "</span>";
// //       }
// //     })
// //     .catch(function (err) {
      
// //       if (label === "Docker") {
// //         // dockerManualButton.style.display = "block";
// //           document.getElementById("dockerManualButton").classList.remove('disable-click');
// //       }

// //       loader.style.display = "none";
// //       result.style.display = "block";
// //       if (label === "Docker") {
// //         //dockerManualButton.style.display = "block";
// //         document.getElementById("dockerManualButton").classList.remove('disable-click');

// //         result.innerHTML =
// //           '<span style="color:red;">Your internet connection is not stable. Please try again or set up manually.</span>';

// //       } else {
// //         // Log the error and show a non-blocking message in the UI
// //         console.error('Provisioning fetch error for', label, err);
// //         try { if (typeof showToast === 'function') showToast('Error: ' + (err && err.message ? err.message : 'Failed to connect'), false); } catch (e) {}

// //         result.innerHTML =
// //           '<span style="color:red;">Your internet connection is not stable. Please try again.</span>';
// //       }


// //     });
// // }

// // Click-to-Launch: install/start Ollama and N8N showing inline progress and console
// async function clickToLaunchInstall() {
//   const systeminfo = document.getElementById("system-info");
//   systeminfo.style.display = "block";
//   // Start the system monitoring when clicking Launch
//   if (window.startSystemMonitoring) {
//     startSystemMonitoring();
//   }
  
//   const panel = document.getElementById('launch-progress-panel');
//   const bar = document.getElementById('launch-progress-bar');
//   const text = document.getElementById('launch-progress-text');
//   const consoleEl = document.getElementById('launch-console');
//   const button = document.querySelector('.install-btn');

//   // Helper to update UI
//   function updateProgress(percent, message) {
//     if (bar) {
//       bar.style.width = `${percent}%`;
//       bar.textContent = `${percent}%`;
//     }
//     if (text) {
//       text.textContent = message;
//     }
//     if (consoleEl) {
//       const div = document.createElement('div');
//       div.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
//       consoleEl.appendChild(div);
//       consoleEl.scrollTop = consoleEl.scrollHeight;
//     }
//   }

//   try {
//     // Show progress panel and disable button
//     if (panel) panel.style.display = 'block';
//     if (button) button.disabled = true;

//     // Step 1: Install Ollama (0-30%)
//     updateProgress(5, 'Installing Ollama...');
//     await window.electronAPI.installOllama();
//     updateProgress(30, 'Ollama installed successfully');

//     // Step 2: Start Ollama with GPU optimization (30-40%)
//     updateProgress(35, 'Configuring GPU acceleration...');
//     const ollamaResult = await window.electronAPI.startOllama();
//     updateProgress(40, `Ollama started with ${ollamaResult.optimization.accelerationType}`);

//     // Step 3: Setup N8N (40-50%)
//     updateProgress(45, 'Setting up N8N workspace...');
//     await window.electronAPI.setupN8N();
//     updateProgress(50, 'N8N configured');

//     // Step 4: Start N8N (80-100%)
//     updateProgress(85, 'Starting N8N server...');
//     await window.electronAPI.startN8N();
//     updateProgress(100, 'Installation complete!');

//     // Enable "Start Building AI Agent" button
//     document.getElementById('startJourney').classList.remove('disable-click');

//   } catch (error) {
//     console.error('Installation failed:', error);
//     updateProgress(0, `Error: ${error.message}`);
//     if (consoleEl) {
//       const div = document.createElement('div');
//       div.style.color = 'red';
//       div.textContent = `${new Date().toLocaleTimeString()}: Installation failed: ${error.message}`;
//       consoleEl.appendChild(div);
//     }
//   } finally {
//     // Re-enable button
//     if (button) button.disabled = false;
//   }
// }
// const handleTabbutton = (target) => {
//   // Recall APIs on every tab click
//   if (typeof loadUpcomingUpdate === "function") loadUpcomingUpdate();
//   if (typeof loadTemplates === "function") loadTemplates();
//   if (typeof loadLLMList === "function") loadLLMList();

//   if (target === "Template") {
//     // conatiner
//     // categorytamplateData('Student');
//     document.getElementById("dashboard-container").style.display = "none";
//     document.getElementById("build-container").style.display = "none";
//     document.getElementById("llm-container").style.display = "none";
//     document.getElementById("tamplate-container").style.display = "block";
//     // tab button
//     document.getElementById("footer").classList.remove("active");
//     document.getElementById("footer").classList.add("active");
//     document.getElementById("Dashboard-btn").classList.remove("active");
//     document.getElementById("Build-btn")?.classList.remove("active");
//     document.getElementById("LLM-btn").classList.remove("active");
//     document.getElementById("Template-btn").classList.add("active");
//   } else if (target === "Build") {
//     // conatiner
//     document.getElementById("dashboard-container").style.display = "none";
//     document.getElementById("build-container").style.display = "none";
//     document.getElementById("llm-container").style.display = "none";
//     document.getElementById("tamplate-container").style.display = "none";
//     // tab button
//     document.getElementById("footer").classList.remove("active");
//     document.getElementById("footer").classList.add("active");

//     document.getElementById("Dashboard-btn").classList.remove("active");
//     document.getElementById("Build-btn").classList.add("active");
//     document.getElementById("LLM-btn").classList.remove("active");
//     document.getElementById("Template-btn").classList.remove("active");
//     handleMakeAIAgentClick()
//   } else if (target === "LLM") {
//     // conatiner
//     // categoryLLMData('Chat');
//     document.getElementById("dashboard-container").style.display = "none";
//     document.getElementById("build-container").style.display = "none";
//     document.getElementById("llm-container").style.display = "block";
//     document.getElementById("tamplate-container").style.display = "none";



//     document.getElementById("Dashboard-btn").classList.remove("active");
//     document.getElementById("Build-btn")?.classList.remove("active");
//     document.getElementById("LLM-btn").classList.add("active");
//     document.getElementById("Template-btn").classList.remove("active");
//     // tab button
//     document.getElementById("footer").classList.remove("active");
//     document.getElementById("footer").classList.add("active");


//   } else {
//     // conatiner
//     document.getElementById("dashboard-container").style.display = "block";
//     document.getElementById("build-container").style.display = "none";
//     document.getElementById("llm-container").style.display = "none";
//     document.getElementById("tamplate-container").style.display = "none";
//     // tab button
//     // document.getElementById("footer").classList.remove("active");
//     document.getElementById("footer").classList.add("active");



//     document.getElementById("Dashboard-btn").classList.add("active");
//     document.getElementById("Build-btn")?.classList.remove("active");
//     document.getElementById("LLM-btn").classList.remove("active");
//     document.getElementById("Template-btn").classList.remove("active");


//     var economicsElement = document.getElementById("economics-container");
//     var ideaElement = document.getElementById("idea-container");
//     economicsElement.style.display = "none";
//     ideaElement.style.display = "block";


//   }
// };

// function verify() {
//   const emailBox = document.getElementById("email-box");
//   const otpBox = document.getElementById("otp-box");

//   otpBox.style.display = "block";
//   emailBox.style.display = "none";
// }

// function OTPVerify() {
//   const gignaatiWorkBenchContainer = document.getElementById(
//     "gignaati-workBench-container"
//   );
//   // const brandingContainer = document.getElementById("branding-container");
//   const actionFeaturesSetup = document.getElementById("action-features-setup");
//   gignaatiWorkBenchContainer.style.display = "none";
//   // brandingContainer.style.display = "none";
//   actionFeaturesSetup.style.display = "block";
// }
// function OTPVerify1() {
//   const gignaatiWorkBenchContainer = document.getElementById(
//     "gignaati-workBench-container"
//   );
//   // const brandingContainer = document.getElementById("branding-container");
//   const actionFeaturesSetup = document.getElementById("action-features-setup");
//   const footer = document.getElementById("footer");
//   gignaatiWorkBenchContainer.style.display = "none";
//   footer.classList.remove("active");
//   // brandingContainer.style.display = "none";
//   actionFeaturesSetup.style.display = "block";
// }

// function backToVerify() {
//   const emailBox = document.getElementById("email-box");
//   const otpBox = document.getElementById("otp-box");
//   otpBox.style.display = "none";
//   emailBox.style.display = "block";
// }

// function StartJourney() {
//   const actionFeaturesSetup = document.getElementById("action-features-setup");
//   const dashBoardBuildLLmContainer = document.getElementById(
//     "dash-board-build-llm-container"
//   );
//   const nav = document.getElementById("nav");
//   const profile = document.getElementById("profile");
//   var footerElement = document.getElementById("footer");
//   nav.style.display = "block";
//   profile.style.display = "block";
//   actionFeaturesSetup.style.display = "none";
//   dashBoardBuildLLmContainer.style.display = "block";
//   footerElement.classList.add("active");

// }
// ////////////////////////////////////////////////////

// // === New Implementation: Reload APIs when nav buttons clicked ===

// // Reload Notifications (Dashboard)
// function reloadDashboardData() {
//   var notificationsListContainer = document.getElementById(
//     "notifications-list-container"
//   );
//   if (notificationsListContainer) {
//     fetch("https://api.gignaati.com/api/UpcomingUpdate")
//       .then((res) => res.json())
//       .then((data) => {
//         if (
//           data &&
//           data.data &&
//           Array.isArray(data.data) &&
//           data.data.length > 0
//         ) {
//           var sorted = data.data
//             .slice()
//             .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
//           notificationsListContainer.innerHTML = sorted
//             .map((item) => {
//               var dateStr = "";
//               if (item.releaseDate) {
//                 var d = new Date(item.releaseDate);
//                 dateStr = d.toLocaleDateString(undefined, {
//                   year: "numeric",
//                   month: "short",
//                   day: "numeric",
//                 });
//               }
//               return `
//               <div class="notifications mb-2">
//                 <h3>${item.title || ""}</h3>
//                 <p class="time"><b>${dateStr}</b></p>
//                 ${item.description
//                   ? `<div style="font-size: 12px; color: #555; margin-top: 2px;">${item.description}</div>`
//                   : ""
//                 }
//               </div>
//             `;
//             })
//             .join("");
//         } else {
//           notificationsListContainer.innerHTML =
//             '<div class="notifications mb-2">No notifications found.</div>';
//         }
//       })
//       .catch(() => {
//         notificationsListContainer.innerHTML =
//           '<div class="notifications mb-2 text-danger">Failed to load notifications.</div>';
//       });
//   }
// }


// function reloadTemplateData() {

//   var dropdownValue = document.getElementById("drop-down-btn-text").textContent;

//   var categoryType = "";
//   var storedIdeaText = "";
//   var ideaInputElement = document.getElementById("idea-input");
//   var ideaText = ideaInputElement.value;
//   if (ideaText && ideaText.trim() !== '') {
//     storedIdeaText = ideaText.trim();
//     ideaInputElement.value = "";
//   }

//   if (dropdownValue && dropdownValue !== "Select Category" && dropdownValue !== "All") {
//     categoryType = dropdownValue;
//   } else if (dropdownValue === "All" || dropdownValue === "Select Category") {
//     categoryType = "";
//   }
//   var footerForTemplate = document.getElementById("footer");
//   footerForTemplate.classList.remove("active");

//   // var dropdownElement = document.getElementById("drop-down-btn-text");
//   // dropdownElement.textContent = "Select Category";

//   var templateListContainer = document.getElementById("template-list-container");
//   // Ensure the Template tab/view is visible when this function is called
//   try {
//     var tamplateContainer = document.getElementById("tamplate-container");
//     if (tamplateContainer) tamplateContainer.style.display = "block";
//     // hide other containers
//     var dashboardContainer = document.getElementById("dashboard-container"); if (dashboardContainer) dashboardContainer.style.display = "none";
//     var buildContainer = document.getElementById("build-container"); if (buildContainer) buildContainer.style.display = "none";
//     var llmContainer = document.getElementById("llm-container"); if (llmContainer) llmContainer.style.display = "none";
//     // set nav button active states
//     document.getElementById("Dashboard-btn")?.classList.remove("active");
//     document.getElementById("Build-btn")?.classList.remove("active");
//     document.getElementById("LLM-btn")?.classList.remove("active");
//     document.getElementById("Template-btn")?.classList.add("active");
//     // ensure footer is active for this view
//     // document.getElementById("footer")?.classList.add("active");


//   } catch (e) { /* ignore UI adjustments if elements missing */ }

//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', reloadTemplateData);
//     return;
//   }
//   if (templateListContainer) {
//     let url = "https://api.gignaati.com/api/Template";
//     if (storedIdeaText && storedIdeaText.trim() !== '') {
//       url = url + "?searchParameter=" + storedIdeaText.trim();
//       storedIdeaText = "";
//     } else {
//       url = url + "?type=" + categoryType;
//     }
//     //fetch("https://api.gignaati.com/api/Template?type=" + storedIdeaText)
//     fetch(url)
//       .then((res) => res.json())
//       .then((data) => {
//         if (data && data.data && Array.isArray(data.data)) {
//           // Static "Create New Agent" card
//           var footerElement = document.getElementById("footer");
//           var templateList = data.data;
//           if (footerElement) {
//             if (templateList.length == 0) {
//               footerElement.classList.add("active");
//             } else {
//               footerElement.classList.remove("active");
//             }
//           }
//           //alert("2 " +data.totalRecords);
//           document.getElementById("templateCount").innerText = "Templates :" + " " + data.totalRecords;



//           const createNewTemplateHTML = `
//             <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
//               <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='openN8NInApp()'>
//                 <div class="plus">+</div>
//                 <h2 class="title">Build from Scratch</h2>
//                 <p>Transform your idea into an AI agent</p>
//               </div>
//             </div>
//           `;

//           // Dynamic template cards
//           const templateCardsHTML = data.data
//             .map((tpl, idx) => {
//               const imgSrc = tpl.imageUrl
//                 ? "https://api.gignaati.com" + tpl.imageUrl
//                 : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

//               const tagsHTML = tpl.tags && tpl.tags.length > 0
//                 ? tpl.tags.map(tag => `<li>${tag}</li>`).join("")
//                 : "<li></li>";


//               return `
//                 <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
//                   <div class="tamplate-box">
//                     <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//                       <img src="${imgSrc}" alt="" style="width:100%; max-height:200px; border-radius:8px;" />
//                     </div>
//                     <div class="cap-list">
//                     <ul>
//                       ${tagsHTML}
//                     </ul>
//                    </div>
//                     <h3>${tpl.name}</h3>
//                     <p class="picup-line"><i>"${tpl.tagLine}"</i></p>
//                     <p>${tpl.description || ""}</p>
//                     <button 
//                       type="button" 
//                       class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
//                       data-json='${tpl.jsonValue
//                   .replace(/'/g, "&#39;")
//                   .replace(/"/g, "&quot;")}'
//                       id="copy-json-btn-${idx}">
//                       Build Now
//                     </button>

//                     <button type="button" class="btn btn-primary custom-btn custom-btn-white"
//     data-bs-toggle="modal" data-bs-target="#previewModal"
//     onclick="loadTemplatePreview(${tpl.id}, '${tpl.name?.replace(/'/g, "\\'") || "--"}', '${tpl.tagLine?.replace(/'/g, "\\'") || "--"}')">
//     Preview
// </button>


//                   </div>
//                 </div>
//               `;
//             })
//             .join("");

//           // Combine the static and dynamic HTML
//           templateListContainer.innerHTML = createNewTemplateHTML + templateCardsHTML;

//           setTimeout(attachCopyJsonEvents, 100);
//         } else {

//           var ideaText = document.getElementById("idea-input").value;
//           ideaText.value = "";
//           var footerDiv = document.getElementById("footer");
//           footerDiv.classList.add("active");


//           //templateListContainer.innerHTML = '<div class="col-12">No templates found.</div>';
//           templateListContainer.innerHTML = `
//             <div class="col-xl-3 col-lg-3 col-md-4 col-sm-12 col-12 mb-3">
//               <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='openN8NInApp()'>
//                 <div class="plus">+</div>
//                 <h2 class="title">Build from Scratch</h2>
//                 <p>Transform your idea into an AI agent</p>
//               </div>
//             </div>
//           `;
//         }
//       })
//       .catch((err) => {
//         //alert(err.message);
//         templateListContainer.innerHTML =
//           '<div class="col-12 text-danger">Failed to load templates.</div>';
//       });
//   }
// }


// // Reload LLM List (LLM tab)
// function reloadLLMData() {
//   var llmListContainer = document.getElementById("llm-list-container");
//   if (llmListContainer) {
//     fetch("https://api.gignaati.com/api/Template/llmList?type=Chat")
//       .then((res) => res.json())
//       .then((data) => {

//         if (data && data.data && Array.isArray(data.data)) {

//           var footerElement = document.getElementById("footer");
//           var llmList = data.data;
//           if (footerElement) {
//             if (llmList.length == 0) {
//               footerElement.classList.add("active");
//             } else {
//               footerElement.classList.remove("active");
//             }
//           }



//           llmListContainer.innerHTML = data.data
//             .map((llm, idx) => {
//               var imgSrc =
//                 llm.imageUrl && llm.imageUrl !== "string"
//                   ? "https://api.gignaati.com" + llm.imageUrl
//                   : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

//               const tagsHTML = llm.tags && llm.tags.length > 0
//                 ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
//                 : "<li></li>";

//               return `
//               <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
//                 <div class="llm-box">
//                   <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//                     <img src="${imgSrc}" alt="" 
//                          style="width:100%; max-height:200px; border-radius:8px; " />
//                   </div>
//                   <h3>${llm.name || ""}</h3>
//                   <p>${llm.description || ""}</p>
//                    <div class="flex-column align-items-start mb-3 why">
//                 <div style="font-size: 14px; color: #555; margin-top: 2px; font-weight: 500;">Why this model:</div>
//                 <p style="font-size: 14px;">${llm.useCase}</p>
//               </div>
//                   <div class="cap-list mb-3">
//                     <ul>
//                       ${tagsHTML}
//                     </ul>
//                    </div>
//              <div class="system-info-2" style="display: block;
//     background: #e8e8e8;
//     padding: 10px 10px;
//     border-radius: 9px;">
//               <div style="font-size: 14px; color: #555; margin-top: 2px;     margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
//            <div class="row">
//               <div class="col-6 mb-2" style="font-size: 12px;">
// RAM: ${llm.ram}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// GPU: ${llm.gpu}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// CPU: ${llm.cpu}
//               </div>
//               <div class="col-6 mb-2" style="font-size: 12px;">
// NPU: ${llm.npu}
//               </div></div>
//               </div>
          
//                   <button 
//                     type="button" 
//                     class="btn btn-primary custom-btn custom-btn-white" 
//                     style="margin-top:16px;"
//                     onclick="downloadLlmModel('${llm.command}')"
//                   >
//                     Configure
//                   </button>
//                 </div>
//               </div>
//             `;
//             })
//             .join("");
//         } else {
//           llmListContainer.innerHTML =
//             '<div class="col-12">No models found.</div>';
//         }
//       })
//       .catch(() => {
//         llmListContainer.innerHTML =
//           '<div class="col-12 text-danger">Failed to load models.</div>';
//       });
//   }
// }

// // === Attach to Navbar Buttons ===
// document.addEventListener("DOMContentLoaded", () => {
//   const dashboardBtn = document.getElementById("Dashboard-btn");
//   const buildBtn = document.getElementById("Build-btn");
//   const llmBtn = document.getElementById("LLM-btn");
//   const templateBtn = document.getElementById("Template-btn");

//   if (dashboardBtn) dashboardBtn.addEventListener("click", reloadDashboardData);
//   if (templateBtn) templateBtn.addEventListener("click", reloadTemplateData);
//   if (llmBtn) llmBtn.addEventListener("click", reloadLLMData);
//   if (buildBtn)
//     buildBtn.addEventListener("click", () => {
//       // No API call for build tab yet, but you can add later if needed
//       console.log("Build tab clicked - no API to reload");
//     });
// });

// async function validateAndStartJourney() {
//   try {
//     // Stop the system monitoring first
//     if (window.stopSystemMonitoring) {
//       stopSystemMonitoring();
//     }

//     const systeminfo = document.getElementById("system-info");
//     systeminfo.style.display = "none";
//     StartJourney();

//     document.getElementById("chatBotDiv").style.display = "none";


//   } catch (e) {
//     showToast("Please complete step 1 & step 2 and try again!", false);
//   }
// }

// // --- Utility: Safe Copy JSON ---
// function attachCopyJsonEvents() {
//   document.querySelectorAll(".copy-json-btn").forEach((btn) => {
//     btn.addEventListener("click", () => {
//       const jsonVal = btn.getAttribute("data-json"); // raw JSON string
//       if (navigator.clipboard && window.isSecureContext) {
//         navigator.clipboard.writeText(jsonVal);
//       } else {
//         const textarea = document.createElement("textarea");
//         textarea.value = jsonVal;
//         document.body.appendChild(textarea);
//         textarea.select();
//         document.execCommand("copy");
//         document.body.removeChild(textarea);
//       }
//       openN8NInApp();
//       //btn.innerText = "Copied!";
//       setTimeout(() => {
//         btn.innerText = "Build Now";
//       }, 1200);
//     });
//   });
// }


// function footerStyle(response) {
//   var footerElement = document.getElementById("footer");
//   var llmList = response.data;
//   if (footerElement) {
//     if (llmList.length == 0) {
//       footerElement.classList.add("active");
//     } else {
//       footerElement.classList.remove("active");
//     }
//   }
// }


// function DashboardEconomics() {

//   if (!validateIdea()) {
//     return; // stop if validation fails
//   }

//   var economicsElement = document.getElementById("economics-container");
//   var ideaElement = document.getElementById("idea-container");
//   var footerElement = document.getElementById("footer");
//   var ideaInput = document.getElementById("idea-input");
//   var agentEconomic = document.getElementById("agentEconomic");
//   var tokenCostEl = document.getElementById("token-cost");
//   var roiEl = document.getElementById("roi-value");
//   var hoursSavedEl = document.getElementById("hours-saved");
//   var benefitsList = document.getElementById("benefits-list");

//   // Read input
//   var query = (ideaInput && ideaInput.value) ? ideaInput.value.trim() : "";

//   // Static fallback values
//   var fallback = {
//     benefits: [
//       { benefit: "Save 10-15 hours per week on repetitive tasks" },
//       { benefit: "Reduce operational costs by 40-60%" },
//       { benefit: "Improve response time by 80%" }
//     ],
//     roi: 255,
//     hoursSaved: 15,
//     tokenCost: 124,
//     idea: "AI Agent"
//   };

//   // Helper to render economics data
//   function renderEconomics(data) {
//     try {
//       agentEconomic.textContent = (data.idea !== undefined ? data.idea : fallback.idea);
//       tokenCostEl.textContent = (data.tokenCost !== undefined ? data.tokenCost : fallback.tokenCost);
//       roiEl.textContent = (data.roi !== undefined ? data.roi : fallback.roi) + "%";
//       hoursSavedEl.textContent = (data.hoursSaved !== undefined ? data.hoursSaved : fallback.hoursSaved) + "h";

//       // Render benefits list
//       if (benefitsList) {
//         var benefits = Array.isArray(data.benefits) && data.benefits.length ? data.benefits : fallback.benefits;
//         benefitsList.innerHTML = benefits
//           .map(function (b) {
//             var text = b.benefit || b || "";
//             return `<li><span></span>${text}</li>`;
//           })
//           .join("");
//       }
//     } catch (e) {
//       console.error("Error rendering economics:", e);
//     }
//   }

//   // If no query provided, show a toast and do nothing further
//   if (!query) {
//     if (typeof showToast === 'function') {
//       showToast('Please enter your idea before building an agent.', false);
//     }
//     return;
//   }

//   // Create or show a small loader inside the idea container while waiting
//   var loaderId = "economics-loader";
//   var loader = document.getElementById(loaderId);
//   if (!loader) {
//     loader = document.createElement("div");
//     loader.id = loaderId;
//     loader.style.cssText = "margin-top:12px; display:flex; align-items:center; gap:8px; font-size:0.95rem; color:#333;";
//     loader.innerHTML = '<div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div><span>Generating economics...</span>';
//     ideaElement.appendChild(loader);
//   } else {
//     loader.style.display = "flex";
//   }

//   // Show a temporary loading state in the target fields
//   tokenCostEl.textContent = "...";
//   roiEl.textContent = "...";
//   hoursSavedEl.textContent = "...";
//   benefitsList.innerHTML = '<li>Loading...</li>';

//   // Call API
//   fetch("https://api.gignaati.com/api/Chat/generate-response", {
//     method: "POST",
//     headers: {
//       accept: "text/plain",
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({ userQuery: query, outputFormat: "string" })
//   })
//     .then(function (res) {
//       if (!res.ok) {
//         throw new Error("API returned status " + res.status);
//       }
//       return res.json();
//     })
//     .then(function (data) {
//       // Expecting shape: { benefits: [{benefit:...}], roi, hoursSaved, tokenCost }
//       renderEconomics(data);
//       // hide loader
//       if (loader) loader.style.display = "none";
//       // Show economics panel and hide idea panel after getting a response
//       economicsElement.style.display = "block";
//       ideaElement.style.display = "none";
//       footerElement.classList.remove("active");
//       // Clear the textarea input now that response is received
//       //if (ideaInput) ideaInput.value = "";
//     })
//     .catch(function (err) {
//       console.error("DashboardEconomics error:", err);
//       // On error, render fallback static data
//       renderEconomics(fallback);
//       if (loader) loader.style.display = "none";
//       // Show economics panel (with fallback) and hide idea panel
//       economicsElement.style.display = "block";
//       ideaElement.style.display = "none";
//       footerElement.classList.remove("active");
//       // Clear the textarea input even on error (response received)
//       if (ideaInput) ideaInput.value = "";
//     });
// }

// function validateIdea() {
//   const ideaInput = document.getElementById("idea-input");
//   const errorDiv = document.getElementById("idea-error");

//   const text = ideaInput.value.trim();
//   const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

//   if (text.length < 10) {
//     errorDiv.textContent = "Minimum 10 characters required.";
//     return false;
//   } else if (text.length > 500) {
//     errorDiv.textContent = "Maximum 500 characters allowed.";
//     return false;
//   } else if (wordCount < 2) {
//     // optional: enforce minimum word count
//     errorDiv.textContent = "Please write at least 2 words.";
//     return false;
//   }

//   // Clear error if valid
//   errorDiv.textContent = "";
//   return true;
// }


// function loadTemplatePreview(templateId, templateName = "--", templateTagline = "--") {
//   const apiUrl = `https://api.gignaati.com/api/Template/GetTemplatePreviewById?templateId=${templateId}`;

//   fetch(apiUrl)
//     .then(res => {
//       if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//       return res.json();
//     })
//     .then(response => {
//       if (response && response.data) {
//         const preview = response.data;

//         // Set template name & tagline
//         const nameEl = document.getElementById("previewTemplateName");
//         const taglineEl = document.getElementById("previewTemplateTagline");
//         if (nameEl) nameEl.textContent = templateName || "--";
//         if (taglineEl) taglineEl.textContent = `"${templateTagline || "--"}"`;

//         // Set video link
//         const videoIframe = document.getElementById("previewVideo");
//         if (videoIframe && preview.videoLink) {
//           videoIframe.src = preview.videoLink.replace(/&amp;/g, "&");
//         }

//         // Set ROI and Annual Savings
//         document.getElementById("roi").textContent = preview.roi || "--";
//         document.getElementById("annualSavings").textContent = preview.annualSavings || "--";

//         // Set Time Saved
//         document.getElementById("dailyTasksHours").textContent = preview.dailyTasksHours || "--";
//         document.getElementById("monthlyReportsHours").textContent = preview.monthlyReportsHours || "--";
//         document.getElementById("customerSupportHours").textContent = preview.customerSupportHours || "--";

//         // Set Benefits
//         const benefitsList = document.getElementById("benefitsList");
//         if (benefitsList) {
//           benefitsList.innerHTML = "";
//           if (preview.benefits && preview.benefits.length > 0) {
//             preview.benefits.forEach(benefit => {
//               const li = document.createElement("li");
//               li.textContent = benefit || "--";
//               benefitsList.appendChild(li);
//             });
//           } else {
//             const li = document.createElement("li");
//             li.textContent = "--";
//             benefitsList.appendChild(li);
//           }
//         }

//         // Total hours saved
//         document.getElementById("totalHoursSaved").textContent = "500+ hours saved annually";
//       } else {
//         //showToast("Preview is not available.", false);
//       }
//     })
//     .catch(err => {
//       //showToast(`Failed to load preview: ${err.message}`, false);
//     });
// }

// function triggerCtrlR() {
//     location.reload(true);
// }


// new----------------------------

// ========================================
// CONFIGURE MODEL DOWNLOAD FUNCTION
// ========================================
// Pehle ye function sirf API call kar raha tha, ab ye REAL DOWNLOAD kar raha hai
// Previously this function was only making API calls, now it performs REAL DOWNLOADS

// OLD CODE (COMMENTED OUT) - Sirf API call kar raha tha

// Global function for Configure button
// function downloadLlmModel(modelName) {
  //alert(modelName);

//   if (!modelName) {
//     showToast && showToast("Model name is missing or invalid.", false);
//     return;
//   }
//   fetch('http://localhost:5000/api/DownloadLlmModel/download-model', {
//     method: 'POST',
//     headers: {
//       'accept': '*/*',
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(modelName)
//   })
//     .then(res => res.json())
//     .then(data => {
//       if (typeof showToast === 'function') {
//         showToast(data.message || "No message from backend.", data.data === true);
//       } else {
//         //alert(data.message || "No message from backend.");
//       }
//     })
//     .catch(err => {
//       if (typeof showToast === 'function') {
//         showToast("Error: " + err.message, false);
//       } else {
//         //alert("Error: " + err.message);
//       }
//     });
// }


// NEW CODE - Real download with proper error handling
async function downloadLlmModel(modelName) {
  // Model name validation - agar model name nahi hai to error show karo
  if (!modelName) {
    showToast && showToast("Model name is missing or invalid.", false);
    return;
  }

  // Button ko disable kar do taaki multiple downloads na ho sake
  // Disable button to prevent multiple simultaneous downloads
  const button = event?.target;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Downloading...';
    button.style.pointerEvents = 'none';
  }

  // ========================================
  // PROGRESS INDICATOR CREATION
  // ========================================
  // Pehle sirf toast messages the, ab ek proper progress bar bhi hai
  // Previously only toast messages, now there's a proper progress bar too
  
  // Progress container banate hai jo screen ke top-right mein dikhega
  // Create progress container that will show in top-right of screen
  const progressContainer = document.createElement('div');
  progressContainer.id = `progress-${modelName}`;
  progressContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 300px;
    max-width: 400px;
  `;
  
  // Progress bar aur text add karte hai
  // Add progress bar and text
  progressContainer.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
      <span class="spinner-border spinner-border-sm me-2"></span>
      <strong>Downloading ${modelName}</strong>
    </div>
    <div class="progress" style="height: 8px; margin-bottom: 10px;">
      <div class="progress-bar" role="progressbar" style="width: 0%"></div>
    </div>
    <div class="progress-text" style="font-size: 12px; color: #666;">Starting download...</div>
  `;
  
  document.body.appendChild(progressContainer);

  try {
    // ========================================
    // MAIN DOWNLOAD LOGIC
    // ========================================
    // Pehle sirf API call tha, ab real Ollama download hai
    // Previously only API call, now it's real Ollama download
    
    // Electron API check karte hai - agar available hai to real download karenge
    // Check if Electron API is available for real download
    if (window.electronAPI && window.electronAPI.downloadModel) {
      console.log(`Starting real download of model: ${modelName}`);
      showToast(`Starting download of ${modelName}...`, true);
      
      // ========================================
      // PROGRESS TRACKING SETUP
      // ========================================
      // Real-time progress tracking ke liye variables
      // Variables for real-time progress tracking
      let progressInterval;
      let lastProgress = 0;
      
      // Progress handler function - ye har progress update pe call hota hai
      // Progress handler function - called on every progress update
      const progressHandler = (event, data) => {
        if (data.step === 'model-download' && data.model === modelName) {
          const progress = data.progress || 0;
          const message = data.message || 'Downloading...';
          
          // Progress bar update karte hai
          // Update progress bar
          const progressBar = progressContainer.querySelector('.progress-bar');
          const progressText = progressContainer.querySelector('.progress-text');
          
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
          }
          
          if (progressText) {
            progressText.textContent = `${message} (${progress}%)`;
          }
          
          // Button text bhi update karte hai
          // Update button text too
          if (button) {
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${message} (${progress}%)`;
          }
          
          // Har 10% pe toast message show karte hai
          // Show toast message every 10%
          if (progress - lastProgress >= 10 || message.includes('success') || message.includes('error')) {
            showToast(`${message} (${progress}%)`, true);
            lastProgress = progress;
          }
        }
      };
      
      // Add progress listener
      if (window.electronAPI.onModelDownloadProgress) {
        window.electronAPI.onModelDownloadProgress((data) => {
          if (data.modelName === modelName) {
            const progress = data.progress || 0;
            const message = data.message || 'Downloading...';
            
            // Update progress bar
            const progressBar = progressContainer.querySelector('.progress-bar');
            const progressText = progressContainer.querySelector('.progress-text');
            
            if (progressBar) {
              progressBar.style.width = `${progress}%`;
              progressBar.setAttribute('aria-valuenow', progress);
            }
            
            if (progressText) {
              progressText.textContent = `${message} (${Math.round(progress)}%)`;
            }
            
            // Update button text
            if (button) {
              button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${Math.round(progress)}%`;
            }
            
            // Show toast every 20%
            if (progress - lastProgress >= 20) {
              showToast(`Downloading: ${Math.round(progress)}%`, true);
              lastProgress = progress;
            }
          }
        });
      }
      
      // Start the actual download
      await window.electronAPI.downloadModel(modelName);
      
      // Success
      if (button) {
        button.innerHTML = '✓ Downloaded';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
        button.style.pointerEvents = 'auto';
      }
      
      // Update progress container to show success
      const progressBar = progressContainer.querySelector('.progress-bar');
      const progressText = progressContainer.querySelector('.progress-text');
      const spinner = progressContainer.querySelector('.spinner-border');
      
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.classList.add('bg-success');
      }
      
      if (progressText) {
        progressText.textContent = `Successfully downloaded ${modelName}!`;
        progressText.style.color = '#28a745';
      }
      
      if (spinner) {
        spinner.className = 'me-2';
        spinner.innerHTML = '✓';
        spinner.style.color = '#28a745';
      }
      
      showToast(`Successfully downloaded ${modelName}!`, true);
      
      // Remove progress container after 3 seconds
      setTimeout(() => {
        if (progressContainer && progressContainer.parentNode) {
          progressContainer.parentNode.removeChild(progressContainer);
        }
      }, 3000);
      
      // Remove progress listener
      if (window.electronAPI.removeProgressListener) {
        window.electronAPI.removeProgressListener(progressHandler);
      }
      
    } else {
      // Fallback: Try to download using Node.js child_process (if available)
      throw new Error("Electron API not available. Please run this application in Electron environment for model downloads.");
    }
    
  } catch (err) {
    console.error("Model download failed:", err);
    
    // Reset button state on error
    if (button) {
      button.disabled = false;
      button.innerHTML = 'Configure';
      button.classList.remove('btn-success');
      button.classList.add('btn-primary');
      button.style.pointerEvents = 'auto';
    }
    
    // Update progress container to show error
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = progressContainer.querySelector('.progress-text');
    const spinner = progressContainer.querySelector('.spinner-border');
    
    if (progressBar) {
      progressBar.classList.add('bg-danger');
    }
    
    if (progressText) {
      progressText.textContent = 'Download failed!';
      progressText.style.color = '#dc3545';
    }
    
    if (spinner) {
      spinner.className = 'me-2';
      spinner.innerHTML = '✗';
      spinner.style.color = '#dc3545';
    }
    
    // ========================================
    // ERROR HANDLING - IMPROVED FROM PREVIOUS VERSION
    // ========================================
    // Pehle sirf generic error message tha, ab specific error messages hain
    // Previously only generic error message, now there are specific error messages
    
    // Different types of errors ke liye different messages
    // Different messages for different types of errors
    let errorMessage = "Download failed: ";
    if (err.message.includes("not installed")) {
      errorMessage += "Ollama is not installed. Please install Ollama first.";
    } else if (err.message.includes("timeout") || err.message.includes("TLS handshake")) {
      // NEW: Network timeout handling with retry information
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
    
    showToast(errorMessage, false);
    
    // Remove progress container after 5 seconds on error
    setTimeout(() => {
      if (progressContainer && progressContainer.parentNode) {
        progressContainer.parentNode.removeChild(progressContainer);
      }
    }, 5000);
  }
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
// Fetch and render Templates card dynamically, enable Copy Json
// document.addEventListener('DOMContentLoaded', function () {
//   var templateListContainer = document.getElementById('template-list-container');
//   if (templateListContainer) {
//     fetch('https://api.gignaati.com/api/Template')
//       .then(function (response) { return response.json(); })
//       .then(function (data) {
//         if (data && data.data && Array.isArray(data.data)) {
//           templateListContainer.innerHTML = data.data.map(function (tpl, idx) {
//             var imgSrc = 'https://api.gignaati.com' + tpl.imageUrl || 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300';
//             // Use a hidden textarea to store the full JSON for each card
//             return `
//               <div class="col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3">
//                 <div class="tamplate-box">
//                   <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//                     <img src="${imgSrc}" alt="" style="max-width:100%; max-height:120px; border-radius:8px; object-fit:cover;" />
//                   </div>
//                   <h3>${tpl.name}</h3>
//                   <p>${tpl.description || ''}</p>
//                   <textarea id="json-value-${idx}" style="display:none;">${tpl.jsonValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
//                   <button type="button" class="btn btn-primary custom-btn custom-btn-white copy-json-btn" data-idx="${idx}" id="copy-json-btn-${idx}">Copy Json</button>
//                 </div>
//               </div>
//             `;
//           }).join('');
//           setTimeout(function() {
//             var copyBtns = document.querySelectorAll('.copy-json-btn');
//             copyBtns.forEach(function(btn) {
//               btn.addEventListener('click', function() {
//                 var idx = btn.getAttribute('data-idx');
//                 var textarea = document.getElementById('json-value-' + idx);
//                 if (textarea) {
//                   textarea.style.display = 'block';
//                   textarea.select();
//                   try {
//                     document.execCommand('copy');
//                   } catch (e) {
//                     // fallback for clipboard API
//                     if (navigator.clipboard) {
//                       navigator.clipboard.writeText(textarea.value);
//                     }
//                   }
//                   textarea.style.display = 'none';
//                   btn.innerText = 'Copied!';
//                   setTimeout(function() { btn.innerText = 'Copy Json'; }, 1200);
//                 }
//               });
//             });
//           }, 100);

//         } else {
//           templateListContainer.innerHTML = '<div class="col-12">No templates found.</div>';
//         }
//       })
//       .catch(function (err) {
//         templateListContainer.innerHTML = '<div class="col-12 text-danger">Failed to load templates.</div>';
//       });
//   }
// });

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


// Fetch and render Templates card dynamically, enable Copy Json
// document.addEventListener("DOMContentLoaded", function () {
//   var templateListContainer = document.getElementById(
//     "template-list-container"
//   );
//   var templateSearchBar = document.getElementById("template-search-bar");
//   var allTemplates = [];

//   function renderTemplates(templates) {
//     templateListContainer.innerHTML =
//       templates.length > 0
//         ? templates
//           .map((tpl, idx) => {
//             const imgSrc = tpl.imageUrl
//               ? "https://api.gignaati.com" + tpl.imageUrl
//               : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";
//             return `
//       <div class="col-xl-3 col-lg-3 col-md-6 col-sm-12 col-12 mb-3">
//         <div class="tamplate-box">
//           <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//             <img src="${imgSrc}" alt="" style="width:100%; max-height:120px; border-radius:8px;" />
//           </div>
//           <h3>${tpl.name}</h3>
//           <p>${tpl.description || ""}</p>
//           <button 
//             type="button" 
//             class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
//             data-json='${tpl.jsonValue
//                 .replace(/'/g, "&#39;")
//                 .replace(/"/g, "&quot;")}'
//             id="copy-json-btn-${idx}">
//             Copy Json
//           </button>
//         </div>
//       </div>
//     `;
//           })
//           .join("")
//         : '<div class="col-12">No templates found.</div>';

//     setTimeout(attachCopyJsonEvents, 100);
//   }

//   if (templateListContainer) {
//     fetch("https://api.gignaati.com/api/Template")
//       .then(function (response) {
//         return response.json();
//       })
//       .then(function (data) {
//         if (data && data.data && Array.isArray(data.data)) {

//           if (templateSearchBar) {
//             templateSearchBar.addEventListener("input", function (e) {
//               var val = e.target.value.toLowerCase();
//               var filtered = allTemplates.filter(function (tpl) {
//                 return (
//                   (tpl.name && tpl.name.toLowerCase().includes(val)) ||
//                   (tpl.description &&
//                     tpl.description.toLowerCase().includes(val))
//                 );
//               });
//               renderTemplates(filtered);
//             });
//           }
//         } else {
//           renderTemplates([]);
//         }
//       })
//       .catch(function (err) {
//         renderTemplates([]);
//       });
//   }
// });

// document.addEventListener("DOMContentLoaded", function () {
//   var templateListContainer = document.getElementById("template-list-container");
//   var templateSearchBar = document.getElementById("template-search-bar");
//   var allTemplates = [];

//   function renderTemplates(templates) {
//     templateListContainer.innerHTML =
//       templates.length > 0
//         ? templates
//             .map((tpl, idx) => {
//               const imgSrc = tpl.imageUrl
//                 ? "https://api.gignaati.com" + tpl.imageUrl
//                 : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";
//               return `
//       <div class="col-xl-3 col-lg-3 col-md-6 col-sm-12 col-12 mb-3">
//         <div class="tamplate-box">
//           <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
//             <img src="${imgSrc}" alt="" style="width:100%; max-height:120px; border-radius:8px;" />
//           </div>
//           <h3>${tpl.name}</h3>
//           <p>${tpl.description || ""}</p>
//           <button 
//             type="button" 
//             class="btn btn-primary custom-btn custom-btn-white copy-json-btn" 
//             data-json='${tpl.jsonValue
//               .replace(/'/g, "&#39;")
//               .replace(/"/g, "&quot;")}'
//             id="copy-json-btn-${idx}">
//             Copy Json
//           </button>
//         </div>
//       </div>
//     `;
//             })
//             .join("")
//         : '<div class="col-12">No templates found.</div>';

//     setTimeout(attachCopyJsonEvents, 100);
//   }

//   if (templateListContainer) {
//     fetch("https://api.gignaati.com/api/Template")
//       .then(function (response) {
//         return response.json();
//       })
//       .then(function (data) {
//         if (data && data.data && Array.isArray(data.data)) {
//           // ✅ Store fetched templates in allTemplates
//           allTemplates = data.data;

//           // Render initially
//           renderTemplates(allTemplates);

//           // Attach search event
//           if (templateSearchBar) {
//             templateSearchBar.addEventListener("input", function (e) {
//               var val = e.target.value.toLowerCase();
//               var filtered = allTemplates.filter(function (tpl) {
//                 return (
//                   (tpl.name && tpl.name.toLowerCase().includes(val)) ||
//                   (tpl.description &&
//                     tpl.description.toLowerCase().includes(val))
//                 );
//               });
//               renderTemplates(filtered);
//             });
//           }
//         } else {
//           renderTemplates([]);
//         }
//       })
//       .catch(function (err) {
//         renderTemplates([]);
//       });
//   }
// });
document.addEventListener("DOMContentLoaded", function () {
  var templateListContainer = document.getElementById("template-list-container");
  var templateSearchBar = document.getElementById("template-search-bar");
  var allTemplates = [];

  // Default template HTML
  function getDefaultTemplateHtml() {
    return `
      <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
        <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='showN8NView()'>
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
                  Build Now
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


function renderLLMsButton(models) {
  const container = document.getElementById("llm-btn-grp");
  if (!container) {
    console.error("Container not found!");
    return;
  }
  container.innerHTML = ""; // Clear existing buttons
  // Create a Set to track unique categories
  const seenCategories = new Set();
  models.forEach((model, idx) => {
    const category = model.category || `Model ${idx + 1}`;

    // Skip duplicates
    if (seenCategories.has(category)) return;

    seenCategories.add(category);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = category; // Set button text
    btn.id = `llm-btn-${idx}`; // Unique ID
    // btn.classList.add("llm-btn");
    // btn.classList.add("custom-btn");
    // btn.classList.add("btn");
    // btn.classList.add("btn-primary");
    // btn.classList.add("me-2");
    btn.classList.add("llm-btn", "custom-btn", "btn", "btn-primary", "me-2");
    // btn.addEventListener("click", () => {
    //   categoryLLMData(category);
    // });
    btn.addEventListener("click", () => {
      // remove active from all
      document.querySelectorAll("#llm-btn-grp .llm-btn").forEach(b => {
        b.classList.remove("active");
      });
      // add active to clicked
      btn.classList.add("active");

      // call your function
      categoryLLMData(category);
    });

    container.appendChild(btn);
  });

}

function categoryLLMData(str) {
  var llmListContainer = document.getElementById("llm-list-container");
  if (llmListContainer) {
    // fetch(`https://api.gignaati.com/api/Template/llmList?type=${str}`)
    fetch(`https://api.gignaati.com/api/Template/llmList`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data && Array.isArray(data.data)) {
          llmListContainer.innerHTML = data.data
            .filter((curELe, index) => {
              return curELe.category === str;
            })
            .map((llm, idx) => {
              var imgSrc =
                llm.imageUrl && llm.imageUrl !== "string"
                  ? "https://api.gignaati.com" + llm.imageUrl
                  : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

              const tagsHTML = llm.tags && llm.tags.length > 0
                ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
                : "<li></li>";

              return `
              <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
                <div class="llm-box">
                  <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
                    <img src="${imgSrc}" alt="" 
                         style="width:100%; max-height:200px; border-radius:8px; " />
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
              <div style="font-size: 14px; color: #555; margin-top: 2px;     margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
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
              </div></div>
              </div>
           
                  <button 
                    type="button" 
                    class="btn btn-primary custom-btn custom-btn-white" 
                    style="margin-top:16px;"
                    onclick="downloadLlmModel('${llm.command}')"
                  >
                    Configure
                  </button>
                </div>
              </div>
            `;
            })
            .join("");
        } else {
          llmListContainer.innerHTML =
            '<div class="col-12">No models found.</div>';
        }
      })
      .catch(() => {
        llmListContainer.innerHTML =
          '<div class="col-12 text-danger">Failed to load models.</div>';
      });
  }
}

// Fetch and render LLM list in Language Models card
document.addEventListener("DOMContentLoaded", function () {
  var llmListContainer = document.getElementById("llm-list-container");
  var llmSearchBar = document.getElementById("llm-search-bar");
  var allLLMs = [];

  function renderLLMs(models) {
    llmListContainer.innerHTML =
      models.length > 0
        ? models
          .map(function (llm, idx) {
            var imgSrc =
              llm.imageUrl && llm.imageUrl !== "string"
                ? "https://api.gignaati.com" + llm.imageUrl
                : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

            const tagsHTML = llm.tags && llm.tags.length > 0
              ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
              : "<li></li>";


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
              <div style="font-size: 14px; color: #555; margin-top: 2px;     margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
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
              </div></div>
              </div>
           
                  <button 
                    type="button" 
                    class="btn btn-primary custom-btn custom-btn-white" 
                    style="margin-top:16px;"
                    onclick="downloadLlmModel('${llm.command}')"
                  >
                    Configure
                  </button>
          
            </div>
        </div>
      `;
          })
          .join("")
        : '<div class="col-12">No models found.</div>';
  }
  //<button type="button" class="btn btn-primary custom-btn custom-btn-white" style="margin-top:16px;">Configure</button>


  if (llmListContainer) {
    fetch("https://api.gignaati.com/api/Template/llmList?type=Chat")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data && data.data && Array.isArray(data.data)) {
          // allLLMs = data.data;

          // renderLLMsButton(allLLMs);

          // 🔹 Step 2: Call the second API here
          fetch("https://api.gignaati.com/api/Template/llmList")
            .then(function (res) {
              return res.json();
            })
            .then(function (newApi) {
              if (newApi && newApi.data && Array.isArray(newApi.data)) {
                // 🔹 Step 3: Pass newApi.data to renderLLMsButton
                allLLMs = newApi.data;
                renderLLMs(allLLMs);
                renderLLMsButton(newApi.data);
              } else {
                renderLLMsButton([]);
              }
            })
            .catch(function (err) {
              renderLLMsButton([]);
            });

          if (llmSearchBar) {
            llmSearchBar.addEventListener("input", function (e) {
              var val = e.target.value.toLowerCase();
              var filtered = allLLMs.filter(function (llm) {
                return (
                  (llm.name && llm.name.toLowerCase().includes(val)) ||
                  (llm.description &&
                    llm.description.toLowerCase().includes(val))
                );
              });
              // ⭐ Get the footer element
              var footerElement = document.getElementById("footer");
              var llmList = filtered; // Store the list for length check
              if (footerElement) {
                if (llmList.length == 0) {
                  footerElement.classList.add("active");
                } else {
                  footerElement.classList.remove("active");
                }
              }
              renderLLMs(filtered);
            });
          }
        } else {
          renderLLMs([]);
        }
      })
      .catch(function (err) {
        renderLLMs([]);
      });
  }
});



// // Setup card click handlers for Docker, n8n, and Ollama
// document.addEventListener("DOMContentLoaded", function () {
//   var dockerBox = document.getElementById("docker-setup-box");
//   var n8nBox = document.getElementById("n8n-setup-box");
//   var ollamaBox = document.getElementById("ollama-setup-box");
  
//   if (n8nBox) {
//     alert();
//     const systeminfo = document.getElementById("system-info");
//     systeminfo.style.display = "block";
//   }
  
// });

// function handleProvisioning(loaderId, resultId, apiUrl, label) {
//   var loader = document.getElementById(loaderId);
//   var result = document.getElementById(resultId);
//   var dockerManualButton = document.getElementById('dockerManualButton');


//   if (!loader || !result) return;
//   result.style.display = "none";
//   loader.style.display = "block";
//   fetch(apiUrl, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   })
//     .then(function (response) {
//       return response.json();
//     })
//     .then(function (data) {
//       // If Docker was just installed, try to open Docker Desktop before showing result
//       if (
//         label === "Docker" &&
//         data.success &&
//         window.electronAPI &&
//         window.electronAPI.openDockerDesktop
//       ) {
//         window.electronAPI.openDockerDesktop();
//       }
//       loader.style.display = "none";
//       result.style.display = "block";
//       if (data.success) {

//         const systeminfo = document.getElementById("system-info");
//         document.getElementById("n8n-setup-box").classList.remove('disable-click');
//         if (label === "n8n") {
//           document.getElementById("startJourney").classList.remove('disable-click');
//         }

//         systeminfo.style.display = "block";
//         result.innerHTML =
//           '<span style="color:green; font-size: 12px">' +
//           data.message +
//           "</span>";
//       } else {

//         if (label === "Docker") {
//           //dockerManualButton.style.display = "block";
//           document.getElementById("dockerManualButton").classList.remove('disable-click');
//         }

//         // if (label === "n8n") {
//         //   alert("remove this code");
//         //   document.getElementById("startJourney").classList.remove('disable-click');
//         // }


//         if (data.message && data.message.toLowerCase().includes("task")) {
//           alert();
//           data.message = "Your internet connection is not stable. Please try again.";

//         }

//         result.innerHTML =
//           '<span style="color:red; font-size: 12px">' +
//           (data.message || "Failed to install " + label + ".") +
//           "</span>";
//       }
//     })
//     .catch(function (err) {
      
//       if (label === "Docker") {
//         // dockerManualButton.style.display = "block";
//           document.getElementById("dockerManualButton").classList.remove('disable-click');
//       }

//       loader.style.display = "none";
//       result.style.display = "block";
//       if (label === "Docker") {
//         //dockerManualButton.style.display = "block";
//         document.getElementById("dockerManualButton").classList.remove('disable-click');

//         result.innerHTML =
//           '<span style="color:red;">Your internet connection is not stable. Please try again or set up manually.</span>';

//       } else {
//         // Log the error and show a non-blocking message in the UI
//         console.error('Provisioning fetch error for', label, err);
//         try { if (typeof showToast === 'function') showToast('Error: ' + (err && err.message ? err.message : 'Failed to connect'), false); } catch (e) {}

//         result.innerHTML =
//           '<span style="color:red;">Your internet connection is not stable. Please try again.</span>';
//       }


//     });
// }

// Click-to-Launch: install/start Ollama and N8N showing inline progress and console
async function clickToLaunchInstall() {
  // const systeminfo = document.getElementById("system-info");
  // systeminfo.style.display = "block";
  
  const panel = document.getElementById('launch-progress-panel');
  const bar = document.getElementById('launch-progress-bar');
  const text = document.getElementById('launch-progress-text');
  const consoleEl = document.getElementById('launch-console');
  const button = document.querySelector('.install-btn');

  // Helper to update UI
  function updateProgress(percent, message) {
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.textContent = `${percent}%`;
    }
    if (text) {
      text.textContent = message;
    }
    if (consoleEl) {
      const div = document.createElement('div');
      div.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
      consoleEl.appendChild(div);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  try {
    // Show progress panel and disable button
    if (panel) panel.style.display = 'block';
    if (button) button.disabled = true;

    // Step 1: Install AI Brain (0-30%)
    updateProgress(5, 'Installing AI Brain...');
    await window.electronAPI.installOllama();
    updateProgress(30, 'AI Brain installed successfully');

    // Step 2: Start AI Brain with GPU optimization (30-40%)
    updateProgress(35, 'Configuring GPU acceleration...');
    const ollamaResult = await window.electronAPI.startOllama();
    updateProgress(40, `AI Brain started with ${ollamaResult.optimization.accelerationType}`);

    // Step 3: Setup Agentic Platform (40-50%)
    updateProgress(45, 'Setting up Agentic Platform workspace...');
    await window.electronAPI.setupN8N();
    updateProgress(50, 'Agentic Platform configured');

    // Step 4: Start Agentic Platform (80-100%)
    updateProgress(85, 'Starting Agentic Platform...');
    await window.electronAPI.startN8N();
    updateProgress(100, 'Installation complete!');

    // Enable "Start Building AI Agent" button
    document.getElementById('startJourney').classList.remove('disable-click');

  } catch (error) {
    console.error('Installation failed:', error);
    updateProgress(0, `Error: ${error.message}`);
    if (consoleEl) {
      const div = document.createElement('div');
      div.style.color = 'red';
      div.textContent = `${new Date().toLocaleTimeString()}: Installation failed: ${error.message}`;
      consoleEl.appendChild(div);
    }
  } finally {
    // Re-enable button
    if (button) button.disabled = false;
  }
}
const handleTabbutton = (target) => {
  // Recall APIs on every tab click
  if (typeof loadUpcomingUpdate === "function") loadUpcomingUpdate();
  if (typeof loadTemplates === "function") loadTemplates();
  if (typeof loadLLMList === "function") loadLLMList();

  if (target === "Template") {
    // conatiner
    // categorytamplateData('Student');
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "block";
    // tab button
    document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");
    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.add("active");
  } else if (target === "Build") {
    // conatiner
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    // tab button
    document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");

    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn").classList.add("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");
    handleMakeAIAgentClick()
  } else if (target === "LLM") {
    // conatiner
    // categoryLLMData('Chat');
    document.getElementById("dashboard-container").style.display = "none";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "block";
    document.getElementById("tamplate-container").style.display = "none";



    document.getElementById("Dashboard-btn").classList.remove("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.add("active");
    document.getElementById("Template-btn").classList.remove("active");
    // tab button
    document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");


  } else {
    // conatiner
    document.getElementById("dashboard-container").style.display = "block";
    document.getElementById("build-container").style.display = "none";
    document.getElementById("llm-container").style.display = "none";
    document.getElementById("tamplate-container").style.display = "none";
    // tab button
    // document.getElementById("footer").classList.remove("active");
    document.getElementById("footer").classList.add("active");



    document.getElementById("Dashboard-btn").classList.add("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn").classList.remove("active");
    document.getElementById("Template-btn").classList.remove("active");


    var economicsElement = document.getElementById("economics-container");
    var ideaElement = document.getElementById("idea-container");
    economicsElement.style.display = "none";
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
  // const brandingContainer = document.getElementById("branding-container");
  const actionFeaturesSetup = document.getElementById("action-features-setup");
  const footer = document.getElementById("footer");
  gignaatiWorkBenchContainer.style.display = "none";
  footer.classList.remove("active");
  // brandingContainer.style.display = "none";
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

  var dropdownValue = document.getElementById("drop-down-btn-text").textContent;

  var categoryType = "";
  var storedIdeaText = "";
  var ideaInputElement = document.getElementById("idea-input");
  var ideaText = ideaInputElement.value;
  if (ideaText && ideaText.trim() !== '') {
    storedIdeaText = ideaText.trim();
    ideaInputElement.value = "";
  }

  if (dropdownValue && dropdownValue !== "Select Category" && dropdownValue !== "All") {
    categoryType = dropdownValue;
  } else if (dropdownValue === "All" || dropdownValue === "Select Category") {
    categoryType = "";
  }
  var footerForTemplate = document.getElementById("footer");
  footerForTemplate.classList.remove("active");

  // var dropdownElement = document.getElementById("drop-down-btn-text");
  // dropdownElement.textContent = "Select Category";

  var templateListContainer = document.getElementById("template-list-container");
  // Ensure the Template tab/view is visible when this function is called
  try {
    var tamplateContainer = document.getElementById("tamplate-container");
    if (tamplateContainer) tamplateContainer.style.display = "block";
    // hide other containers
    var dashboardContainer = document.getElementById("dashboard-container"); if (dashboardContainer) dashboardContainer.style.display = "none";
    var buildContainer = document.getElementById("build-container"); if (buildContainer) buildContainer.style.display = "none";
    var llmContainer = document.getElementById("llm-container"); if (llmContainer) llmContainer.style.display = "none";
    // set nav button active states
    document.getElementById("Dashboard-btn")?.classList.remove("active");
    document.getElementById("Build-btn")?.classList.remove("active");
    document.getElementById("LLM-btn")?.classList.remove("active");
    document.getElementById("Template-btn")?.classList.add("active");
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
              <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='showN8NView()'>
                <div class="plus">+</div>
                <h2 class="title">Build from Scratch</h2>
                <p>Transform your idea into an AI agent</p>
              </div>
            </div>
          `;

          // Dynamic template cards
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
                      Build Now
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
              <div class="box-cover-2 create-new-template" style="cursor:pointer;" onclick='showN8NView()'>
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


// Reload LLM List (LLM tab)
function reloadLLMData() {
  var llmListContainer = document.getElementById("llm-list-container");
  if (llmListContainer) {
    fetch("https://api.gignaati.com/api/Template/llmList?type=Chat")
      .then((res) => res.json())
      .then((data) => {

        if (data && data.data && Array.isArray(data.data)) {

          var footerElement = document.getElementById("footer");
          var llmList = data.data;
          if (footerElement) {
            if (llmList.length == 0) {
              footerElement.classList.add("active");
            } else {
              footerElement.classList.remove("active");
            }
          }



          llmListContainer.innerHTML = data.data
            .map((llm, idx) => {
              var imgSrc =
                llm.imageUrl && llm.imageUrl !== "string"
                  ? "https://api.gignaati.com" + llm.imageUrl
                  : "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=400&h=300";

              const tagsHTML = llm.tags && llm.tags.length > 0
                ? llm.tags.map(tag => `<li>${tag}</li>`).join("")
                : "<li></li>";

              return `
              <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-12 mb-3">
                <div class="llm-box">
                  <div class="tamplate-img" style="text-align:center; margin-bottom:10px;">
                    <img src="${imgSrc}" alt="" 
                         style="width:100%; max-height:200px; border-radius:8px; " />
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
              <div style="font-size: 14px; color: #555; margin-top: 2px;     margin-bottom: 4px;font-weight: 500;">System Requirements:</div>
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
              </div></div>
              </div>
          
                  <button 
                    type="button" 
                    class="btn btn-primary custom-btn custom-btn-white" 
                    style="margin-top:16px;"
                    onclick="downloadLlmModel('${llm.command}')"
                  >
                    Configure
                  </button>
                </div>
              </div>
            `;
            })
            .join("");
        } else {
          llmListContainer.innerHTML =
            '<div class="col-12">No models found.</div>';
        }
      })
      .catch(() => {
        llmListContainer.innerHTML =
          '<div class="col-12 text-danger">Failed to load models.</div>';
      });
  }
}

// === Attach to Navbar Buttons ===
document.addEventListener("DOMContentLoaded", () => {
  const dashboardBtn = document.getElementById("Dashboard-btn");
  const buildBtn = document.getElementById("Build-btn");
  const llmBtn = document.getElementById("LLM-btn");
  const templateBtn = document.getElementById("Template-btn");

  if (dashboardBtn) dashboardBtn.addEventListener("click", reloadDashboardData);
  if (templateBtn) templateBtn.addEventListener("click", reloadTemplateData);
  if (llmBtn) llmBtn.addEventListener("click", reloadLLMData);
  if (buildBtn)
    buildBtn.addEventListener("click", () => {
      // No API call for build tab yet, but you can add later if needed
      console.log("Build tab clicked - no API to reload");
    });
});

async function validateAndStartJourney() {
  try {
    // const res = await fetch("http://localhost:5000/api/Provisioning/4");
    // const data = await res.json();
    // if (
    //   data &&
    //   data.success === true &&
    //   data.message ===
    //   "n8n and Ollama are installed and running via Docker Compose."
    // ) 
    // {
    //   const systeminfo = document.getElementById("system-info");
    //   systeminfo.style.display = "none";
    //   StartJourney();
    // } 
    // else {
    //   showToast("Please complete step 1 & step 2 and try again!", false);
    // }

    // const systeminfo = document.getElementById("system-info");
    // systeminfo.style.display = "none";
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
      //openN8NInApp();
      showN8NView();
      //btn.innerText = "Copied!";
      setTimeout(() => {
        btn.innerText = "Build Now";
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

