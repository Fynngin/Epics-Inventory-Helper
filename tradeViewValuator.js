// let userId = JSON.parse(JSON.parse(window.localStorage.getItem("persist:root"))['auth'])['user']['id']

chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.message === "tradeView") {
            window.setTimeout(async function() {
                let leftSide = document.querySelector('nav').nextSibling.firstChild.lastChild.firstChild
                let rightSide = document.querySelector('nav').nextSibling.firstChild.lastChild.childNodes[1]
                let leftCards = getDomElements(leftSide)
                let rightCards = getDomElements(rightSide)

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
 * Searches for DIVs which can be used to later append the market price to.
 * @param container, element containing the items (left or right side of the trade)
 * @returns array containing the correct elements
 */
function getDomElements(container) {
    return Array.from(container.querySelectorAll('img')).map(el => {
        if (el.src.match('card'))
            return el.parentElement.parentElement.parentElement.parentElement
        else
            return el.parentElement.parentElement
    })
}

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
    let incoming = tradeInfo['offeredBy'] === userId

    let res = {
        leftSide: [],
        rightSide: []
    }
    for (let item of leftCards) {
        res.leftSide.push(findMatch(item, incoming ? tradeInfo['user2'] : tradeInfo['user1']))
    }
    for (let item of rightCards) {
        res.rightSide.push(findMatch(item, incoming ? tradeInfo['user1'] : tradeInfo['user2']))
    }
    callback(res)
}

/**
 * Find templateId for a given DOM element.
 * @param item, DOM element from trade page
 * @param tradeInfo, trade data from the API
 * @returns {{item: *, price: number, type: string, templateId: *}}, object containing item info
 */
function findMatch(item, tradeInfo) {
    let src = item.querySelector('img').src
    let template;
    if (src.match('card')) {
        template = tradeInfo['cards'].find(el => {
            return (el['cardTemplate']['images']['size402'].split('?')[0] === src)
                || (el['images']['size402'].split('?')[0] === src)
        })
        return {
            type: 'card',
            item: item,
            templateId: template['cardTemplate'].id,
            circulation: template['cardTemplate']['inCirculation'],
            price: 0
        }
    } else {
        template = tradeInfo['stickers'].find(el => src.match(el['stickerTemplate']['images'][1]))
        return {
            type: 'sticker',
            item: item,
            templateId: template['stickerTemplate'].id,
            circulation: template['stickerTemplate']['inCirculation'],
            price: 0
        }
    }
}

/**
 * Gets the market value for each card, then injects it below
 * @param items, cards/stickers shown on the site
 * @param categoryId, streamers or csgo
 * @param jwt, user token from local storage
 * @param callback, return cards array with added prices
 */
async function injectMarketValues(items, categoryId, jwt, callback) {
    for (let item of items.leftSide.concat(items.rightSide)) {
        item.item.style.display = "block"
        let div = document.createElement("DIV")
        div.classList.add('cardPrice')
        item.item.appendChild(div)

        let spinner = document.createElement("DIV")
        await fetch(chrome.runtime.getURL("spinner.html"))
            .then(res => res.text())
            .then(data => {
                spinner.innerHTML = data
                div.appendChild(spinner)
            })

        let url = `https://api.epics.gg/api/v1/market/buy?categoryId=${categoryId}&page=1&sort=price&templateId=${item.templateId}&type=${item.type}`
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
                item.price = price
            } else {
                price = "-"
            }

            if (item.circulation <= 50) {
                let circ = document.createElement('span')
                circ.innerHTML = `Circ: ${item.circulation}`
                circ.classList.add('sub50')
                item.item.parentElement.style.position = "relative";
                item.item.parentElement.appendChild(circ)
                item.item.parentElement.classList.add('sub50')
            } else if (item.circulation <= 100) {
                let circ = document.createElement('span')
                circ.innerHTML = `Circ: ${item.circulation}`
                circ.classList.add('sub100')
                item.item.parentElement.style.position = "relative";
                item.item.parentElement.appendChild(circ)
                item.item.parentElement.classList.add('sub100')
            } else if (item.circulation <= 250) {
                let circ = document.createElement('span')
                circ.innerHTML = `Circ: ${item.circulation}`
                circ.classList.add('sub250')
                item.item.parentElement.style.position = "relative";
                item.item.parentElement.appendChild(circ)
                item.item.parentElement.classList.add('sub250')
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
    callback(items)
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
