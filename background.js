let briefHistoryCollections = ['3502', '3900', '4225', '4423', '4490', '5413']

chrome.browserAction.setTitle({title: `Epics Inventory Helper v${chrome.runtime.getManifest().version}`})

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url && changeInfo.url.match("http(s)?://app.epics.gg/(csgo|streamers)/trading/select/[0-9]+/(in|out)")) {
        let categoryId = changeInfo.url.match("(csgo|streamers)")[0] === 'csgo' ? 1 : 2
        let collectionId = changeInfo.url.match("collection=[0-9]+")

        if (collectionId) {
            let season = changeInfo.url.match("season=([0-9]+|Founders|First)")[1]
            collectionId = collectionId[0].match(/(\d+)/)[0]
            sendMsgWithCollId(tabId, collectionId, categoryId, season)
        } else {
            sendClickMsg(tabId)
        }
    } else if (changeInfo.url && changeInfo.url.match("http(s)?://app.epics.gg/(csgo|streamers)/trading/view/[0-9]+")) {
        let categoryId = changeInfo.url.match("(csgo|streamers)")[0] === 'csgo' ? 1 : 2
        let tradeId = changeInfo.url.match("[0-9]+")
        sendTradeViewMsg(tabId, tradeId, categoryId)
    } else if (changeInfo.url && changeInfo.url.match("http(s)?://app.epics.gg/(csgo|streamers)/library") && !changeInfo.url.match("template")) {
        let categoryId = changeInfo.url.match("(csgo|streamers)")[0] === 'csgo' ? 1 : 2
        let collectionId = changeInfo.url.match("collection=[0-9]+")[0].match('[0-9]+')
        collectionId ? collectionId = collectionId[0] : collectionId = null
        if (briefHistoryCollections.includes(collectionId))
            sendBriefHistoryMsg(tabId, collectionId, categoryId)
    } else if (changeInfo.url && changeInfo.url.match("http(s)?://app.epics.gg/(csgo|streamers)/spinner")) {
        let categoryId = changeInfo.url.match("(csgo|streamers)")[0] === 'csgo' ? 1 : 2
        sendSpinnerOddsMsg(tabId, categoryId)
    }
});

function sendMsgWithCollId(tabId, collectionId, categoryId, season) {
    chrome.tabs.query({active: true, currentWindow: true}, function(){
        chrome.tabs.sendMessage(tabId, {
            message: 'trade',
            collectionId: collectionId,
            categoryId: categoryId,
            season: season
        })
    });
}

function sendClickMsg(tabId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(){
        chrome.tabs.sendMessage(tabId, {
            message: 'clickCollection'
        })
    });
}

function sendTradeViewMsg(tabId, tradeId, categoryId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(){
        chrome.tabs.sendMessage(tabId, {
            message: 'tradeView',
            tradeId: tradeId,
            categoryId: categoryId
        })
    });
}

function sendBriefHistoryMsg(tabId, collectionId, categoryId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(){
        chrome.tabs.sendMessage(tabId, {
            message: 'briefHistory',
            collectionId: collectionId,
            categoryId: categoryId
        })
    });
}

function sendSpinnerOddsMsg(tabId, categoryId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(){
        chrome.tabs.sendMessage(tabId, {
            message: 'spinnerOdds',
            categoryId: categoryId
        })
    });
}
