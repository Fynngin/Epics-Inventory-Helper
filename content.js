let jwt = window.localStorage.getItem("new:jwt:token")
let coinSrc = chrome.runtime.getURL("images/coin.png")

let btn = `<label id="marketPriceBtn" class="marketPriceBtn" for="marketPrices">
    <span class="showPriceText">Show prices</span>
    <input class="marketPriceBtn" id="marketPrices" type="checkbox">
    <span class="marketPriceBtn" tabindex="0" role="switch" aria-checked="false"></span>
</label>`

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'trade') {
        let toolbar = document.querySelector('div label').parentElement
        if (!document.getElementById('marketPriceBtn')) {
            toolbar.insertAdjacentHTML('beforeEnd', btn);
            document.getElementById('marketPriceBtn').addEventListener('click', function(evt) {getCardTemplates(evt, request.categoryId, request.collectionId)});
        }
    } else if (request.message === 'clickCollection') {
        let collList = document.querySelectorAll('section')[1]
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
    }
});

function getCardTemplates(evt, categoryId, collectionId) {
    let el = evt.target;

    if (el.checked !== null) {   //ignore weird double click for now
        if (el.checked) {
            let listItems = Array.from(document.querySelectorAll('li img[src^="https://cdn.epics.gg/card"]'))
                .map(it => it.closest('li'))
            sortItems(listItems, categoryId, collectionId)
        } else {
            let prices = document.getElementsByClassName('cardPrice')
            for (item of prices) {
                item.remove()
            }
        }
    }
}

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
                    return elem.images.size402 === src
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
            let price = null
            if (data.data.count > 0) {
                price = data.data.market[0][0].price
            } else {
                price = "-"
            }

            div.removeChild(spinner)

            let coin = document.createElement("IMG")
            coin.src = coinSrc
            coin.classList.add('cardPrice')
            div.appendChild(coin)

            let h2 = document.createElement("H2")
            h2.innerHTML = price
            h2.classList.add('cardPrice')
            div.appendChild(h2)
        })
    }
}
