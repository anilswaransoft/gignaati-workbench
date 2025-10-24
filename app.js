// async function detectSoftware(id, retry = true) {
//   const url = `http://localhost:5000/api/DetectSoftware/${id}`;
//   try {
//     const response = await fetch(url, {
//       method: "GET",
//       headers: { Accept: "application/json" },
//     });
//     if (!response.ok) {
//       throw new Error(`API returned status ${response.status}`);
//     }
//     let data = await response.json();
//     if (retry) {
//       if (data == "Docker is installed, but no containers are running.") {
//         document.querySelector("#docker-status1").textContent =
//           "Docker is already installed. Click Run Docker to continue. if Docker not automatically Start then Start manually";

//         const btn = document.querySelector("#install-docker-btn");
//         btn.disabled = true;
//         btn.style.backgroundColor = "#e3c159";

//         document.querySelector("#setup-step-one").classList.add("completed");
//         document.querySelector("#setup-step-one").classList.remove("active");
//         document.querySelector("#step-icon-one").textContent = "\u2713";

//         const runDockerBtn = document.querySelector("#run-docker-btn");
//         runDockerBtn.disabled = false;
//         runDockerBtn.style.backgroundColor = "#ffc107";

//         logToConsole("Docker is installed, but no containers are running.", "success");
//       }

//       if (data == "Docker not installed. 'docker' command not found.") {
//         document.querySelector("#docker-status1").textContent =
//           "Docker is not installed";

//         document.querySelector("#setup-step-one").classList.add("active");
//         document.querySelector("#setup-step-one").classList.remove("completed");
//         document.querySelector("#step-icon-one").textContent = "";

//         const runDockerBtn = document.querySelector("#run-docker-btn");
//         runDockerBtn.disabled = true;
//         runDockerBtn.style.backgroundColor = "#e3c159";

//         logToConsole("Docker is not installed. Please install", "info");
//       }

//       if (data == "n8n is installed in Docker.") {
//         document.querySelector("#n8n-status").textContent =
//           "n8n is already installed in Docker Container.";

//         const btn = document.querySelector("#n8n-btn");
//         btn.disabled = true;
//         btn.style.backgroundColor = "#e3c159";

//         document.querySelector("#setup-step-two").classList.add("completed");
//         document.querySelector("#setup-step-two").classList.remove("active");
//         document.querySelector("#step-icon-two").textContent = "\u2713";

//         const n8nNextBtn = document.querySelector("#n8n-next-btn");
//         n8nNextBtn.disabled = false;
//         n8nNextBtn.style.backgroundColor = "#ffc107";
//         logToConsole("n8n is already installed in Docker.", "success");
//       }

//       if (data == "n8n is not installed in Docker.") {
//         document.querySelector("#n8n-status").textContent =
//           "n8n is not installed in Docker.";

//         document.querySelector("#setup-step-two").classList.add("active");
//         document.querySelector("#setup-step-two").classList.remove("completed");
//         document.querySelector("#step-icon-two").textContent = "";

//         const n8nNextBtn = document.querySelector("#n8n-next-btn");
//         n8nNextBtn.disabled = true;
//         n8nNextBtn.style.backgroundColor = "#e3c159";
//         logToConsole("n8n is not installed in Docker. Please install", "info");
//       }

//       if (data == "ollama is installed in Docker.") {
//         document.querySelector("#ollama-status").textContent =
//           "Ollama is already installed in Docker Container.";
//         const btn = document.querySelector("#ollama-btn");
//         btn.disabled = true;
//         btn.style.backgroundColor = "#e3c159";

//         document.querySelector("#setup-step-three").classList.add("completed");
//         document.querySelector("#setup-step-three").classList.remove("active");
//         document.querySelector("#step-icon-three").textContent = "\u2713";

//         const ollamNextBtn = document.querySelector("#ollam-next-btn");
//         ollamNextBtn.disabled = false;
//         ollamNextBtn.style.backgroundColor = "#ffc107";
//         logToConsole("ollama is installed in Docker.", "success");
//       }

