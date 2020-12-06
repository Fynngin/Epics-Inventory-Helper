let jwt = JSON.parse(JSON.parse(window.localStorage.getItem("persist:root"))['auth'])['jwt']
let coinSrc = chrome.runtime.getURL("images/coin.png")
let collectionId;
let categoryId;
let season;

let btn = `<label id="marketPriceBtn" class="marketPriceBtn" for="marketPrices">
    <span class="showPriceText">Show prices</span>
    <input class="marketPriceBtn" id="marketPrices" type="checkbox">
    <span class="marketPriceBtn" tabindex="0" role="switch" aria-checked="false"></span>
</label>`

/**
 * Listener for 2 actions caught by the background script:
 * 1. User selects a collection
 * 2. User selects a set
 *
 * 1) Inject market price switch, if not already on the site
 * 2) Look for a collection in that set and click it, so that the url then contains a collectionId again
 */
chrome.runtime.onMessage.addListener(
    function(request) {
        let collList = document.querySelectorAll('section')[1]
        switch (request.message) {
            case 'trade':
                let toolbar = document.querySelector('div label').parentElement
                collectionId = request.collectionId
                categoryId = request.categoryId
                season = request.season

                //start loading prices when button is clicked
                if (!document.getElementById('marketPriceBtn')) {
                    toolbar.insertAdjacentHTML('beforeend', btn);
                    document.getElementById('marketPriceBtn').addEventListener('click', function(evt) {
                        getCardTemplates(evt, categoryId, collectionId)
                    });
                }

                //reset button at collection change
                collList.addEventListener('click', function(evt) {
                    if (["DIV", "P", "IMG", "LI"].includes(evt.path[0].tagName)) {
                        document.getElementById('marketPrices').checked = false
                    }
                })
                break;
            case 'clickCollection':
                let observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (!mutation.addedNodes) return

                        for (let i = 0; i < mutation.addedNodes.length; i++) {
                            let node = mutation.addedNodes[i]
                            if (node.querySelector('li img[src^="https://cdn.epics.gg/collection"]')) {
                                let collectionHeader = node.childNodes[1];
								let opacity = getComputedStyle(collectionHeader).opacity;
								if (opacity === "1") {
									observer.disconnect();
									collectionHeader.click();
								}
                            }
                        }
                    })
                })

                observer.observe(collList, {
                    childList: true
                    , subtree: true
                    , attributes: false
                    , characterData: false
                })
                break;
            default:
                return
        }
});

/**
 * Called, when the "show prices" btn is clicked.
 * If btn is checked, looks for all the list items, which contain card images.
 * If btn is unchecked, removes all previously added card price divs.
 * @param evt, click event needed to filter double click issue
 * @param categoryId, streamers or csgo category, passed to other function
 * @param collectionId, passed to other function
 */
function getCardTemplates(evt, categoryId, collectionId) {
    let el = evt.target;

    if (el.checked !== null) {   //ignore weird double click for now
        if (el.checked) {
            let cards = Array.from(document.querySelectorAll('li img[src*="epics.gg/card"]'))
            let stickers = Array.from(document.querySelectorAll('li img[src*="epics.gg/sticker"]'))
            let listItems = cards.concat(stickers).map(it => it.closest('li'))
            sortItems(listItems, categoryId, collectionId)
        } else {
            let prices = document.querySelectorAll('div.cardPrice')
            for (let item of prices) {
                item.remove()
            }
        }
    }
}

/**
 * Gets all cardTemplates for the selected collection from the api, then maps those to the listItems on the site.
 * @param listItems, cards, shown on the site
 * @param categoryId, streamers or csgo
 * @param collectionId, selected collection
 */
async function sortItems(listItems, categoryId, collectionId) {
    let cardTemplates;
    let stickerTemplates;
    let cardUrl = `https://api.epics.gg/api/v1/collections/${collectionId}/card-templates?categoryId=${categoryId}`
    let stickerUrl = `https://api.epics.gg/api/v1/collections/${collectionId}/sticker-templates?categoryId=${categoryId}`

    await fetch(stickerUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        stickerTemplates = data.data
    })

    await fetch(cardUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        cardTemplates = data.data
    })

    let res = []
    for (let item of listItems) {
        let src = item.querySelector('img').src.split('.epics.gg')[1]
        if (src.match('sticker')) {
            let template = stickerTemplates.find(elem => src.match(elem.images[0]))
            let templateId = template.id
            res.push({
                type: 'sticker',
                item: item,
                templateId: templateId
            })
        } else if (src.match("card/render/")) {
            //User has only 1 of that card, so the img link contains the templateId
            let templateId = parseInt(src.match(/(\d+)/g)[1])
            res.push({
                type: 'card',
                item: item,
                templateId: templateId
            })
        } else {
            let template = cardTemplates.find(elem => {
                //remove timestamp from file when prior to season 2020
                return season === "2020"
                    ? elem.images['size402'].split('.epics.gg')[1] === src
                    : elem.images['size402'].split('?')[0].split('.epics.gg')[1] === src
            })
            let templateId = template.id
            res.push({
                type: 'card',
                item: item,
                templateId: templateId
            })
        }
    }
    getMarketValues(res, categoryId, jwt)
}

/**
 * Gets the market value for each card, then injects it below
 * @param cards, cards shown on the site
 * @param categoryId, streamers or csgo
 * @param jwt, user token from local storage
 */
function getMarketValues(cards, categoryId, jwt) {
    for (let card of cards) {
        card.item.style.display = "block"
        let div = document.createElement("DIV")
        div.classList.add('cardPrice')
        card.item.appendChild(div)

        let spinner = document.createElement("DIV")
        fetch(chrome.runtime.getURL("spinner.html"))
            .then(res => res.text())
            .then(data => {
                spinner.innerHTML = data
                div.appendChild(spinner)
            })

        let url = `https://api.epics.gg/api/v1/market/buy?categoryId=${categoryId}&page=1&sort=price&templateId=${card.templateId}&type=${card.type}`
        fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-User-JWT': jwt
            },
        }).then(res => res.json()).then(data => {
            let price;
            if (data.data.count > 0) {
                price = data.data['market'][0][0]['price']
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
}
