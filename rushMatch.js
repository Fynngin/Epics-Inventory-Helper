let matchRoster
let userRosters

chrome.runtime.onMessage.addListener(
    function(msg) {
        if (msg.message === 'rushTeamClick') {
            getTeamRoster(msg.team, function() {
                getUserRosters(function() {
                    displayTeams()
                })
            })
        }
    });

function getTeamRoster(team, callback) {
    fetch(`https://api.epics.gg/api/v1/ultimate-team/pve/rosters?categoryId=1&ids=${team.rosterId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        }
    }).then(res => res.json()).then(data => {
        matchRoster = data.data['rosters'][0]
        callback()
    })
}

function getUserRosters(callback) {
    fetch(`https://api.epics.gg/api/v1/ultimate-team/rosters?categoryId=1&userId=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        }
    }).then(res => res.json()).then(data => {
        userRosters = data.data['rosters']
        callback()
    })
}

async function displayTeams() {
    console.log(matchRoster)
    let container = document.createElement('div')
    container.style.order = "2"
    main.insertBefore(container, main.lastChild)
    await displayRoster(matchRoster, container)
    let h2 = container.querySelector('h2')
    h2.innerHTML = "Enemy Roster"
    h2.classList.add('enemyTeamHeader')
    container.querySelector('.teamContainer').style.marginBottom = "10px"
    for (const roster of userRosters) {
        displayRoster(roster, container)
    }
}

async function displayRoster(roster, container) {
    let div = document.createElement('div')
    div.style.order = "2"
    div.style.marginLeft = "10px"
    div.style.marginRight = "10px"
    await fetch(chrome.runtime.getURL("roster.html"))
        .then(res => res.text())
        .then(data => {
            div.innerHTML = data
        })

    for (const card of roster['cards']) {
        let img = document.createElement('img')
        img.src = card['card'].images['size402']
        img.style.maxHeight = "200px"
        div.querySelector('.teamImages').appendChild(img)
    }
    div.querySelector('.teamName').innerHTML = roster.name
    div.querySelector('.teamRating').innerHTML = `${roster.rating} OVR`
    container.appendChild(div)
}