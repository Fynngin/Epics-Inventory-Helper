let jwt = window.localStorage.getItem("new:jwt:token")

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'trade') {
        getCardTemplates(request.categoryId, request.collectionId, jwt)
    }
});

function getCardTemplates(categoryId, collectionId, jwt) {
    let url = `https://api.epics.gg/api/v1/collections/${collectionId}/card-templates?categoryId=${categoryId}`
    fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        let listItems = Array.from(document.querySelectorAll('li')).filter(el => el.querySelector('img') && !el.querySelector('p'))
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
                let template = data.data.find(elem => {
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
        let url = `https://api.epics.gg/api/v1/market/buy?categoryId=${categoryId}&page=1&sort=price&templateId=${card.templateId}&type=card`
        fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-User-JWT': jwt
            },
        }).then(res => res.json()).then(data => {
            card.item.style.display = "block"
            let price = null
            if (data.data.count > 0) {
                price = data.data.market[0][0].price
            } else {
                price = "-"
            }
            let h2 = document.createElement("H2")
            h2.style.marginTop = "10px"
            h2.innerHTML = price
            card.item.appendChild(h2)
        })
    }
}
