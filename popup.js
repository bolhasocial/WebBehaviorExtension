document.addEventListener("DOMContentLoaded", function() {
  const constants = {
    LOADING_ACTIVE: "loading-active",
    LOADING_INACTIVE: "loading-inactive",
    LOAD_NEW_HISTORY: "load-new-history",
    LOAD_CURRENT_HISTORY: "load-current-history"
  };

  const Storage = window.localStorage;
  const reloadLastGist = document.querySelector("#reload-last-gist");
  const loadNewGist = document.querySelector("#load-new-gist");
  const loading = document.querySelector(".loading");
  const port = chrome.extension.connect({ name: "bolha-social" });

  if (Storage.getItem("isCompleted")) {
    reloadLastGist.classList.remove("hidden");
  }

  reloadLastGist.addEventListener("click", event => {
    port.postMessage(constants.LOAD_CURRENT_HISTORY);

    loading.classList.add("active");
  });

  loadNewGist.addEventListener("click", event => {
    Storage.removeItem("isCompleted");

    port.postMessage(constants.LOAD_NEW_HISTORY);

    loading.classList.add("active");
  });

  chrome.extension.onConnect.addListener(port => {
    console.log("Connected with Background.js");

    port.onMessage.addListener(messageFromBg => {
      if (messageFromBg === constants.LOADING_ACTIVE) {
        loading.classList.add(".active");
      }

      if (messageFromBg === constants.LOADING_INACTIVE) {
        loading.classList.add(".active");
      }

      console.log("Message recieved from background - " + messageFromBg);
    });
  });
});