//       if (data == "ollama is not installed in Docker.") {
//         document.querySelector("#ollama-status").textContent =
//           "ollama is not installed in Docker.";

//         document.querySelector("#setup-step-three").classList.add("active");
//         document
//           .querySelector("#setup-step-three")
//           .classList.remove("completed");
//         document.querySelector("#step-icon-three").textContent = "";

//         const ollamNextBtn = document.querySelector("#ollam-next-btn");
//         ollamNextBtn.disabled = true;
//         ollamNextBtn.style.backgroundColor = "#e3c159";
//         logToConsole(
//           "ollama is not installed in Docker. Please install",
//           "info"
//         );
//       }
//     }

//     return data;
//   } catch (err) {
//     throw new Error(`Fetch error: ${err.message}`);
//   }
// }

// async function runDocker() {
//   if (window.electronAPI && window.electronAPI.openDockerDesktop) {
//     window.electronAPI.openDockerDesktop();
//     logToConsole("Attempting to open Docker Desktop...", "info");
//     const result = await detectDockerRunning();
//     if (result.success) {
//       document.querySelector("#step1").classList.remove("active");
//       document.querySelector("#step2").classList.add("active");
//       document.querySelector("#step3").classList.remove("active");
//       document.querySelector("#step4").classList.remove("active");
//       // await detectSoftware(2);
//       const detectSoftwareResult = await detectSoftware(2);
//     } else {
//       // document.querySelector("#n8n-status").textContent = "Docker is Starting Please wait...";
//     }
//   } else {
//     logToConsole(
//       "Docker Desktop could not be opened. Please restart your computer and try running it manually.",
//       "error"
//     );
//   }
// }

// async function detectDockerRunning() {
//   const url = `http://localhost:5000/DockerRunningStatus`;

//   try {
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`API returned status ${response.status}`);
//     }
//     let data = await response.json();
//     return data; // Expect { success: bool, message: string }
//   } catch (err) {
//     throw new Error(`Fetch error: ${err.message}`);
//   }
// }

// async function moveToNext(step) {
//   if (step === "step3") {
//     document.querySelector("#step1").classList.remove("active");
//     document.querySelector("#step2").classList.remove("active");
//     document.querySelector("#step3").classList.add("active");
//     document.querySelector("#step4").classList.remove("active");
//     const detectSoftwareResult = await detectSoftware(3);
//   }
//   if (step === "step4") {
//     document.querySelector("#step1").classList.remove("active");
//     document.querySelector("#step2").classList.remove("active");
//     document.querySelector("#step3").classList.remove("active");
//     document.querySelector("#step4").classList.add("active");
//   }
// }

// // General API call function for provisioning steps
// async function callProvisioningStep(stepNumber) {
//   const url = `http://localhost:5000/api/provisioning/${stepNumber}`;
//   if (stepNumber == 1) {
//     const btn = document.querySelector("#install-docker-btn");
//     btn.disabled = true;
//     btn.style.backgroundColor = "#e3c159";
//     document.querySelector("#docker-status1").textContent = "";
//     logToConsole("Installing Docker... please wait.", "wait");
//   }
//   if (stepNumber == 2) {
//     const btn = document.querySelector("#n8n-btn");
//     btn.disabled = true;
//     btn.style.backgroundColor = "#e3c159";
//   }
//   if (stepNumber == 3) {
//     const btn = document.querySelector("#ollama-btn");
//     btn.disabled = true;
//     btn.style.backgroundColor = "#e3c159";
//   }
//   try {
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`API returned status ${response.status}`);
//     }
//     let data = await response.json();

//     if (stepNumber == 1) {
//       let detectSoftwareInterval = setInterval(async () => {
//         const detectSoftwareResult = await detectSoftware(1, false);

//         // If n8n is installed in Docker, stop the interval
//         if (detectSoftwareResult === "Docker is installed, but no containers are running.") {
//           clearInterval(detectSoftwareInterval); // Stop the interval when condition is met

//           document.querySelector("#docker-status1").textContent =
//             "Docker is already installed. Click Run Docker to continue. if Docker not automatically Start then Start manually";

