fetch("http://45.114.245.191:8085/api/Template")
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    const container = document.getElementById("templates-container");

    data.data.forEach((item) => {
      // Create column div
      const col = document.createElement("div");
      col.className = "col-xl-4 col-lg-4 col-md-6 col-sm-12 col-12 mb-3";

      // Template box
      col.innerHTML = `
          <div class="tamplates-box">
            <div class="tamplates-img">
              <img src="http://45.114.245.191:8085${item.imageUrl}" alt="${item.title}" />
            </div>
            <h2 class="tamplate-title">${item.name}</h2>
            <p class="tamplate-description">${item.description}</p>
            <div class="tamplate-btn-grp">
              <button type="button" class="btn btn-primary form-btn-tab custom-btn2 w-50">
                Copy Json
              </button>
              <button type="button" class="btn btn-primary form-btn-tab custom-btn2 w-50">
                Use Template
              </button>
            </div>
          </div>
        `;

      container.appendChild(col);
    });
  })
  .catch((error) => console.error("Error loading templates:", error));
