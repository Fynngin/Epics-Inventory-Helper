let jwt = window.localStorage.getItem("new:jwt:token")
let coinSrc = chrome.runtime.getURL("images/coin.png")
let collectionId;
let categoryId;

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
 * 1)
 */
chrome.runtime.onMessage.addListener(
    function(request) {
        let collList = document.querySelectorAll('section')[1]
        switch (request.message) {
            case 'trade':
                let toolbar = document.querySelector('div label').parentElement
                collectionId = request.collectionId
                categoryId = request.categoryId

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
                                observer.disconnect()
                                node.childNodes[1].click()
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
            let listItems = Array.from(document.querySelectorAll('li img[src^="https://cdn.epics.gg/card"]'))
                .map(it => it.closest('li'))
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
function sortItems(listItems, categoryId, collectionId) {
    let cardTemplates;
    let url = `https://api.epics.gg/api/v1/collections/${collectionId}/card-templates?categoryId=${categoryId}`

    fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        cardTemplates = data.data
        let res = []
        for (let item of listItems) {
            let src = item.querySelector('img').src
            if (src.match("card/render/")) {
                //User has only 1 of that card, so the img link contains the templateId
                let templateId = parseInt(src.match(/(\d+)/g)[1])
                res.push({
                    item: item,
                    templateId: templateId
                })
            } else {
                let template = cardTemplates.find(elem => {
                    return elem.images['size402'].split('?')[0] === src     //remove timestamp from file
                })
                let templateId = template.id
                res.push({
                    item: item,
                    templateId: templateId
                })
            }
        }
        getMarketValues(res, categoryId, jwt)
    })
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

        let url = `https://api.epics.gg/api/v1/market/buy?categoryId=${categoryId}&page=1&sort=price&templateId=${card.templateId}&type=card`
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
