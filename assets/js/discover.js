/* CHRONICLE — Member 1: interactive lifecycle on the Discover page. */
document.addEventListener("DOMContentLoaded", function () {
  const steps = {
    create: {
      title: "01 / CREATE",
      text: "Write a message, give it a title, and choose the future date on which it can be opened."
    },
    seal: {
      title: "02 / SEAL",
      text: "Choose yourself or another Chronicle user as the recipient. Review the details and privacy before sealing your capsule."
    },
    wait: {
      title: "03 / WAIT",
      text: "In the complete Chronicle project, your sealed capsule waits in My Vault until its chosen unlock date arrives."
    },
    unlock: {
      title: "04 / UNLOCK",
      text: "Open the message when its date arrives. Relive the memory, or continue its journey with a new linked capsule."
    }
  };

  const buttons = document.querySelectorAll(".workflow-step");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (item) {
        item.classList.remove("is-active");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
      const step = steps[button.dataset.step];
      document.getElementById("step-detail-title").textContent = step.title;
      document.getElementById("step-detail-text").textContent = step.text;
    });
  });
});
