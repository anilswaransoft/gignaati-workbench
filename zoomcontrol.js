      // Disable zooming using keyboard shortcuts and mouse wheel
      window.addEventListener("keydown", function (e) {
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")
        ) {
          e.preventDefault();
        }
      });

      window.addEventListener(
        "wheel",
        function (e) {
          if (e.ctrlKey) {
            e.preventDefault();
          }
        },
        { passive: false }
      );

      // Optional: disable pinch zoom (mobile/touchscreen)
      document.addEventListener("gesturestart", function (e) {
        e.preventDefault();
      });
      document.addEventListener("gesturechange", function (e) {
        e.preventDefault();
      });
      document.addEventListener("gestureend", function (e) {
        e.preventDefault();
      });

    