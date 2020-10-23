let stages = []
let teams = []

chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.message === "rush") {
            if (teams.length === 0) {
                getTeams(addStages(function() {
                    console.log(stages)
                }))
            } else {
                addStages(function() {
                    console.log(stages)
                })
            }
        }
    });

function getTeams(callback) {
    fetch("https://api.epics.gg/api/v1/teams", {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-JWT': jwt
        },
    }).then(res => res.json()).then(data => {
        teams = data.data.teams
        callback()
    })
}

function removeRushAds() {
    let sections = document.querySelectorAll('section')
    for (const section of sections) {
        let parent = section.parentElement
        parent.removeChild(section)
    }
    let main = document.querySelector('main')
    main.style.gridTemplateColumns = "25% 1fr 20%"
}

async function addStages(callback) {
    if (stages.length > 0) {
        addDomElements(callback)
    } else {
        await fetch("https://api.epics.gg/api/v1/ultimate-team/circuits/35", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-JWT': jwt
            },
        }).then(res => res.json()).then(async data => {
            removeRushAds()
            let circuit = data.data['circuit']
            for (const stage of circuit['stages']) {
                let ids = JSON.stringify(stage['rosters'].map(roster => roster['ut_pve_roster_id']))
                await fetch(`https://api.epics.gg/api/v1/ultimate-team/pve/rosters?categoryId=1&ids=${ids}`, {
                    method: "GET",
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-JWT': jwt
                    }
                }).then(res => res.json()).then(data => {
                    let tempTeams = []
                    for (const team of data.data['rosters']) {
                        let logo = teams.find(el => el.id === team.teamId).images.find(im => im.name === "team_logo").url
                        tempTeams.push({
                            name: team.name,
                            rating: team.rating,
                            teamId: team.teamId,
                            rosterId: team.id,
                            progress: stage['rosterProgress'].find(el => el['ut_pve_roster_id'] === team.id)['wins'],
                            logo: `https://cdn.epics.gg${logo}`
                        })
                    }
                    stages.push({
                        teams: tempTeams,
                        order: circuit['allStages'].find(el => el.id === stage.id).order,
                        name: stage.name,
                        winsNeeded: stage['rosters'][0]['wins'],
                        isShowing: false
                    })
                })
            }
        })
        stages.sort((a,b) => a.order - b.order)
        addDomElements(callback)
    }
}

async function addDomElements(callback) {
    let main = document.querySelector('main')
    let aside = document.createElement('aside')
    main.appendChild(aside)

    for (const stage of stages) {
        let section = document.createElement('section')
        section.style.paddingLeft = "10px"
        section.style.paddingRight = "10px"
        section.style.paddingTop = "0"
        section.style.paddingBottom = "0"
        section.style.height = "auto"

        await fetch(chrome.runtime.getURL("stage.html"))
            .then(res => res.text())
            .then(async data => {
                section.innerHTML = data
                let header = section.querySelector('header h2')
                header.innerHTML = stage['name']
                header.parentElement.parentElement.addEventListener('click', handleStageClick)
                let innerDiv = section.querySelector('.inner_div')
                for (const team of stage.teams) {
                    let li = document.createElement('li')
                    let div = document.createElement('div')
                    let p = document.createElement('p')
                    let img = document.createElement('img')
                    img.src = team.logo
                    img.style.height = "30px"
                    p.innerHTML = team.name
                    li.appendChild(div)
                    div.appendChild(img)
                    div.appendChild(p)
                    team.container = innerDiv
                    team.item = li
                }
            })
        aside.appendChild(section)
    }
    callback()
}

function handleStageClick(evt) {
    let section = evt.path.find(el => el.nodeName === "SECTION")
    let stage = stages.find(el => el.teams[0].container.parentElement.parentElement === section)
    if (stage.isShowing) {
        for (const team of stage['teams']) {
            team.container.removeChild(team.item)
        }
        stage.isShowing = false
    } else {
        for (const team of stage['teams']) {
            team.container.appendChild(team.item)
        }
        stage.isShowing = true
    }
}