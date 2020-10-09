chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.message === "tradeView") {
            window.setTimeout(async function() {
                let leftSide = document.querySelector('nav').nextSibling.firstChild.lastChild.firstChild
                let rightSide = document.querySelector('nav').nextSibling.firstChild.lastChild.childNodes[1]
                let leftCards = Array.from(leftSide.querySelectorAll('img')).map(el => el.parentElement.parentElement.parentElement.parentElement)
                let rightCards = Array.from(rightSide.querySelectorAll('img')).map(el => el.parentElement.parentElement.parentElement.parentElement)
                let tradeInfo = await getTradeInfo(request.tradeId, request.categoryId)
                console.log(tradeInfo)
            }, 2000)
        }
});


function getTradeInfo(tradeId, categoryId) {
    let url = `https://api.epics.gg/api/v1/trade/${tradeId}?categoryId=${categoryId}?tradeId=${tradeId}`

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        return data.data
    })
}
