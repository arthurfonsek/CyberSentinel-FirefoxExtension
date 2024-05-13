const thirdPDICT = {};
const cookiesDICT = {};
const storageDICT = {};
const hijackingDICT = {};
const suspectDICT = {};

//SETUP

//funcao para verificar qual eh o dominio base e se eh terceiro
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const url = new URL(details.url);
    const domain = url.hostname;
    const tabId = details.tabId;
    if (tabId < 0) return; 
    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError) {
    
        return;
      }
      const tabDomain = new URL(tab.url).hostname;
      const baseDomain = getBaseDomain(domain);
      const baseTabDomain = getBaseDomain(tabDomain);
      if (baseDomain !== baseTabDomain) {
        if (!thirdPDICT[tabId]) {
          thirdPDICT[tabId] = new Set();
        }
        thirdPDICT[tabId].add(domain);
      }
    });
  },
  { urls: ["<all_urls>"] },
  []
);

//funcao para zerar o gradeScore quando a pagina é recarregada
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading') {
    gradeScore = 0;
  }
});

//funcao para zerar o gradeScore quando a aba é fechada
chrome.tabs.onRemoved.addListener(function (tabId) {
  delete thirdPDICT[tabId];
  gradeScore = 0;
});

//3RD PARTY

//funcao para pegar o dominio base e utilziar no check de terceiros
function getBaseDomain(domain) {
  const parts = domain.split('.').reverse();
  if (parts.length >= 2) {
    const tld = parts[0];
    const sld = parts[1];
    return `${sld}.${tld}`;
  }
  return domain;
}

//STORAGE
function checkStorageForTab(tabId, sendResponse) {
  chrome.tabs.executeScript(tabId, {
    code: `({
      localStorageCount: Object.keys(localStorage).length,
      sessionStorageCount: Object.keys(sessionStorage).length
    })`
  }, function (results) {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      const storageCounts = results[0];
      storageDICT[tabId] = storageCounts;
      sendResponse({ data: storageCounts });
    }
  });
}

//COOKIES
function countCookies(tabId, domain) {
  return new Promise(resolve => {
    chrome.cookies.getAll({}, function (cookies) {
      const details = {
        total: cookies.length,
        firstParty: 0,
        thirdParty: 0,
        sessionCookies: 0,
        persistentCookies: 0
      };
      cookies.forEach(cookie => {
        if (cookie.domain === domain) {
          details.firstParty++;
        } else {
          details.thirdParty++;
        }

        if ("session" in cookie && cookie.session) {
          details.sessionCookies++;
        } else {
          details.persistentCookies++;
        }
      });

      cookiesDICT[tabId] = details;
      resolve(details);
    });
  });
}

//PORTS (HOOK & SUSPECT)
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const url = new URL(details.url);
    const port = url.port || (url.protocol === "https:" ? 443 : 80);  
    const tabId = details.tabId;
    if (tabId < 0) return; 
    if (!suspectDICT[tabId]) {
      suspectDICT[tabId] = false;
    }

    if (port !== "80" && port !== "443") {
      suspectDICT[tabId] = true;
    } else {
      suspectDICT[tabId] = false;
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

//GRADE
function calculateScore(tabId) {
  //ideia: 10 pontos, -1 se houver hijacking, -0.05 por cada terceiro, -0.005 por cada cookie, -0.05 por cada storage

  let gradeScore = 10;

  //pesos
  gradeScore = gradeScore - (0.05 * thirdPDICT[tabId].size);
  gradeScore = gradeScore - (0.005 * cookiesDICT[tabId].total);
  gradeScore = gradeScore - (0.05 * storageDICT[tabId].localStorageCount);
  gradeScore = Math.max(0, gradeScore);

  if (suspectDICT[tabId] || false) {
    gradeScore -= 1;
  }
  
  if (gradeScore > 8) {
    return 'Great!\n Good job!\n';
  }
  else if (gradeScore > 6) {
    return 'Good!\n Keep it up!\n';
  }
  else if (gradeScore > 4) {
    return 'Nice!\n You can do better!\n';
  }
  else if (gradeScore > 2) {
    return 'Poor!\n You need to improve!\n';
  }
  else {
    return 'Bad!\n You need to take action!\n';
  }
}

//MAIN
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  //caso alguem clique no botao de cookies
  //cookies
  if (msg.action === "countCookies") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        countCookies(tabs[0].id, msg.domain).then(cookieDetails => {
          sendResponse(cookieDetails);
        });
      } else {
        sendResponse({ error: "No active tab found" });
      }
    });
    return true; 
  }

  //caso alguem clique no botao de ports hijacking
  if (msg.action === "checkPorts") {
    const tabId = msg.tabId; 
    const isSuspect = suspectDICT[tabId] || false;  
    hijackingDICT[tabId] = isSuspect;
    sendResponse({ suspect: isSuspect });
  }

  //caso alguem clique no botao de terceiros
  if (msg.action === 'getThirdPartyDomains') {
    sendResponse(Array.from(thirdPDICT[msg.tabId] || []));
  }

  //caso alguem clique no botao de storage
  if (msg.action === "checkStorage") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        checkStorageForTab(tabs[0].id, sendResponse);
      } else {
        sendResponse({ error: "No active tab found" });
      }
    });
    return true;
  }

  //caso alguem clique no botao de canvasFingerPrint
  if (msg.action === 'canvasFingerprintDetected') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!chrome.runtime.lastError && tabs.length > 0) {
        chrome.browserAction.setBadgeText({ text: '!', tabId: tabs[0].id });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabs[0].id });
      }
    });
    sendResponse({ status: 'Detection alert updated' });
    return true;
  }

  //caso alguem clique no botao de score
  if (msg.action === "calculateScore") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        const currentTabId = tabs[0].id;
        const grade = calculateScore(currentTabId);
        sendResponse({ grade: grade });
      } else {
        sendResponse({ error: "No active tab found" });
      }
    });
    return true; 
  }
});


