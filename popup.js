//COOKIES

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    var url = new URL(activeTab.url);
    var domain = url.hostname;

    chrome.runtime.sendMessage({action: "countCookies", domain: domain}, function(response) {
      document.getElementById('totalCookies').textContent = response.total;
      document.getElementById('firstPartyCookies').textContent = response.firstParty;
      document.getElementById('thirdPartyCookies').textContent = response.thirdParty;
      document.getElementById('sessionCookies').textContent = response.sessionCookies;
      document.getElementById('persistentCookies').textContent = response.persistentCookies;
    });
  });
});

//CANVAS

//FONTE https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D

const context = document.createElement('canvas').getContext('2d');
const originalToDataURL = CanvasRenderingContext2D.prototype.toDataURL;
CanvasRenderingContext2D.prototype.toDataURL = function() {
  alert('Canvas fingerprinting attempt detected!');
  chrome.runtime.sendMessage({action: 'canvasFingerprintDetected'});
  return originalToDataURL.apply(this, arguments);
};

const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
CanvasRenderingContext2D.prototype.getImageData = function() {
  alert('Canvas fingerprinting attempt detected!');
  chrome.runtime.sendMessage({action: 'canvasFingerprintDetected'});
  return originalGetImageData.apply(this, arguments);
};

document.addEventListener('DOMContentLoaded', function() {
  const statusDisplay = document.getElementById('status');
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0 && tabs[0].id != null) {
      chrome.browserAction.getBadgeText({tabId: tabs[0].id}, function(result) {
        if (!chrome.runtime.lastError) {
          if (result !== '') {
            statusDisplay.textContent = 'Canvas fingerprinting detected!';
          } else {
            statusDisplay.textContent = 'No canvas fingerprinting detected.';
          }
        }});
    } else {
      statusDisplay.textContent = 'No active tab detected.';
    }
  });
});

//3RD PARTY
document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.runtime.sendMessage({
          action: 'getThirdPartyDomains',
          tabId: tabs[0].id
        },
        function(response) {
          const domainList = document.getElementById('domainList');
          let itemCount = 0;
          
          response.forEach(domain => {
            const li = document.createElement('ol');
            li.textContent = domain;
            li.style.display = 'block'; 
            domainList.appendChild(li);
            itemCount++;
          });
        }
      );
    });
  });

//STORAGE
  
document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage({action: "checkStorage"}, function(response) {
    if (response.error) {
      console.error('Error:', response.error);
      document.getElementById("localStorage").textContent = 'Error checking storage';
      document.getElementById("sessionStorage").textContent = 'Error checking storage';
    } else {
      document.getElementById("localStorage").textContent = 'Local Storage Items: ' + response.data.localStorageCount;
      document.getElementById("sessionStorage").textContent = 'Session Storage Items: ' + response.data.sessionStorageCount;
    }
  });
});

//PORTS (HOOK & SUSPECT)

document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage({action: "checkPorts"}, function(response) {
      const portsDiv = document.getElementById('ports');
      if (response.suspect) {
        const content = "Suspect behavior detected! The following ports are being accessed: " + response.ports.join(", ") + ".";
        const p = document.createElement('p');
        p.textContent = content;
        portsDiv.appendChild(p);
      }
      //TRATANDO ERRO
      else if (!response || response.error) {
          console.error('Error:', response ? response.error : "No response from background script");
          portsDiv.textContent = 'Error in detecting port usage.';
      } else {
          portsDiv.textContent = 'No suspect behavior detected! No foreign ports are being accessed.';
      }
  });
});

//GRADES
document.addEventListener('DOMContentLoaded', function() {
  const gradeDisplay = document.getElementById('grade');
  const checkGradeButton = document.getElementById('checkGrade');

  function fetchGrade() {
      chrome.runtime.sendMessage({action: "calculateScore"}, function(response) {
          if (response && response.grade) {
              gradeDisplay.textContent = `Privacy Score: ${response.grade}`;
          } else {
              gradeDisplay.textContent = 'Failed to calculate grade.';
          }
      });
  }
  checkGradeButton.addEventListener('click', function() {
      gradeDisplay.textContent = 'Calculating...';
      fetchGrade();
  });
});
  