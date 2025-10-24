fetch("http://45.114.245.191:8085/api/UpcomingUpdate")
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    const container = document.getElementById("update-list");

    data.data.forEach((item) => {
      // Create column div
      const li = document.createElement("li");
      li.id = `${item.id}`;
      // Template box
      li.innerHTML = `
           <h4 class="title">${item.title} </h4>
                      <p class="description">${item.description}</p>
                      <p><span>${item.releaseDate}</span></p>
        `;

      container.appendChild(li);
    });
  })
  .catch((error) => console.error("Error loading templates:", error));
