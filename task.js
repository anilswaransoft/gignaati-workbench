// let systemMonitorInterval;

// function startSystemMonitoring() {
//   // If monitoring is already running, don't start another interval
//   if (systemMonitorInterval) return;
  
//   // Start the monitoring interval
//   systemMonitorInterval = setInterval(() => {
//     const cpu = Math.floor(Math.random() * 100);
//     const gpu = Math.floor(Math.random() * 100);
//     const npu = Math.floor(Math.random() * 100);

//     document.getElementById("cpu-bar").style.width = cpu + "%";
//     document.getElementById("gpu-bar").style.width = gpu + "%";
//     document.getElementById("npu-bar").style.width = npu + "%";

//     document.getElementById("cpu-val").innerText = cpu + "%";
//     document.getElementById("gpu-val").innerText = gpu + "%";
//     document.getElementById("npu-val").innerText = npu + "%";
//   }, 1000);
// }

// function stopSystemMonitoring() {
//   // Clear the interval if it exists
//   if (systemMonitorInterval) {
//     clearInterval(systemMonitorInterval);
//     systemMonitorInterval = null;
//   }
// }