//           const btn = document.querySelector("#install-docker-btn");
//           btn.disabled = true;
//           btn.style.backgroundColor = "#e3c159";

//           document.querySelector("#setup-step-one").classList.add("completed");
//           document.querySelector("#setup-step-one").classList.remove("active");
//           document.querySelector("#step-icon-one").textContent = "\u2713";

//           const runDockerBtn = document.querySelector("#run-docker-btn");
//           runDockerBtn.disabled = false;
//           runDockerBtn.style.backgroundColor = "#ffc107";

//           logToConsole("Docker is installed.", "success");
//         }
//       }, 20000);
//     }

//     return data; // Expect { success: bool, message: string }
//   } catch (err) {
//     logToConsole(`Fetch error: ${err.message}`, "error");
//     throw new Error(`Fetch error: ${err.message}`);
//   }
// }

// async function installN8N() {
//   const result = await detectDockerRunning();

//   if (result.success) {
//     logToConsole("Installing n8n... please wait.", "wait");
//     try {
//       const results = await callProvisioningStep(2);

//       if (results.success) {
//         // alert(results.message, results.success);
//       } else {
//         // logToConsole(`Ollama install failed: ${results.message}`, "error");
//         // alert(results.message, results.success);
//       }

//       let detectSoftwareInterval = setInterval(async () => {
//         const detectSoftwareResult = await detectSoftware(2, false);

//         // If n8n is installed in Docker, stop the interval
//         if (detectSoftwareResult === "n8n is installed in Docker.") {
//           clearInterval(detectSoftwareInterval); // Stop the interval when condition is met

//           document.querySelector("#n8n-status").textContent =
//             "n8n is already installed in Docker Container.";

//           const btn = document.querySelector("#n8n-btn");
//           btn.disabled = true;
//           btn.style.backgroundColor = "#e3c159";

//           document.querySelector("#setup-step-two").classList.add("completed");
//           document.querySelector("#setup-step-two").classList.remove("active");
//           document.querySelector("#step-icon-two").textContent = "\u2713";

//           const n8nNextBtn = document.querySelector("#n8n-next-btn");
//           n8nNextBtn.disabled = false;
//           n8nNextBtn.style.backgroundColor = "#ffc107";

//           logToConsole("n8n is installed in Docker.", "success");
//         }
//       }, 20000);
//     } catch (err) {
//       updateStatus("ollama", "Error", "error");
//     }
//   }
// }

// async function installOllama() {
//   logToConsole("Installing Ollama... please wait.", "wait");
//   try {
//     const result = await callProvisioningStep(3);
//     if (result.success) {
//       // alert(result.message, result.success);
//     } else {
//       // logToConsole(`Ollama install failed: ${result.message}`, "error");
//       // alert(result.message, result.success);
//     }
//     // Call status API after install
//     let detectSoftwareInterval = setInterval(async () => {
//       const detectSoftwareResult = await detectSoftware(3, false);

//       // If n8n is installed in Docker, stop the interval
//       if (detectSoftwareResult === "ollama is installed in Docker.") {
//         clearInterval(detectSoftwareInterval); // Stop the interval when condition is met

//         const btn = document.querySelector("#ollama-btn");
//         btn.disabled = true;
//         btn.style.backgroundColor = "#e3c159";

//         document.querySelector("#setup-step-three").classList.add("completed");
//         document.querySelector("#setup-step-three").classList.remove("active");
//         document.querySelector("#step-icon-three").textContent = "\u2713";

//         const ollamNextBtn = document.querySelector("#ollam-next-btn");
//         ollamNextBtn.disabled = false;
//         ollamNextBtn.style.backgroundColor = "#ffc107";
//         logToConsole("ollama is installed in Docker.", "success");
//       }
//     }, 20000);
//   } catch (err) {
//     updateStatus("ollama", "Error", "error");
//   }
// }

// function logToConsole(text, type = "info") {
//   const consoleBox = document.getElementById("debug-console");
//   if (!consoleBox) return;
//   const div = document.createElement("div");
//   div.classList.add(`log-${type}`);
//   div.textContent = `> ${text}`;
//   consoleBox.appendChild(div);
//   consoleBox.scrollTop = consoleBox.scrollHeight;
// }

