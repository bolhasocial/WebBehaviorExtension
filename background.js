"use strict";

(function(firebase) {
  // CONFIFURATION DATA
  var MAX_RESULTS = 100000,
    SIX_MONTHS_IN_MILISECONDS = 15552000000.3,
    EMPTY_STRING = "",
    NOW = new Date().getTime(),
    AUTH_DOMAIN = "web-behavior.firebaseapp.com",
    DATABBASE_URL = "https://web-behavior.firebaseio.com",
    API_KEY = "AIzaSyBTJb1GOaYeWRLUD8NcTUt9GrTwR6coQMc",
    PROJECT_ID = "web-behavior",
    MESSAGING_SENDER_ID = "112299024994";

  // LOCAL STORAGE DATA
  var Storage = window.localStorage,
    currentUserId = Storage.getItem("userId"),
    isCompleted = Storage.getItem("isCompleted");

  // DATABASE ENDPOINTS
  var HISTORY_DATA = "history-data/",
    HISTORY_RECORDS = "/history-records/",
    HISTORY_GIST = "/history-gist/";

  // RESULTS INFORMATION
  var HOST = "http://bolhasocial.com",
    RESULTS_PATH = "/results";

  var firebaseConfiguration = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    databaseURL: DATABBASE_URL,
    projectId: PROJECT_ID,
    storageBucket: EMPTY_STRING,
    messagingSenderId: MESSAGING_SENDER_ID
  };

  var chromeHistorySearchConfiguration = {
    text: EMPTY_STRING,
    maxResults: MAX_RESULTS,
    startTime: SIX_MONTHS_IN_MILISECONDS
  };

  var port = chrome.extension.connect({
    name: "Sample Communication"
  });

  firebase.initializeApp(firebaseConfiguration);

  firebase.database();

  function writeUserHistoryData(userId, data) {
    firebase
      .database()
      .ref(HISTORY_DATA + userId + HISTORY_RECORDS + "date-" + NOW)
      .set(data);
  }

  function writeUserHistoryGistData(userId, data) {
    firebase
      .database()
      .ref(HISTORY_DATA + userId + HISTORY_GIST + "date-" + NOW)
      .set(data);
  }

  function gguid() {
    return (1 * new Date().getTime() * -1)
      .toString()
      .replace("-", EMPTY_STRING);
  }

  function getProcessedHistoryData(historyData, categoriesList) {
    return historyData.map(historyItem => {
      var selectedCategory = categoriesList.find(category => {
        return category.terms.find(term => {
          return historyItem.url.indexOf(term) !== -1;
        });
      });

      return Object.assign(
        {
          category: (selectedCategory && selectedCategory.title) || EMPTY_STRING
        },
        historyItem
      );
    });
  }

  function getCategoriesList(categories) {
    var categories = categories.val();

    return Object.keys(categories).map(key => categories[key]);
  }

  function getTotalsPerCategory(categoriesList, historyData) {
    return categoriesList
      .map(category => {
        var filteredHistoryData = historyData.filter(
          item => item.category === category.title
        );

        var categoryOccurances = filteredHistoryData.length;

        var categoryPercentage =
          (categoryOccurances * 100) / historyData.length;

        return {
          categoryTitle: category.title,
          categoryOccurances: categoryOccurances,
          categoryPercentage: categoryPercentage
        };
      })
      .sort(
        (itemA, itemB) => itemB.categoryPercentage - itemA.categoryPercentage
      );
  }

  function getHistoryGist(historyData, categoriesList) {
    console.log(
      "getTotalsPerCategory(categoriesList, historyData)",
      getTotalsPerCategory(categoriesList, historyData)
    );
    return {
      totalHistoryAmount: historyData.length,
      totalPerCategory: getTotalsPerCategory(categoriesList, historyData)
    };
  }

  function getCategories(callback) {
    firebase
      .database()
      .ref("/categories/")
      .once("value")
      .then(callback);
  }

  function openInNewTab(url) {
    setTimeout(() => {
      var win = window.open(url, "_blank");
      win.focus();
    }, 10000);
  }

  // Connection with Popup.js
  chrome.extension.onConnect.addListener(port => {
    console.log("Connected with Popup.js");
    port.onMessage.addListener(msg => {
      if (msg === "reload-last-history") {
        openInNewTab(HOST + RESULTS_PATH + "/#" + currentUserId);
      }

      if (msg === "load-new-history") {
        loadHistory();
      }
      console.log("Message recieved from popup - " + msg);
    });
  });

  if (isCompleted) {
    return;
  }

  function loadHistory() {
    chrome.history.search(chromeHistorySearchConfiguration, historyData =>
      getCategories(categoriesData => {
        var categoriesList = getCategoriesList(categoriesData);

        var processedHistoryData = getProcessedHistoryData(
          historyData,
          categoriesList
        );

        var historyGist = getHistoryGist(processedHistoryData, categoriesList);

        if (currentUserId) {
          writeUserHistoryData(currentUserId, processedHistoryData);
          writeUserHistoryGistData(currentUserId, historyGist);

          openInNewTab(HOST + RESULTS_PATH + "/#" + currentUserId);

          port.postMessage("loading-inactive");
          Storage.setItem("isCompleted", "completed");
        } else {
          var newUserId = gguid();

          writeUserHistoryData("user-" + newUserId, processedHistoryData);
          writeUserHistoryGistData("user-" + newUserId, historyGist);

          Storage.setItem("userId", "user-" + newUserId);

          openInNewTab(HOST + RESULTS_PATH + "/#user-" + newUserId);

          port.postMessage("loading-inactive");
          Storage.setItem("isCompleted", "completed");
        }
      })
    );
  }

  loadHistory();
})(firebase);
