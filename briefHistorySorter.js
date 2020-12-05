chrome.runtime.onMessage.addListener(function(request) {
    if (request.message === "briefHistory") {
        window.setTimeout(function() {
            getHistoryCardTemplates(request.categoryId, request.collectionId, function(res) {
                findDomElements(res, function(result) {
                    sortDoms(result)
                })
            })
        }, 3000)
    }
});

function getHistoryCardTemplates(categoryId, collectionId, callback) {
    let url = `https://api.epics.gg/api/v1/collections/${collectionId}/card-templates?categoryId=${categoryId}`
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        let res = data.data.filter(card => card.title.includes("Brief History"))
        let obj = res.map(el => {
            return {
                num: el.title.match(': [0-9]+')[0].match('[0-9]+')[0],
                card: el
            }
        })
        let sorted = obj.sort((a,b) => a.num - b.num)
        callback(sorted)
    })
}

function findDomElements(cards, callback) {
    let items = document.querySelectorAll('img[src^="https://cdn.epics.gg/card-template/render"]')
    for (const card of cards) {
        let found = false
        let idx = 0
        let cardSrc = card.card.images['size201'];
        while (!found && idx < items.length) {
            if (items[idx].src === cardSrc) {
                card.item = items[idx].parentElement.parentElement.parentElement.parentElement
                card.container = card.item.parentElement
                card.container.removeChild(card.item)
                found = true
            } else {
                idx++
            }
        }
    }
    callback(cards)
}

function sortDoms(items) {
    for (const item of items) {
        item.container.appendChild(item.item)
    }
}