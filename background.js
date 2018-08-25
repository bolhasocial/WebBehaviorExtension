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
    MESSAGING_SENDER_ID = "112299024994",
    PROJECT_NAME = "bolha-social";

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

  // POPUP STATES
  var LOADING_INACTIVE = "loading-inactive",
    LOAD_NEW_HISTORY = "load-new-history",
    LOAD_CURRENT_HISTORY = "load-current-history";

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

  var port = chrome.extension.connect({ name: PROJECT_NAME });

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

  function openInNewTab(url, timeout) {
    var localTimeout = timeout || 10000;
    setTimeout(() => {
      var win = window.open(url, "_blank");
      win.focus();
    }, localTimeout);
  }

  // Connection with Popup.js
  chrome.extension.onConnect.addListener(port => {
    console.log("Connected with Popup.js");

    port.onMessage.addListener(messageFromPopup => {
      if (messageFromPopup === LOAD_CURRENT_HISTORY) {
        openInNewTab(HOST + RESULTS_PATH + "/#" + currentUserId, 10);
      }

      if (messageFromPopup === LOAD_NEW_HISTORY) {
        loadHistory();
      }

      console.log("Message recieved from popup - " + messageFromPopup);
    });
  });

  if (isCompleted) {
    return;
  }

  function writeHistoryFromUser(userId, processedHistoryData, historyGist) {
    writeUserHistoryData(userId, processedHistoryData);
    writeUserHistoryGistData(userId, historyGist);

    openInNewTab(HOST + RESULTS_PATH + "/#" + userId);

    port.postMessage(LOADING_INACTIVE);

    Storage.setItem("isCompleted", "completed");
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
          writeHistoryFromUser(
            currentUserId,
            processedHistoryData,
            historyGist
          );
        } else {
          var newUserId = gguid();
          writeHistoryFromUser(
            "user-" + newUserId,
            processedHistoryData,
            historyGist
          );
        }
      })
    );
  }

  loadHistory();
})(firebase);
