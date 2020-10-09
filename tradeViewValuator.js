chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.message === "tradeView") {
            window.setTimeout(async function() {
                let leftSide = document.querySelector('nav').nextSibling.firstChild.lastChild.firstChild
                let rightSide = document.querySelector('nav').nextSibling.firstChild.lastChild.childNodes[1]
                let leftCards = Array.from(leftSide.querySelectorAll('img')).map(el => el.parentElement.parentElement.parentElement.parentElement)
                let rightCards = Array.from(rightSide.querySelectorAll('img')).map(el => el.parentElement.parentElement.parentElement.parentElement)

                let leftHeader = leftSide.parentElement.previousSibling.childNodes[0].querySelector('p')
                let rightHeader = leftSide.parentElement.previousSibling.childNodes[1].querySelector('p')
                let spinnerLeft = document.createElement("DIV")
                spinnerLeft.style.float = "right"
                spinnerLeft.style.marginTop = "10px"
                fetch(chrome.runtime.getURL("spinner.html"))
                    .then(res => res.text())
                    .then(data => {
                        spinnerLeft.innerHTML = data
                        leftHeader.appendChild(spinnerLeft)
                })
                let spinnerRight = document.createElement("DIV")
                spinnerRight.style.float = "right"
                spinnerRight.style.marginTop = "10px"
                fetch(chrome.runtime.getURL("spinner.html"))
                    .then(res => res.text())
                    .then(data => {
                        spinnerRight.innerHTML = data
                        rightHeader.appendChild(spinnerRight)
                })

                getTradeInfo(request.tradeId, request.categoryId, function(tradeInfo) {
                    sortCards(leftCards, rightCards, tradeInfo, function(items) {
                        injectMarketValues(items, request.categoryId, jwt, function(cardsUpdated) {
                            let leftSum = cardsUpdated.leftSide.map(it => it.price).reduce((leftSum, current) => leftSum + current, 0)
                            let rightSum = cardsUpdated.rightSide.map(it => it.price).reduce((rightSum, current) => rightSum + current, 0)
                            injectSums(leftSum, rightSum, leftHeader, rightHeader)
                        })
                    })
                })
            }, 2000)
        }
});


/**
 * Get api data for a specific trade.
 * @param tradeId, id of the given trade
 * @param categoryId, streamers or csgo
 * @param callback, use callback instead of return
 */
function getTradeInfo(tradeId, categoryId, callback) {
    let url = `https://api.epics.gg/api/v1/trade/${tradeId}?categoryId=${categoryId}?tradeId=${tradeId}`

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        callback(data.data)
    })
}

/**
 * Matches every card with the corresponding templateId.
 * @param leftCards, cards belonging to user2
 * @param rightCards, cards belonging to user1
 * @param tradeInfo, trade data from the api
 * @param callback, return array consisting of objects [{item: DOMelement, templateId: id}, ...]
 */
function sortCards(leftCards, rightCards, tradeInfo, callback) {
    let res = {
        leftSide: [],
        rightSide: []
    }
    for (let card of leftCards) {
        let src = card.childNodes[2].firstChild.firstChild.firstChild['src']
        let template = tradeInfo['user2']['cards'].find(el => {
            let season = el['cardTemplate']['properties'].season
            return (season === "2020" ? el['cardTemplate']['images']['size201'] : el['cardTemplate']['images']['size201'].split('?')[0]) === src
        })
        res.leftSide.push({
            item: card,
            templateId: template['cardTemplate'].id,
            price: 0
        })
    }
    for (let card of rightCards) {
        let src = card.childNodes[2].firstChild.firstChild.firstChild['src']
        let template = tradeInfo['user1']['cards'].find(el => {
            let season = el['cardTemplate']['properties'].season
            return (season === "2020" ? el['cardTemplate']['images']['size201'] : el['cardTemplate']['images']['size201'].split('?')[0]) === src
        })
        res.rightSide.push({
            item: card,
            templateId: template['cardTemplate'].id,
            price: 0
        })
    }
    callback(res)
}

/**
 * Gets the market value for each card, then injects it below
 * @param cards, cards shown on the site
 * @param categoryId, streamers or csgo
 * @param jwt, user token from local storage
 * @param callback, return cards array with added prices
 */
async function injectMarketValues(cards, categoryId, jwt, callback) {
    for (let card of cards.leftSide.concat(cards.rightSide)) {
        card.item.style.display = "block"
        let div = document.createElement("DIV")
        div.classList.add('cardPrice')
        card.item.appendChild(div)

        let spinner = document.createElement("DIV")
        await fetch(chrome.runtime.getURL("spinner.html"))
            .then(res => res.text())
            .then(data => {
                spinner.innerHTML = data
                div.appendChild(spinner)
            })

        let url = `https://api.epics.gg/api/v1/market/buy?categoryId=${categoryId}&page=1&sort=price&templateId=${card.templateId}&type=card`
        await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-JWT': jwt
            },
        }).then(res => res.json()).then(data => {
            let price;
            if (data.data.count > 0) {
                price = data.data['market'][0][0]['price']
                card.price = price
            } else {
                price = "-"
            }

            div.removeChild(spinner)

            let coin = document.createElement("IMG")
            coin.src = coinSrc
            coin.classList.add('cardPrice')
            coin.style.width = "16px"
            div.appendChild(coin)

            let h2 = document.createElement("H2")
            h2.innerHTML = price
            h2.classList.add('cardPrice')
            div.appendChild(h2)
        })
    }
    callback(cards)
}

function injectSums(leftSum, rightSum, leftHeader, rightHeader) {
    leftHeader.removeChild(leftHeader.querySelector(".loader").parentElement)
    rightHeader.removeChild(rightHeader.querySelector(".loader").parentElement)
    let coin1 = document.createElement("IMG")
    coin1.src = coinSrc
    coin1.classList.add('cardPrice')
    coin1.style.width = "16px"

    let leftSpan = document.createElement('span')
    leftSpan.appendChild(coin1)
    leftSpan.innerHTML += leftSum
    leftSpan.style.float = "right"
    leftHeader.appendChild(leftSpan)

    let coin2 = document.createElement("IMG")
    coin2.src = coinSrc
    coin2.classList.add('cardPrice')
    coin2.style.width = "16px"

    let rightSpan = document.createElement('span')
    rightSpan.appendChild(coin2)
    rightSpan.innerHTML += rightSum
    rightSpan.style.float = "right"
    rightHeader.appendChild(rightSpan)
}
