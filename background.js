chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url && changeInfo.url.match("http(s)?://app.epics.gg/(csgo|streamers)/trading/select/[0-9]+/(in|out)")) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabId, {
                message: 'trade'
            })
        });
    }
});

chrome.webRequest.onCompleted.addListener(function(details) {
    if (details.type) {
        console.log(details)
    }
}, {urls: ["<all_urls>"]});
