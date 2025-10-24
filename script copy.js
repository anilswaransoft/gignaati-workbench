const handleFilterTab = (target) => {
  if (target === "Build") {
    document.getElementById("dashboard-area-container").style.display = "none";
    document.getElementById("build-area-container").style.display = "block";
    document.getElementById("tamplates-area-container").style.display = "none";
    document.getElementById("llm-area-container").style.display = "none"
  } else if (target === "Dashboard") {
    document.getElementById("dashboard-area-container").style.display = "block";
    document.getElementById("build-area-container").style.display = "none";
    document.getElementById("tamplates-area-container").style.display = "block";
    document.getElementById("llm-area-container").style.display = "none"
  }
   else if (target === "LLM") {
    document.getElementById("dashboard-area-container").style.display = "none";
    document.getElementById("build-area-container").style.display = "none";
    document.getElementById("tamplates-area-container").style.display = "none";
    document.getElementById("llm-area-container").style.display = "block"
  }
  
  else {
    document.getElementById("dashboard-area-container").style.display = "block";
    document.getElementById("build-area-container").style.display = "none";
    document.getElementById("tamplates-area-container").style.display = "block";
    document.getElementById("llm-area-container").style.display = "none"
  }
};


const templateList = document.getElementById("template-list");
// Fetch API
fetch("http://45.114.245.191:8085/api/Template/llmList")
  .then((response) => response.json())
  .then((data) => {
    // Clear existing items (optional)
    templateList.innerHTML = "";
    // Loop through API response and create <li> for each item
    data.data.forEach((template) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = template.value || JSON.stringify(template); // adjust based on API structure
      li.appendChild(button);
      templateList.appendChild(li);
    });
  })
  .catch((error) => {
    console.error("Error fetching templates:", error);
    templateList.innerHTML = "<li>Failed to load templates</li>";
  });
