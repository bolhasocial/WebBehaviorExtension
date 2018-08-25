document.addEventListener("DOMContentLoaded", function() {
  const Storage = window.localStorage;
  const currentUserId = Storage.getItem("userId");
  const reloadLastGist = document.querySelector("#reload-last-gist");
  const loadNewGist = document.querySelector("#load-new-gist");
  const loading = document.querySelector(".loading");
  const port = chrome.extension.connect({
    name: "Sample Communication"
  });

  // RESULTS INFORMATION
  const HOST = "http://bolhasocial.com";
  const RESULTS_PATH = "/results";

  function openInNewTab(url) {
    setTimeout(() => {
      var win = window.open(url, "_blank");
      win.focus();
    }, 10000);
  }

  if (Storage.getItem("isCompleted")) {
    reloadLastGist.classList.remove("hidden");
  }

  reloadLastGist.addEventListener("click", event => {
    openInNewTab(HOST + RESULTS_PATH + "/#" + currentUserId);

    loading.classList.add("active");
  });

  loadNewGist.addEventListener("click", event => {
    Storage.removeItem("isCompleted");

    port.postMessage("load-new-history");

    loading.classList.add("active");
  });

  chrome.extension.onConnect.addListener(port => {
    console.log("Connected with Background.js");
    port.onMessage.addListener(msg => {
      if (msg === "loading-active") {
        loading.classList.add(".active");
      }

      if (msg === "loading-inactive") {
        loading.classList.add(".active");
      }
      console.log("Message recieved from background - " + msg);
    });
  });
});
