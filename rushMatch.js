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

function displayTeams() {
    let div = document.createElement('div')
    div.style.display = "flex"
    div.style.justifyContent = "space-around"
    main.style.gridTemplateColumns = "20% 20% 20% 20% 20%"
    for (const card of matchRoster['cards']) {
        let img = document.createElement('img')
        img.src = card['card'].images['size402']
        img.style.height = "200px"
        div.appendChild(img)
    }
    main.appendChild(div)
}