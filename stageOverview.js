let stages = []
let teams = []
let stagesCompleted = 0
let aside = document.createElement('aside')
let main

chrome.runtime.onMessage.addListener(
    function(request) {
        if (request.message === "rush") {
            if (teams.length === 0) {
                getTeams(function() {
                    addStages(function() {
                        console.log(stages)
                    })
                })
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
        removeRushAds()
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
            stagesCompleted = circuit['stagesCompleted']
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
                        let progress = stage['rosterProgress'].find(el => el['ut_pve_roster_id'] === team.id)['wins']
                        tempTeams.push({
                            name: team.name,
                            rating: team.rating,
                            teamId: team.teamId,
                            rosterId: team.id,
                            progress: progress >= stage['rosters'][0]['wins'] ? stage['rosters'][0]['wins'] : progress,
                            logo: `https://cdn.epics.gg${logo}`
                        })
                    }
                    stages.push({
                        badge: `https://cdn.epics.gg${stage['images'][0].url}`,
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
    if (!main)
        main = document.querySelector('main')
    main.appendChild(aside)

    for (const stage of stages) {
        stage.isShowing = false
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
                let badge = section.querySelector('header img')
                badge.src = stage.badge
                let header = section.querySelector('header h2')
                header.innerHTML = stage['name']
                if (stage.order <= (stagesCompleted + 1)) {
                    header.parentElement.parentElement.addEventListener('click', handleStageClick)
                }
                let innerDiv = section.querySelector('.inner_div')
                for (const team of stage.teams) {
                    let li = document.createElement('li')
                    li.style.cursor = "pointer"
                    li.addEventListener('click', function() {
                        handleTeamClick(team)
                    })
                    let flex = document.createElement('div')
                    flex.style.width = "100%"
                    flex.style.display = "flex"
                    flex.style.justifyContent = "space-between"
                    let div_right = document.createElement('div')
                    div_right.style.alignSelf = "center"
                    div_right.style.marginLeft = "auto"
                    let progress = document.createElement('h5')
                    progress.innerHTML = `${team.progress} / ${stage.winsNeeded}`
                    progress.style.color = team.progress >= stage.winsNeeded ? "#0baaaa" : "#aa0b53"
                    div_right.appendChild(progress)
                    let div_left = document.createElement('div')
                    let p = document.createElement('p')
                    let img = document.createElement('img')
                    img.src = team.logo
                    img.style.height = "30px"
                    p.innerHTML = team.name
                    div_left.appendChild(img)
                    div_left.appendChild(p)
                    flex.appendChild(div_left)
                    flex.appendChild(div_right)
                    li.appendChild(flex)
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

function handleTeamClick(team) {
    main.removeChild(aside)
    chrome.runtime.sendMessage({
        message: 'rushTeamClick',
        team: team
    })
}