// function showVideo(videoId) {
//   console.log(`Showing video: ${videoId}`);
//   // Hide all iframes first
//   const videos = document.querySelectorAll("iframe");
//   console.log(`Hiding all videos: ${videos.length} found`);
//   videos.forEach((video) => {
//     video.style.display = "none";
//   });

//   // Show the clicked video iframe
//   const selectedVideo = document.getElementById(videoId);
//   console.log(`Selected video: ${selectedVideo}`);
//   selectedVideo.style.display = "block";
// }

// window.addEventListener("DOMContentLoaded", () => {
//   detectSoftware(1);
// });

async function detectSoftware(id, retry = true) {
  const url = `http://localhost:5000/api/DetectSoftware/${id}`;
  alert(`http://localhost:5000/api/DetectSoftware/${id}`);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    let data = await response.json();
    if (retry) {
      if (
        data.message == "Docker is installed, but no containers are running." ||
        data.message == "Docker is installed and running containers."
      ) {
        // document.querySelector("#docker-status1").textContent =
        //   "Docker is already installed. Click Run Docker to continue. if Docker not automatically Start then Start manually";

        const btn = document.querySelector("#install-docker-btn");
        btn.disabled = true;
        btn.style.backgroundColor = "#e3c159";

        document.querySelector("#setup-step-one").classList.add("completed");
        document.querySelector("#setup-step-one").classList.remove("active");
        document.querySelector("#step-icon-one").textContent = "\u2713";

        const runDockerBtn = document.querySelector("#run-docker-btn");
        runDockerBtn.disabled = false;
        runDockerBtn.style.backgroundColor = "#ffc107";

        logToConsole("Docker is installed", "success");
      }

      if (data.message == "Docker not installed. 'docker' command not found.") {
        // document.querySelector("#docker-status1").textContent =
        //   "Docker is not installed";

        document.querySelector("#setup-step-one").classList.add("active");
        document.querySelector("#setup-step-one").classList.remove("completed");
        document.querySelector("#step-icon-one").textContent = "";

        const runDockerBtn = document.querySelector("#run-docker-btn");
        runDockerBtn.disabled = true;
        runDockerBtn.style.backgroundColor = "#e3c159";

        logToConsole("Docker is not installed. Please install", "info");
      }

      if (
        data.message ==
        "n8n and Ollama are  installed or not running via Docker Compose."
      ) {
        // document.querySelector("#n8n-status").textContent =
        //   "n8n is already installed in Docker Container.";

        const btn = document.querySelector("#n8n-btn");
        btn.disabled = true;
        btn.style.backgroundColor = "#e3c159";

        document.querySelector("#setup-step-two").classList.add("completed");
        document.querySelector("#setup-step-two").classList.remove("active");
        document.querySelector("#step-icon-two").textContent = "\u2713";

        const n8nNextBtn = document.querySelector("#n8n-next-btn");
        n8nNextBtn.disabled = false;
        n8nNextBtn.style.backgroundColor = "#ffc107";
        logToConsole("n8n is already installed in Docker.", "success");
      }

      if (
        data.message ==
        "n8n and Ollama are not installed or not running via Docker Compose."
      ) {
        // document.querySelector("#n8n-status").textContent =
        //   "n8n and Ollama  are not installed in Docker Container.";

        document.querySelector("#setup-step-two").classList.add("active");
        document.querySelector("#setup-step-two").classList.remove("completed");
        document.querySelector("#step-icon-two").textContent = "";

        const n8nNextBtn = document.querySelector("#n8n-next-btn");
        n8nNextBtn.disabled = true;
        n8nNextBtn.style.backgroundColor = "#e3c159";
        logToConsole(
          "n8n and Ollama  are not installed in Docker Container. Please install",
          "info"
        );
      }

      // if (data == "ollama is installed in Docker.") {
      //   document.querySelector("#ollama-status").textContent =
      //     "Ollama is already installed in Docker Container.";
      //   const btn = document.querySelector("#ollama-btn");
      //   btn.disabled = true;
      //   btn.style.backgroundColor = "#e3c159";

      //   document.querySelector("#setup-step-three").classList.add("completed");
      //   document.querySelector("#setup-step-three").classList.remove("active");
      //   document.querySelector("#step-icon-three").textContent = "\u2713";

      //   const ollamNextBtn = document.querySelector("#ollam-next-btn");
      //   ollamNextBtn.disabled = false;
      //   ollamNextBtn.style.backgroundColor = "#ffc107";
      //   logToConsole("ollama is installed in Docker.", "success");
      // }

      // if (data == "ollama is not installed in Docker.") {
      //   document.querySelector("#ollama-status").textContent =
      //     "ollama is not installed in Docker.";

      //   document.querySelector("#setup-step-three").classList.add("active");
      //   document
      //     .querySelector("#setup-step-three")
      //     .classList.remove("completed");
      //   document.querySelector("#step-icon-three").textContent = "";

      //   const ollamNextBtn = document.querySelector("#ollam-next-btn");
      //   ollamNextBtn.disabled = true;
      //   ollamNextBtn.style.backgroundColor = "#e3c159";
      //   logToConsole(
      //     "ollama is not installed in Docker. Please install",
      //     "info"
      //   );
      // }
    }

    return data;
  } catch (err) {
    throw new Error(`Fetch error: ${err.message}`);
  }
}

