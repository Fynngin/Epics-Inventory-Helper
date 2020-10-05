chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'trade') {
        getCardTemplates();
    }
});

function getCardTemplates() {
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (!mutation.addedNodes) return
            let cards = Array.from(mutation.addedNodes).filter(el => el.tagName === 'LI' && el.firstChild.tagName === 'DIV');
            if (cards.length > 0) {
                for (let card of cards) {
                    getMarketValues(card.firstChild.firstChild.firstChild.firstChild.src)
                }
            }
        })
    })

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    })
}

function getMarketValues(card) {
    console.log(card)
}
