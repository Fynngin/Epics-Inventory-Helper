let apiSpinnerOdds = {};
const spinnerOddsURL = "https://api.epics.gg/api/v1/spinner?categoryId=";

chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "spinnerOdds") {
        getApiSpinnerOdds(request.categoryId, () => {
            displayOdds();
        })
    }
})

function getApiSpinnerOdds(categoryId, callback) {
    fetch(spinnerOddsURL+categoryId, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        for (const item of data.data.items) {
            const hasCoins = item.name.includes("Epicoins") || item.name.includes("Silvercoins")
            const name = hasCoins ? item.name.match(/[0-9]+(,[0-9]+)?/)[0] : item.name
            apiSpinnerOdds[name] = item.chance;
        }

        callback();
    })
}

function displayOdds() {
    let grids = Array.from(document.querySelectorAll('div')).filter(el => {
        return window.getComputedStyle(el).display === "grid";
    })

    let prizes = grids[grids.length - 1].firstChild.firstChild.firstChild;

    for (const prizeDOM of prizes.childNodes) {
        let prizeTxt;
        const temp = prizeDOM.querySelector('p');
        if (temp.childNodes[0].firstChild) {
            prizeTxt = temp.firstChild.lastChild.innerHTML;
        } else {
            prizeTxt = temp.innerHTML;
        }

        if (prizeTxt === "10000") {
            prizeTxt = "10,000";
        }

        const chance = apiSpinnerOdds[prizeTxt];

        let div = document.createElement('div');
        let p = document.createElement('p');
        p.innerHTML = chance + "%";
        div.classList.add("spinnerOdds");
        div.appendChild(p);
        prizeDOM.appendChild(div);
    }
}