async function runDocker() {
  if (window.electronAPI && window.electronAPI.openDockerDesktop) {
    window.electronAPI.openDockerDesktop();
    logToConsole("Attempting to open Docker Desktop...", "info");
    // const result = await detectDockerRunning();

    let detectDockerRunningInterval = setInterval(async () => {
      const detectDockerRunningResult = await detectDockerRunning(1);
      alert(detectDockerRunningResult);
      // If n8n is installed in Docker, stop the interval
      if (
        detectDockerRunningResult.message ===
        "Docker is installed and running containers."
      ) {
        const detectSoftwareResult = await detectSoftware(4);
        alert("44");
        clearInterval(detectDockerRunningInterval);
        document.querySelector("#step1").classList.remove("active");
        document.querySelector("#step2").classList.add("active");
        document.querySelector("#step3").classList.remove("active");
        document.querySelector("#step4").classList.remove("active");
        // Stop the interval when condition is met
      }
    }, 10000);
  } else {
    logToConsole(
      "Docker Desktop could not be opened. Please restart your computer and try running it manually.",
      "error"
    );
  }
}

async function detectDockerRunning(id) {
  const url = `http://localhost:5000/api/DetectSoftware/${id}`;

  try {
    const response = await fetch(url);
    alert(response);
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    let data = await response.json();
    return data; // Expect { success: bool, message: string }
  } catch (err) {
    throw new Error(`Fetch error: ${err.message}`);
  }
}

async function moveToNext(step) {
  if (step === "step3") {
    document.querySelector("#step1").classList.remove("active");
    document.querySelector("#step2").classList.remove("active");
    document.querySelector("#step3").classList.add("active");
    document.querySelector("#step4").classList.remove("active");
    // const detectSoftwareResult = await detectSoftware(3);
  }
  // if (step === "step4") {
  //   document.querySelector("#step1").classList.remove("active");
  //   document.querySelector("#step2").classList.remove("active");
  //   document.querySelector("#step3").classList.remove("active");
  //   document.querySelector("#step4").classList.add("active");
  // }
}

