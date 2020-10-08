chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url && changeInfo.url.match("http(s)?://app.epics.gg/(csgo|streamers)/trading/select/[0-9]+/(in|out)")) {
        let categoryId = changeInfo.url.match("(csgo|streamers)")[0] === 'csgo' ? 1 : 2
        let collectionId = changeInfo.url.match("collection=[0-9]+")

        if (collectionId) {
            collectionId = collectionId[0].match(/(\d+)/)[0]
            sendMsgWithCollId(tabId, collectionId, categoryId)
        } else {
            sendClickMsg(tabId)
        }
    }
});

function sendMsgWithCollId(tabId, collectionId, categoryId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabId, {
            message: 'trade',
            collectionId: collectionId,
            categoryId: categoryId
        })
    });
}

function sendClickMsg(tabId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabId, {
            message: 'clickCollection'
        })
    });
}