// General API call function for provisioning steps
async function callProvisioningStep(stepNumber) {
  const url = `http://localhost:5000/api/provisioning/${stepNumber}`;
  if (stepNumber == 1) {
    const btn = document.querySelector("#install-docker-btn");
    btn.disabled = true;
    btn.style.backgroundColor = "#e3c159";
    // document.querySelector("#docker-status1").textContent = "";
    logToConsole("Installing Docker... please wait.", "wait");
  }
  if (stepNumber == 4) {
    const btn = document.querySelector("#n8n-btn");
    btn.disabled = true;
    btn.style.backgroundColor = "#e3c159";
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    let data = await response.json();

    // if (
    //   data.message == "An error occurred: A task was canceled." &&
    //   data.success == false
    // ) {
    //   logToConsole("Installing Docker... please wait.", "wait");
    // }

    if (stepNumber == 1) {
      let detectSoftwareInterval = setInterval(async () => {
        const detectSoftwareResult = await detectSoftware(1, false);

        // If n8n is installed in Docker, stop the interval
        if (
          detectSoftwareResult.message ===
            "Docker is installed, but no containers are running." ||
          data.message == "Docker is installed and running containers."
        ) {
          clearInterval(detectSoftwareInterval); // Stop the interval when condition is met

          // document.querySelector("#docker-status1").textContent =
          //   "Docker is already installed. Click Run Docker to continue. if Docker not automatically Start then Start manually";

          const btn = document.querySelector("#install-docker-btn");
          btn.disabled = true;
          btn.style.backgroundColor = "#e3c159";

          document.querySelector("#setup-step-one").classList.add("completed");
          document.querySelector("#setup-step-one").classList.remove("active");
          document.querySelector("#step-icon-one").textContent = "\u2713";

          const runDockerBtn = document.querySelector("#run-docker-btn");
          runDockerBtn.disabled = false;
          runDockerBtn.style.backgroundColor = "#ffc107";

          logToConsole("Docker is installed.", "success");
        }
      }, 20000);
    }

    return data; // Expect { success: bool, message: string }
  } catch (err) {
    logToConsole(`Fetch error: ${err.message}`, "error");
    throw new Error(`Fetch error: ${err.message}`);
  }
}

async function installN8N() {
  // const result = await detectDockerRunning();

  // if (result.success) {
  logToConsole("Installing n8n with ollama... please wait.", "wait");
  try {
    const results = await callProvisioningStep(4);

    if (results.success) {
      // alert(results.message, results.success);
    } else {
      // logToConsole(`Ollama install failed: ${results.message}`, "error");
      // alert(results.message, results.success);
    }

    let detectSoftwareInterval = setInterval(async () => {
      const detectSoftwareResult = await detectSoftware(4, false);

      // If n8n is installed in Docker, stop the interval
      if (detectSoftwareResult === "n8n is installed in Docker.") {
        clearInterval(detectSoftwareInterval); // Stop the interval when condition is met

        // document.querySelector("#n8n-status").textContent =
        //   "n8n is already installed in Docker Container.";

        const btn = document.querySelector("#n8n-btn");
        btn.disabled = true;
        btn.style.backgroundColor = "#e3c159";

        document.querySelector("#setup-step-two").classList.add("completed");
        document.querySelector("#setup-step-two").classList.remove("active");
        document.querySelector("#step-icon-two").textContent = "\u2713";

        const n8nNextBtn = document.querySelector("#n8n-next-btn");
        n8nNextBtn.disabled = false;
        n8nNextBtn.style.backgroundColor = "#ffc107";

        logToConsole("n8n is installed in Docker.", "success");
      }
    }, 20000);
  } catch (err) {
    updateStatus("ollama", "Error", "error");
  }
  // }
}

function logToConsole(text, type = "info") {
  const consoleBox = document.getElementById("debug-console");
  if (!consoleBox) return;
  const div = document.createElement("div");
  div.classList.add(`log-${type}`);
  div.textContent = `> ${text}`;
  consoleBox.appendChild(div);
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function showVideo(videoId) {
  alert(`Showing video: ${videoId}`);
  // Hide all iframes first
  const videos = document.querySelectorAll("iframe");
  console.log(`Hiding all videos: ${videos.length} found`);
  videos.forEach((video) => {
    video.style.display = "none";
  });

  // Show the clicked video iframe
  const selectedVideo = document.getElementById(videoId);
  console.log(`Selected video: ${selectedVideo}`);
  selectedVideo.style.display = "block";
}

window.addEventListener("DOMContentLoaded", () => {
  detectSoftware(1);
});
