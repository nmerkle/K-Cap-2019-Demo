#!/usr/bin/env node

const {Builder, By, Key, until} = require('selenium-webdriver')
//const actions = ['LowBodyWeight', 'NormalBodyWeight', 'HighBodyWeight']
const RL = require('reinforcenode')
const {readFileSync, writeFileSync, existsSync} = require('fs')
//const datamuse = require('datamuse')
const R = require('ramda')
const {reasonState, getTaskProfile, getRandomInt, getStringHash, getRandomDouble, updateStateFeaturesToNextState,
    parseExpression, parseComplexExpression} = require('./utils')

async function initDriver(URI, browser = 'chrome') {
    let driver = await new Builder().forBrowser(browser).build()
    await driver.get(URI)
    return driver
}

async function getOptions(driver) {
    const options = await By.xpath('//select[@id="options"]//option')
    const values = await driver.findElements(options)
    for(let t of values) {
        const text = await t.getText()
        //console.log(text)
    }
    return values
}

async function getOptionLabels(driver) {
    const labels = []
    const options = await By.xpath('//select[@id="options"]//option')
    const values = await driver.findElements(options)
    for(let t of values) {
        const text = await t.getText()
        labels.push(text)
        //console.log(text)
    }
    return labels
}

async function getCheckboxLabels(driver) {
    const labels = []
    const xpath = await By.xpath('//div[@id="area"]//label')
    const checkboxes = await driver.findElements(xpath)
    for(let check of checkboxes) {
        const txt = await check.getText()
        labels.push(txt)
    }
    return labels
}

async function generateState(task, driver, state, newEpisode, performedAction) {
    const featVector = []
    const resultVector = {}
    const featNames = Object.keys(task.features)
    featNames.forEach((n) => {
        if(!newEpisode) {
            resultVector[n] = state.annotated[n]
        } else {
            resultVector[n] = 0
        }
    })
    for(let i = 0; i < state.hashed.length; i++) {
        if(!newEpisode) {
            featVector.push(state.hashed[i])
        } else {
            featVector.push(0)
        }
    }
    const body = await getBodyText(driver)
    let words = undefined
    if(body !== undefined)
        words = body.split("\n")
    let counter = 0

    const instruct = await getInstructionText(driver, "query", 10000)
    const ws = instruct.split(" ")
    ws.forEach((w) => {
        resultVector[w] = 1
        addToVec(task, w, featVector, undefined)
    })
    const isOpt = await isOptions(driver)
    //addToFeatVector(isOpt, featVector)
    if(isOpt === "listOptions") {
        resultVector["IsOption"] = 1
        addToVec(task, "IsOption", featVector, "ON")
    }
    if(performedAction === "ListOptionClickedByLabel") {
        addToVec(task, "ListOptionClickedByLabel", featVector, "ON")
        if(resultVector["ListOptionClickedByLabel"] == 0)
            resultVector["ListOptionClickedByLabel"] = 1
        else resultVector["ListOptionClickedByLabel"] = 0
    }

    if(performedAction !== undefined && performedAction === "CheckboxClickedByLabel") {
        addToVec(task, "CheckboxClickedByLabel", featVector, "CONVERT")
        if(resultVector["CheckboxClickedByLabel"] == 0)
            resultVector["CheckboxClickedByLabel"] = 1
        else resultVector["CheckboxClickedByLabel"] = 0
    }

    if(performedAction !== undefined && performedAction === "CheckboxClickedBySynonym") {
        addToVec(task, performedAction, featVector, "CONVERT")
        if(resultVector["CheckboxClickedBySynonym"] == 0)
            resultVector["CheckboxClickedBySynonym"] = 1
        else resultVector["CheckboxClickedBySynonym"] = 0
    }
    const isCheck = await isCheckbox(driver)
    if(isCheck === "checkboxes") {
        resultVector["IsCheckbox"] = 1
        addToVec(task, "IsCheckbox", featVector, "ON")
    }
    const isSubmit = await isSubmitButton(driver)
    //addToFeatVector(isSubmit, featVector)
    if(isSubmit === "submitButton") {
        resultVector["IsSubmitButton"] = 1
        addToVec(task, "IsSubmitButton", featVector, "ON")
    }
    if(performedAction !== undefined && performedAction === "SubmitButtonClicked") {
        resultVector["SubmitButtonClicked"] = 1
        addToVec(task, "SubmitButtonClicked", featVector, "ON")
    }
    const instructContainsLabels = await instructionContainsElementLabels(driver)
    //addToFeatVector(instructContainsLabels, featVector)
    if(instructContainsLabels === "instructionTextIncludesLabels") {
        resultVector["LabelsInInstructionText"] = 1
        addToVec(task, "LabelsInInstructionText", featVector, "ON")
    }

    const isButtonByLabel = await isButton(driver)
    if(isButtonByLabel === "buttons") {
        resultVector["IsLabelButton"] = 1
        addToVec(task, "IsLabelButton", featVector, "ON")
    }
    if(performedAction !== undefined && performedAction === "ButtonClickedByLabel") {
        resultVector["ButtonClickedByLabel"] = 1
        addToVec(task, performedAction, featVector, "ON")
    }

    const isFlightDate = await isFlightDatePicker(driver)
    if(isFlightDate === "datepicker") {
        resultVector["IsFlightDatePicker"] = 1
        addToVec(task, "IsFlightDatePicker", featVector, "ON")
    }
    if(performedAction !== undefined && performedAction === "FlightDateEntered") {
        resultVector[performedAction] = 1
        addToVec(task, performedAction, featVector, "ON")
    }

    const isFlightTo = await isEnterFlightTo(driver)
    if(isFlightTo === "enterFlightTo") {
        resultVector["IsFlightToField"] = 1
        addToVec(task, "IsFlightToField", featVector, "ON")
    }

    if(performedAction !== undefined && performedAction === "FlightToEntered") {
        resultVector[performedAction] = 1
        addToVec(task, performedAction, featVector, "ON")
    }

    const isFlightFrom = await isEnterFlightFrom(driver)
    if(isFlightFrom === "enterFlightFrom") {
        resultVector["IsFlightFromField"] = 1
        addToVec(task, "IsFlightFromField", featVector, "ON")
    }

    if(performedAction !== undefined && performedAction === "FlightFromEntered") {
        resultVector[performedAction] = 1
        addToVec(task, performedAction, featVector, "ON")
    }

    const searchButton = await isSearchButton(driver)
    if(searchButton === "searchButton") {
        resultVector["IsSearchButton"] = 1
        addToVec(task, "IsSearchButton", featVector, "ON")
    }
    if(performedAction !== undefined && performedAction === "SearchButtonClicked") {
        resultVector[performedAction] = 1
        addToVec(task, performedAction, featVector, "ON")
    }

    try {
        const bookCondition = await (await driver.findElement(By.xpath('//div[@id="query"]/span[1]'))).getText()
        if (bookCondition === "cheapest") {
            resultVector["IsBookCheapest"] = 1
            addToVec(task, "IsBookCheapest", featVector, "ON")
        }

    if(bookCondition === "shortest") {
        resultVector["IsBookShortest"] = 1
        addToVec(task, "IsBookShortest", featVector, "ON")
    }
    } catch (e) {
        console.error(e.stackTrace)
        resultVector["IsBookCheapest"] = 0
        addToVec(task, "IsBookCheapest", featVector, "OFF")
        resultVector["IsBookShortest"] = 0
        addToVec(task, "IsBookShortest", featVector, "OFF")
    }
    if(performedAction !== undefined && performedAction ==="ShortestFlightBooked") {
        resultVector[performedAction] = 1
        addToVec(task, performedAction, featVector, "ON")
    }
    if(performedAction !== undefined && performedAction ==="CheapestFlightBooked") {
        resultVector[performedAction] = 1
        addToVec(task, performedAction, featVector, "ON")
    }
    return Object.freeze({hashed: featVector, annotated: resultVector})
}

function addToFeatVector(str, featVector) {
    const hash = getStringHash(str)
    const index = hash % featVector.length
    featVector.splice(index, 1, 1)
}

function addToVec(task, str, featVector, convert) {
    const vec = {}
    const hash = getStringHash(str)
    const index = hash % featVector.length
    const ar = Object.keys(task.features)
    if(ar.includes(str)) {
                if (convert === "CONVERT") {
                    if (featVector[index] == 0)
                        featVector.splice(index, 1, 1)
                    else
                        featVector.splice(index, 1, 0)
                } else if (convert === "ON") {
                    featVector.splice(index, 1, 1)
                } else if (convert === "OFF") {
                    featVector.splice(index, 1, 0)
                }
    } else {
        featVector.splice(index, 1, 1)
    }
    vec[str] = featVector[index]
    return Object.freeze(vec)
}

async function getTimerValue(driver) {
    try {
        const xpath = await By.xpath('//span[@id="timer-countdown"]')
        const t = await driver.wait(until.elementLocated(xpath), 10000)
        const timer = await t.getText()
        return timer
    }catch(e) {
        console.error(e.stackTrace)
        return "-"
    }
}

async function isSubmitButton(driver) {
    let button = undefined
    try {
        button = await driver.findElement(By.className('secondary-action'))
        return button !== undefined ? "submitButton" : "noSubmitButton"
    } catch(e) {
        return button = "noSubmitButton"
    }
}

async function isCheckbox(driver) {
    const xpath = await By.xpath('//div[@id="area"]//label/input[@type="checkbox"]')
    const checkboxes = await driver.findElements(xpath)
    return checkboxes.length > 0 ? "checkboxes" : "noCheckboxes"
}

async function isOptions(driver) {
    const options = await By.xpath('//select[@id="options"]//option')
    const values = await driver.findElements(options)
    return values.length > 0 ? "listOptions" : "noListOptions"
}

async function getCheckboxes(driver) {
    const xpath = await By.xpath('//div[@id="area"]//label')
    const checkboxes = await driver.findElements(xpath)
    return checkboxes
}

async function executeOptionsAction(task,agent, driver, tagId, vector) {
    const elem = await driver.findElement(By.id(tagId))
    const index = agent.act(vector)
    const states = reasonState(task, {BMI: vector[0]})

    let valueSelected = undefined
    //if(states.includes(actions[index]))
        valueSelected = await By.xpath('//select[@id="options"]/option[text() = "'+ actions[index].trim() + '"]')
   // else
  //      valueSelected = await By.xpath('//select[@id="options"]/option[text() = "'+ states[0].trim() + '"]')
    await driver.findElement(By.css('[id="options"]')).click()
    await driver.findElement(valueSelected).click()
    await driver.findElement(By.className('secondary-action')).click()
    const rew = await (await driver.findElement(By.id('reward-last'))).getText()
    const reward = parseFloat(rew)
    //if(states.includes(actions[index]))
        agent.learn(reward)
    //else
      //  agent.learn(-1.0)
}

async function selectOptionByLabel(driver, label) {
    const xpath = await By.xpath('//select[@id="options"]/option')
    const options = await driver.findElements(xpath)
    if(options.length > 0) {
        const elem = await driver.wait(until.elementLocated(By.css('[id="options"]')), 10000)
        await elem.click()
        for(let opt of options) {
            const l = await opt.getText()
            if(label.indexOf(l) !== -1) {
               // const valueSelected = By.xpath('//select[@id="options"]/option[text() = "'+ label + '"]')
              //  await driver.findElement(valueSelected).click()
                await opt.click()
                //await clickSubmitButton(driver)
            }
        }
    }
}

async function clickCheckboxByLabel(driver, label) {
    const labels = await driver.findElements(By.xpath('//div[@id="area"]//label'))
    if(labels.length > 0) {
        const check = await driver.wait(until.elementLocated(By.xpath('//div/label[text() = "' + label + '"]/input')), 10000)
        await check.click()
    }
}

async function clickLabelledButton(driver, label) {
    const labels = await driver.findElements(By.xpath('//div[@id="area"]//button'))
    if(labels.length > 0) {
        const button = await driver.wait(until.elementLocated(By.xpath('//div/button[text() = "' + label + '"]')), 10000)
        await button.click()
    }
}

async function isButton(driver) {
    const xpath = await By.xpath('//div[@id="area"]//button')
    const buttons = await driver.findElements(xpath)
    const txt = await buttons[0].getText()
    return buttons.length > 0 /*&& txt !== "Search" && txt !== "Submit"*/ ? "buttons" : "noButtons"
}

async function getButtonLabels(driver) {
    const labels = []
    const xpath = await By.xpath('//div[@id="area"]//button')
    const buttons = await driver.findElements(xpath)
    for(let check of buttons) {
        const txt = await check.getText()
        labels.push(txt)
    }
    return labels
}

async function isFlightDatePicker(driver) {
    try {
        const xpath = await By.xpath('//input[@id="datepicker"]')
        const pickers = await driver.findElements(xpath)
        return pickers.length > 0 ? "datepicker" : "noDatepicker"
    } catch(e) {
        return "noDatepicker"
    }
}

async function ClickButtonByLabel(driver, label) {
    const labels = await getButtonLabels(driver)
    const instruct = await getInstructionText(driver, "query", 10000)
    const filtered = labels.filter((elem) => instruct.includes(elem))
    let txt = ""
    for(let f of filtered) {
        //const checked = await isCheckboxChecked(driver, f)
        //if(!checked) {
            txt = f
            await clickLabelledButton(driver, f)
            //break
        //}
    }
    return "ButtonClickedByLabel"
}

async function ClickButtonById(driver, id) {
    const xpath = await By.xpath(`//button[@id="${id}"]`)
    const button = await driver.findElements(xpath)
    if(button.length > 0) {
        await button[0].click()
        return `ButtonClickedById`
    }

}

async function SelectDateByDatePicker(driver, date) {
    const months = {January: "1", February: "2", March: "3", April: "4", May: "5", June: "6", July: "7", August: "8",
    September: "9", October: "10", November: "11", December: "12"}
    try {
        const xpath = await By.xpath('//*[@id="ui-datepicker-div"]/table/tbody//tr//td[@data-handler="selectDay"]')
        const xpath2 = await By.xpath('//*[@id="datepicker"]')
        const picker = await driver.findElements(xpath2)
        await picker[0].click()

        const selectedMonth = await (await driver.findElement(By.xpath('//*[@class="ui-datepicker-month"]'))).getText()
        const selectedYear = await (await driver.findElement(By.xpath('//*[@class="ui-datepicker-year"]'))).getText()
        const monthNum = parseFloat(months[selectedMonth])
        const d = date.split("/")
        if (parseFloat(d[0]) > monthNum) {
            const m = parseFloat(d[0])
            const times = m - monthNum
            const arr = []
            for (let j = 0; j < times; j++) {
                arr.push(0)
            }

            for (let i of arr) {
                const next = await driver.findElement(By.xpath('//*[@id="ui-datepicker-div"]/div/a[2]'))
                await next.click()
            }

        } else if (parseFloat(d[0]) < monthNum) {
            const times = monthNum - parseFloat(d[0])
            const arr = []
            for (let j = 0; j < times; j++) {
                arr.push(0)
            }

            for (let i of arr) {
                const prev = await driver.findElement(By.xpath('//*[@id="ui-datepicker-div"]/div/a[1]'))
                await prev.click()
            }
        }
        const cols = await driver.findElements(xpath)
        for (let col of cols) {
            const elem = await col.findElement(By.xpath('./a[@class="ui-state-default"]'))
            const day = parseFloat(await elem.getText())
            const month = parseFloat(await col.getAttribute('data-month')) + 1
            const year = parseFloat(await col.getAttribute('data-year'))
            const da = parseFloat(d[1])
            const mo = parseFloat(d[0])
            const ye = parseFloat(d[2])
            if (day === da && month === mo && year === ye) {
                await col.click()
                break
            }
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "DateSelected"
}

async function EnterTextByClass(driver, className, txt) {
    try {
        const txtField = await driver.findElement(By.className(className))
        await txtField.sendKeys(txt)
    } catch(e) {
        console.error(e.stackTrace)
    }
    return `TextEnteredByClass`
}


async function EnterTextById(driver, id, txt) {
    try {
        const txtField = await driver.findElement(By.xpath(`//input[@id="${id}"]`))
        await txtField.sendKeys(txt)
        return txtField
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function isEnterFlightFrom(driver) {
    try {
        const xpath = await By.xpath('//div[@id="query"]/span[2]')
        const from = await driver.findElements(xpath)
        return from.length > 0 ? "enterFlightFrom" : "noEnterFlightFrom"
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function isEnterFlightTo(driver) {
    try {
        const xpath = await By.xpath('//div[@id="query"]/span[3]')
        const to = await driver.findElements(xpath)
        return to.length > 0 ? "enterFlightTo" : "noEnterFlightTo"
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function EnterFlightFrom(driver) {
    try {
        const direction = await driver.findElement(By.xpath('//div[@id="query"]/span[2]'))
        const from = await direction.getText()
        const letter = from.substring(0, 1)
        const txtField = await EnterTextById(driver, 'flight-from', letter)
        await txtField.click()
        await txtField.sendKeys(Key.ARROW_DOWN)
        const opts = await driver.findElements(By.xpath(`//li[@class="ui-menu-item"]//div[@class="ui-menu-item-wrapper"]`))
        for (let opt of opts) {
            const txt = await opt.getText()
            if (txt.includes(from)) {
                await opt.click()
                break
            }
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "FlightFromEntered"
}

async function EnterFlightTo(driver) {
    try {
        const direction = await driver.findElement(By.xpath('//div[@id="query"]/span[3]'))
        const to = await direction.getText()
        const letter = to.substring(0, 1)
        const txtField = await EnterTextById(driver, 'flight-to', letter)
        await txtField.click()
        await txtField.sendKeys(Key.ARROW_DOWN)
        const opts = await driver.findElements(By.xpath(`//li[@class="ui-menu-item"]//div[@class="ui-menu-item-wrapper"]`))
        for (let opt of opts) {
            const txt = await opt.getText()
            if (txt.includes(to)) {
                await opt.click()
                break
            }
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "FlightToEntered"
}

async function EnterFlightDate(driver) {
    try {
        const elem = await driver.findElement(By.xpath('//div[@id="query"]/span[4]'))
        const date = await elem.getText()
        await SelectDateByDatePicker(driver, date)
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "FlightDateEntered"
}

async function BookCheapestFlight(driver) {
    try {
        const divs = await driver.findElements(By.xpath('//div[@id="results"]//div[@class="flight"]'))
        let curr = undefined
        let clickButton = undefined
        for (let div of divs) {
            const book = await div.findElement(By.xpath('./div[@class="book"]'))
            const button = await book.findElement(By.xpath('./button[@class="flight-price"]'))
            const price = parseFloat(await button.getAttribute('data-price'))
            if (curr === undefined) {
                curr = price
                clickButton = button
            }
            if (price < curr) {
                curr = price
                clickButton = button
            }
        }
        await clickButton.click()
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "CheapestFlightBooked"
}

async function BookShortestFlight(driver) {
    try {
        const divs = await driver.findElements(By.xpath('//div[@id="results"]//div[@class="flight"]'))
        let curr = undefined
        let clickButton = undefined
        for (let div of divs) {
            const flightDuration = await div.findElement(By.xpath('./div[@class="flight-duration"]'))
            const time = await flightDuration.findElement(By.xpath('./div[@class="details-container"]/div[@class="time-duration"]'))
            const duration = parseFloat(await time.getAttribute('data-duration'))
            const book = await div.findElement(By.xpath('./div[@class="book"]'))
            const button = await book.findElement(By.xpath('./button[@class="flight-price"]'))
            if (curr === undefined) {
                curr = duration
                clickButton = button
            }
            if (duration < curr) {
                curr = duration
                clickButton = button
            }
        }
        await clickButton.click()
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "ShortestFlightBooked"
}

async function ClickSearchButton(driver) {
    try {
        const button = await driver.findElement(By.xpath('//div[@class="search-container"]/button[@id="search"]'))
        await button.click()
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "SearchButtonClicked"
}

async function isSearchButton(driver) {
    try {
        const xpath = await By.xpath(`//button[@id="search"]`)
        const search = await driver.findElements(xpath)
        return search.length > 0 ? "searchButton" : "noSearchButton"
    } catch(e) {
        return "noSearchButton"
    }
}

async function ClickSubmitButton(driver) {
    try {
        const button = await driver.findElements(By.className('secondary-action'))
        if(button.length > 0) {
            await button[0].click()
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "SubmitButtonClicked"


}

async function quitDriver(driver) {
    try {
        await  driver.quit()
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function startTask(driver) {
    try {
        const start = await driver.wait(until.elementLocated(By.id('sync-task-cover')))
        await start.click()
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function getInstructionText(driver, tagId, time) {
    try {
        const txt = await driver.wait(until.elementLocated(By.id(tagId)), time)
        const instruction = await txt.getText()
        return instruction
    } catch (e) {
        console.error(this.name+" " +e.stackTrace)
    }
}

async function instructionContainsElementLabels(driver) {
    try {
        const instruction = await getInstructionText(driver, "query", 10000)
        const optionLabels = await getOptionLabels(driver)
        const checkboxLabels = await getCheckboxLabels(driver)
        const buttonLabels = await getButtonLabels(driver)
        let result = false
        optionLabels.forEach((label) => {
            if (instruction.includes(label)) {
                result = true
            }
        })
        checkboxLabels.forEach((label) => {
            if (instruction.includes(label)) {
                result = true
            }
        })
        buttonLabels.forEach((label) => {
            if (instruction.includes(label)) {
                result = true
            }
        })
        return (result === true) ? "instructionTextIncludesLabels" : "instructionTextIncludesNoLabels"
    } catch(e) {
        console.error(e.stackTrace)
        return "instructionTextIncludesNoLabels"
    }
}

function addReward(agent, reward) {
    agent.learn(reward)
    return agent
}

function initAgent(task, web, numFeatures, numActions, algo, alpha = 0.01, epsilon = 0.1) {
    let json = undefined
    if(algo !== "KarpathyAgent")
         json = loadModel(`${task.id}.json`)
    const spec = Object.freeze({
        update: 'qlearn',
        alpha,
        epsilon
    })
    const env = Object.freeze({
        getNumStates : function() { return numFeatures},
        getMaxNumActions : function() { return numActions }
    })
    const agent = new RL.DQNAgent(env, spec)
    if(json !== undefined && json !== null)
        agent.fromJSON(json)
    return agent
}

function storeModel(path, data){
    let mod = JSON.stringify(data, null, 2)
    writeFileSync(path, mod)
}

function loadModel(filepath) {
    if(existsSync(filepath)) {
        let model = readFileSync(filepath)
        model = JSON.parse(model.toString())
        return model
    } else return undefined
}

async function getPageTitle(driver) {
    try {
        const title = await driver.getTitle()
        console.log(title)
        return title
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function getBodyText(driver) {
    try {
        const b = await driver.wait(until.elementLocated(By.xpath('//body/*')), 10000)
        const body = await b.getText()
        return body
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function act2(task, web, actions, len, driver, alpha, epsilon) {
    //const numFeats = len //Object.keys(task.features).length
    const numActions = Object.keys(task.actions).length
    const agent = initAgent(task, web, len, actions.length, "KarpathyAgent", alpha, epsilon)
    return async function(state) {
        let temp = state
        let featVec = temp.hashed
        let time = undefined
        let reward = 0
        let actionCounter = 0
        while ((time = await getTimerValue(driver)) !== "-") {
            //console.log(parseFloat(time.substring(0, time.indexOf("/")).trim()))
            const index = agent.act(featVec)
            const action = actions[index]
            console.log(action)
            try {
                const actName = await action(driver)
                actionCounter += 1
                temp = await generateState(task, driver, temp, false, actName)
                featVec = temp.hashed
                agent.learn(0)
            } catch (e) {
                reward = -1
                agent.learn(reward)
            }
        }
        try {
            const rew = await (await driver.findElement(By.id('reward-last'))).getText()
            //console.log(rew)
            reward = parseFloat(rew)
            //if(reward > 0)
            //reward = 1
            //else reward = -1
            //if (reward > 0 && actionCounter > 0) {
            //  reward /= actionCounter
            // }
            agent.learn(reward)
        } catch (e) {
            console.error(e.stackTrace)
        }
        console.log(reward)
        return {reward, pol: agent.toJSON()}
    }
}

async function act(task, web, actions, len, driver, alpha, epsilon) {
    const numActions = Object.keys(task.actions).length
    const agent = initAgent(task, web, len, actions.length, "QLearnAgent", alpha, epsilon)
    return async function(state) {
        let temp = state
        let featVec = temp.hashed
        let time = undefined
        let reward = 0
        let actionCounter = 0
        while ((time = await getTimerValue(driver)) !== "-") {
            const index = agent.act(featVec)
            const action = actions[index]
            console.log(action)
            try {
                const actName = await action(driver)
                actionCounter += 1
                temp = await generateState(task, driver, temp, false, actName)
                featVec = temp.hashed
                agent.learn(0)
            } catch (e) {
                reward = -1
                agent.learn(reward)
            }
        }
        try {
            const rew = await (await driver.findElement(By.id('reward-last'))).getText()
            //console.log(rew)
            reward = parseFloat(rew)
            //if(reward > 0)
                //reward = 1
            //else reward = -1
            //if (reward > 0 && actionCounter > 0) {
              //  reward /= actionCounter
           // }
            agent.learn(reward)
        } catch (e) {
            console.error(e.stackTrace)
        }
        console.log(reward)
        return {reward, pol: agent.toJSON()}
    }
}

async function ClickCheckboxBySynonym(driver) {
    const synonyms =  [
        ['big', 'large', 'huge', 'enormous', 'gigantic'],
        ['small', 'tiny', 'little', 'mini', 'petite'],
        ['red', 'scarlet', 'crimson', 'vermillion'],
        ['happy', 'cheerful', 'joyful', 'gleeful', 'delighted'],
        ['sad', 'unhappy', 'sorrowful', 'miserable', 'tragic'],
        ['angry', 'mad', 'furious', 'irritated'],
        ['evil', 'wicked', 'immoral', 'sinful', 'corrupt', 'depraved'],
        ['wrong', 'incorrect', 'mistaken', 'erroneous'],
        ['real', 'genuine', 'actual'],
        ['strange', 'odd', 'peculiar', 'unusual', 'weird'],
        ['stop', 'cease', 'halt', 'end', 'finish'],
        ['scared', 'terrified', 'panicked', 'fearful', 'frightened', 'afraid'],
        ['quiet', 'calm', 'peaceful', 'serene', 'mild'],
        ['old', 'aged', 'archaic'],
        ['love', 'like', 'adore', 'favor'],
        ['kill', 'murder', 'assassinate'],
        ['keep', 'retain', 'preserve', 'sustain', 'maintain'],
        ['hide', 'conceal', 'camouflage'],
        ['hate', 'despise', 'loathe', 'detest', 'dislike'],
        ['funny', 'humorous', 'amusing', 'comical', 'laughable'],
        ['fat', 'fleshy', 'plump', 'chubby'],
        ['stupid', 'dumb', 'dull', 'unwise'],
        ['delicious', 'savory', 'delectable', 'appetizing'],
        ['cut', 'slice', 'carve', 'chop'],
        ['brave', 'courageous', 'fearless'],
        ['begin', 'start', 'initiate', 'launch'],
        ['answer', 'reply', 'response'],
        ['television', 'televisions', 'TV', 'TVs'],
        ['house', 'home', 'houses', 'homes'],
        ['fire', 'flame', 'fires', 'flames'],
        ['pig', 'pork', 'swine', 'pig'],
        ['rabbit', 'rabbits', 'bunny', 'bunnies'],
        ['car', 'cars', 'automobile', 'automobiles', 'vehicle', 'vehicles'],
        ['water'],
    ]
    try {
        const labels = await getCheckboxLabels(driver)
        const instruct = await getInstructionText(driver, "query", 10000)
        const sub = instruct.substring(instruct.indexOf("to") + 2, instruct.lastIndexOf("and")).trim()
        const instructWords = sub.split(" ")

       /* let json = undefined
        let synonyms = []
        for(let f of instructWords) {
            let w = f
            if(f.includes(","))
                w = f.replace(",", "")
            if(f.includes("."))
                w = f.replace(".", "")
            json = await datamuse.request(`words?rel_syn=${w}`)
            json.forEach((syn) => {
                synonyms.push(syn["word"])
            })
        }*/
        const instWords = instructWords.map((inst) => {
            let val = inst.replace(",", "")
            val = val.replace(".", "").trim()
            return val
        })
        const filteredSynonyms = []
        synonyms.forEach((elem) => {
            const match = elem.filter((inst) => {return instWords.includes(inst)})
            if(match.length > 0) {
                const ar = elem.filter((syn) => {
                    return labels.includes(syn)
                })
                ar.forEach((val) => {
                    filteredSynonyms.push(val)
                })
            }
        })

        if(filteredSynonyms.length > 0) {
            let txt = ""
            for (let s of filteredSynonyms) {
                const checked = await isCheckboxChecked(driver, s)
                if (!checked) {
                    txt = s
                    await clickCheckboxByLabel(driver, s)
                }
            }
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "CheckboxClickedBySynonym"
}

function adjustPolicy(task, actionStatePairs, vecSize, Q, learningRate, discountfactor, reward) {
    const sequences = {}
    const getQValue = computeQValue(learningRate, discountfactor)
    let counter = 0
    actionStatePairs.forEach((pair) => {

        const asp = actionStatePairs[counter]
        const key = Object.keys(asp)[0]
        const vec = asp[key]
        const starting = reasonState(task, vec)
        const startingState = starting.filter(s => task.states[s][s].IsGoal === 'false' && Object.keys(task.states[s][s].HasAction).includes(key))
        startingState.forEach((start) => {
        if (start !== undefined) {
            sequences[start] = {actions: [], Q: 0, statements: []}
            for (let v in vec) {
                if (v in task.features)
                    sequences[start].statements.push(`:${v} :hasValue xsd:double^^"${vec[v]}".`)
                else
                    sequences[start].statements.push(`:InstructionText :hasInstructionWord "${v}".`)

            }
            let curr = 0
            actionStatePairs.forEach((pair) => {
                for (let p in pair) {
                    if (curr >= counter)
                        sequences[start].actions.push(p)
                    curr += 1
                }
            })

            for (let p in pair) {
                const featVec = pair[p]
                const performedAction = p
                const states = reasonState(task, featVec)
                const filteredStates = states.filter(s => task.states[s][s].IsGoal === 'false' && Object.keys(task.states[s][s].HasAction).includes(performedAction))

                const nextActions = []
                const sendActions = []
                let nextReward = 0
                let nextState = undefined
                let lastState = undefined
                let lastActions = {}
                let interimQ = undefined
                filteredStates.forEach((state) => {
                    if (!(sendActions.includes(performedAction)))
                        sendActions.push(performedAction)
                    let vec = {}
                    let tVec = []
                    for (let i = 0; i < vecSize; i++) {
                        tVec.push(0)
                    }
                    for (let f in featVec) {
                        const hash = getStringHash(f)
                        const pointer = hash % vecSize
                        tVec.splice(pointer, 1, featVec[f])
                    }

                    for (let effect in task.actions[performedAction][performedAction].HasEffect) {
                        const obsFeats = Object.keys(task.actions[performedAction][performedAction].HasEffect[effect].HasObservationFeature)
                        let impactType = task.actions[performedAction][performedAction].HasEffect[effect].HasImpactType
                        obsFeats.forEach((feat) => {
                            vec = addToVec(task, feat, tVec, impactType)
                        })

                    }
                    const updatedState = {unscaledVector: {}}
                    for (let v in vec) {
                        updatedState.unscaledVector[v] = vec[v]
                    }
                    for (let f in featVec) {
                        if (!(f in updatedState.unscaledVector)) {
                            updatedState.unscaledVector[f] = featVec[f]
                        }
                    }
                    const nextStates = reasonState(task, updatedState.unscaledVector)

                    nextStates.forEach((st) => {
                        if (interimQ === undefined) {
                            interimQ = Q[st].Q
                        }
                        if (interimQ <= Q[st].Q) {
                            lastActions[performedAction] = Q[st].Q
                            interimQ = Q[st].Q
                        }
                    })
                })
                let acting = undefined
                const keys = Object.keys(lastActions)
                if (keys.length > 0) {
                    keys.forEach((k) => {
                        if (acting === undefined) {
                            acting = k
                        } else {
                            if (lastActions[acting] < lastActions[k]) {
                                delete lastActions[acting]
                            } else if (lastActions[acting] > lastActions[k]) {
                                delete lastActions[k]
                            }
                            acting = k
                        }
                    })
                    let instruction = undefined
                    let qA = undefined
                    filteredStates.forEach((s) => {

                        if (!(s in Q)) {
                            Q[s] = {actions: [], Q: 0}
                        }
                        if (Q[s].actions.includes(performedAction)) {
                            if (qA === undefined)
                                qA = Q[s].Q
                            if (Q[s].Q > qA)
                                qA = Q[s].Q
                        } else {
                            qA = 0
                        }

                    })
                    const maxQNext = lastActions[performedAction]
                    const q = getQValue(reward, qA, maxQNext)
                    sequences[start]["Q"] = q
                }
            }
            counter += 1
        } else {
            let key = Object.keys(pair)
            sequences[key] = {actions: [], Q: 0, statements: []}
            //TODO: get nextQMax, qA and compute q
        }
    })
    })
    return sequences
}

function adjustQFunction(task, actionStatePairs, vecSize, Q, learningRate, discountfactor, reward) {
    for(let pair of actionStatePairs) {
        for(let p in pair) {
        const featVec = pair[p]
        const performedAction = p
        for (let f in featVec) {
            if (!(f in task.features)) {
                if (!(f in Q)) {
                    Q[f] = {}
                    for (let a in task.actions) {
                        Q[f][a] = 0
                    }
                }
                /*else {
                    for (let a in task.actions) {
                        Q[f][a] = Q[f][a]
                    }
                }*/
            }
        }
        if (performedAction !== undefined) {
            const states = reasonState(task, featVec)
            const getQValue = computeQValue(learningRate, discountfactor)
            const filteredStates = states.filter(s => task.states[s][s].IsGoal === 'false' && Object.keys(task.states[s][s].HasAction).includes(performedAction))
            const nextActions = []
            const sendActions = []
            let nextReward = 0
            let nextState = undefined
            let lastState = undefined
            let lastActions = {}
            let interimQ = undefined
            filteredStates.forEach((state) => {
                if (!(sendActions.includes(performedAction)))
                    sendActions.push(performedAction)
                let vec = {}
                let tVec = []
                for (let i = 0; i < vecSize; i++) {
                    tVec.push(0)
                }
                for (let f in featVec) {
                    const hash = getStringHash(f)
                    const pointer = hash % vecSize
                    tVec.splice(pointer, 1, featVec[f])
                }

                for (let effect in task.actions[performedAction][performedAction].HasEffect) {
                    const obsFeats = Object.keys(task.actions[performedAction][performedAction].HasEffect[effect].HasObservationFeature)
                    let impactType = task.actions[performedAction][performedAction].HasEffect[effect].HasImpactType
                    obsFeats.forEach((feat) => {
                        vec = addToVec(task, feat, tVec, impactType)
                    })

                }
                const updatedState = {unscaledVector: {}}
                for (let v in vec) {
                    updatedState.unscaledVector[v] = vec[v]
                }
                for (let f in featVec) {
                    if (!(f in updatedState.unscaledVector)) {
                        updatedState.unscaledVector[f] = featVec[f]
                    }
                }
                const nextStates = reasonState(task, updatedState.unscaledVector)

                nextStates.forEach((st) => {
                    for (let next in Q[st]) {
                        if (interimQ === undefined) {
                            interimQ = Q[st][next]
                        }
                        if (interimQ <= Q[st][next]) {
                            lastActions[performedAction] = Q[st][next]
                            interimQ = Q[st][next]
                        }
                    }
                })
            })
            let acting = undefined
            const keys = Object.keys(lastActions)
            if (keys.length > 0) {
                keys.forEach((k) => {
                    if (acting === undefined) {
                        acting = k
                    } else {
                        if (lastActions[acting] < lastActions[k]) {
                            delete lastActions[acting]
                        } else if (lastActions[acting] > lastActions[k]) {
                            delete lastActions[k]
                        }
                        acting = k
                    }
                })
                let instruction = undefined
                let qA = undefined
                filteredStates.forEach((s) => {

                    if (!(s in Q)) {
                        Q[s] = {}
                    }
                    if (performedAction in Q[s]) {
                        if(qA === undefined)
                            qA = Q[s][performedAction]
                        if(Q[s][performedAction] > qA)
                            qA = Q[s][performedAction]
                    } else {
                        Q[s][performedAction] = 0
                    }
                    //console.log(qA)
                })
                const maxQNext = lastActions[performedAction]
                const q = getQValue(reward, qA, maxQNext)

                for (let f in featVec) {
                    if (!(f in task.features)) {
                        filteredStates.push(f)
                    }
                }
                filteredStates.forEach((s) => {
                    if (performedAction in Q[s]) {
                        Q[s][performedAction] = q
                        //console.log("q: "+q)
                    }
                })
            }
        }
    }
    }
    return Q
}

function computeQValue(learningrate, discountFactor) {
    const alpha = learningrate
    const gamma = discountFactor
    return function (reward, qA, maxQNext) {
        const delta = reward + gamma * maxQNext - qA
        qA += alpha * delta
        return qA
    }
}

async function selectAction(task, web, actions, len, driver, alpha, epsilon) {
    const indices = {}
    let policies = {}
    let index = 0
    actions.forEach((a) => {
        indices[a.name] = index
        index += 1
    })
    if (existsSync(`${web}_RLAgent_model_adjusted.json`)) {
        policies = loadModel(`${web}_RLAgent_model_adjusted.json`)
    } else {
        for (let s in task.states) {
            policies[s] = {actions: [], statements: [], Q: undefined}
            const actions = Object.keys(task.actions)
            if (task.states[s][s].HasAction !== undefined) {
                let acts = Object.keys(task.states[s][s].HasAction)
                acts.forEach((a) => {
                    policies[s].actions.push(a)
                })
                policies[s]["Q"] = 1
            }
            if (task.states[s][s].IsGoal) {
                policies[s]["Q"] = 1
            }
        }
        storeModel(task.id + '_RLAgent_model.json', policies)
    }
    return async function(state, pol) {
        let temp = state
        let featVec = state.annotated
        let time = undefined
        let reward = 0
        let actionCounter = 0
        var performedAction = undefined

        if(pol === undefined) {
           pol = policies
        }
        const actionStatePairs = []
        let count = 0
        let sequ = undefined
        while ((time = await getTimerValue(driver)) !== "-") {
            const val = Math.abs(getRandomDouble(0, 1))
            let index = 0
            if (val <= epsilon) {
                index = getRandomInt(0, actions.length)
            } else {
                const states = reasonState(task, featVec)
                console.log(states)
                let actionsSequence = undefined
                let lastQ = undefined
                let sequences = []
                if(states !== undefined && states.length > 0) {
                    states.forEach((s) => {
                        const policy = pol[s]
                        if (lastQ === undefined) {
                            lastQ = policy.Q
                        }
                        if (policy.Q > lastQ) {
                            lastQ = policy.Q
                            sequences.splice(sequences.length - 1, 1, policy.actions)
                        }
                        if (policy.Q === lastQ) {
                            lastQ = policy.Q
                            sequences.push(policy.actions)
                        }

                        //TODO:
                        if (pol[s].statements.length === 0) {
                            for (let f in featVec) {
                                if (f in task.features)
                                    pol[s].statements.push(`:${f} :hasValue xsd:double^^"${featVec[f]}".`)
                                else
                                    pol[s].statements.push(`:InstructionText :hasInstructionWord "${f}".`)
                            }
                        } else {
                            for (let f in featVec) {
                                if (!(f in task.features) && !(pol[s].statements.includes(`:InstructionText :hasInstructionWord "${f}".`))) {
                                    pol[s].statements.push(`:InstructionText :hasInstructionWord "${f}".`)
                                }
                            }
                        }
                    })
                } else {
                    //TODO: Add to policy triples as key
                    let key = ""
                    if(!(key in pol)) {
                        pol[key] = {actions: [], statements: [], Q: 0}
                    }
                    if(pol[s].statements.length === 0) {
                        for (let f in featVec) {
                            key += `${f} : ${featVec[f]}\n`
                            if (f in task.features)
                                pol[key].statements.push(`:${f} :hasValue xsd:double^^"${featVec[f]}".`)
                            else
                                pol[s].statements.push(`:InstructionText :hasInstructionWord "${f}".`)
                        }
                    } else {
                        for (let f in featVec) {
                            if (!(f in task.features) && !(pol[s].statements.includes(`:InstructionText :hasInstructionWord "${f}".`))) {
                                pol[s].statements.push(`:InstructionText :hasInstructionWord "${f}".`)
                            }
                        }
                    }
                    const policy = pol[key]
                    if (lastQ === undefined) {
                        lastQ = policy.Q
                    }
                    if (policy.Q > lastQ) {
                        lastQ = policy.Q
                        sequences.splice(sequences.length - 1, 1, policy.actions)
                    }
                    if (policy.Q === lastQ) {
                        lastQ = policy.Q
                        sequences.push(policy.actions)
                    }

                }
                if (sequences.length > 1) {
                    let ind = getRandomInt(0, sequences.length)
                    actionsSequence = sequences[ind]
                } else {
                    actionsSequence = sequences[0]
                }
                let c = undefined
                if (actionsSequence.length === 1)
                    c = 0
                else if (actionsSequence.length > 1)
                    c = count

                const a = actionsSequence[c]
                index = indices[a]
            }
            const action = actions[index]
            performedAction = action.name
            console.log(performedAction)
            try {
                const actName = await action(driver)
                actionCounter += 1
                actionStatePairs.push({[performedAction]: featVec})
                temp = await generateState(task, driver, temp, false, actName)
                featVec = temp.annotated
            } catch (e) {
                console.error(e.stackTrace)
                reward = -1
                actionStatePairs.push({[performedAction]: featVec})
                sequ = adjustPolicy(task, actionStatePairs, len, pol, alpha, epsilon, reward)
                for(let seq in sequ) {
                    if(!(seq in policies)) {
                        pol[seq] = sequ[seq]
                    } else {
                        if(pol[seq]["Q"] < sequ[seq]["Q"]) {
                            delete policies[seq]
                            pol[seq] = sequ[seq]
                        }
                    }
                }
            }
            count += 1
        }
        const rew = await (await driver.findElement(By.id('reward-last'))).getText()
        console.log(rew)
        reward = parseFloat(rew)
        if (reward > 0 && actionCounter > 0)
            reward /= actionCounter
        sequ = adjustPolicy(task, actionStatePairs, len,  pol, alpha, epsilon, reward)
        for(let seq in sequ) {
            if(!(seq in pol)) {
                pol[seq] = sequ[seq]
            } else {
                if(pol[seq]["Q"] === 1 || pol[seq]["Q"] < sequ[seq]["Q"]) {
                    delete pol[seq]
                    pol[seq] = sequ[seq]
                }
            }
        }
        return {pol, reward}
    }
}

async function isOver(driver) {
    try {
        const elem = await driver.findElements(By.id("sync-task-cover"))
        return elem.length > 0
    } catch(e) {
        console.error(e.stackTrace)
    }
}

async function SelectOptionByLabel(driver) {
    try {
        const labels = await getOptionLabels(driver)
        const instruct = await getInstructionText(driver, "query", 10000)
        const filtered = labels.filter((elem) => instruct.includes(elem))
        // const index = getRandomInt(0, filtered.length)
        let txt = ""
        for (const f of filtered) {
            const selected = await isOptionSelected(driver, f)
            if (!selected) {
                txt = f
                await selectOptionByLabel(driver, f)
                //break
            }
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "ListOptionClickedByLabel"
}

async function SelectAllOptions(driver) {
    const labels = await getOptionLabels(driver)
    const instruct = await getInstructionText(driver, "query", 10000)
    let txt = ""
    for(const f of labels) {
        const selected = await isOptionSelected(driver, f)
        if(!selected) {
            txt += f+";"
            await selectOptionByLabel(driver, f)
            //break
        }
    }
    return "selectAllOptions:"+txt
}

async function isCheckboxChecked(driver, text) {
    try {
        const xpath = await By.xpath('//div[@id="area"]//label[text() = "' + text + '"]')
        const checkbox = await driver.wait(until.elementLocated(xpath), 10000)
        return await checkbox.isSelected()
    } catch(e) {
        console.error(e.stackTrace)
        return false
    }
}

async function isOptionSelected(driver, text) {
    try {
        const xpath = await By.xpath('//select[@id="options"]/option[text() = "' + text + '"]')
        const option = await driver.findElement(xpath)
        return await option.isSelected()
    } catch(e) {
        console.error(e.stackTrace)
        return false
    }
}

async function ClickCheckboxByLabel(driver) {
    try {
        const labels = await getCheckboxLabels(driver)
        const instruct = await getInstructionText(driver, "query", 10000)
        const filtered = labels.filter((elem) => instruct.includes(elem))
        // const index = getRandomInt(0, filtered.length)
        let txt = ""
        for (let f of filtered) {
            const checked = await isCheckboxChecked(driver, f)
            if (!checked) {
                txt = f
                await clickCheckboxByLabel(driver, f)
                //break
            }
        }
    } catch(e) {
        console.error(e.stackTrace)
    }
    return "CheckboxClickedByLabel"
}

async function ClickAllCheckboxes(driver) {
    const labels = await getCheckboxLabels(driver)
    const instruct = await getInstructionText(driver, "query", 10000)
    let txt = ""
    for(let f of labels) {
        const checked = await isCheckboxChecked(driver, f)
        if(!checked) {
            txt += f+";"
            await ClickCheckboxByLabel(driver, f)
            //break
        }
    }
    return "clickAllCheckboxes:"+txt
}

async function selectOptionByRule(driver) {
    const rules = {}
    const terms = {
        "LowBodyWeight": "BMI < 18.5",
        "NormalBodyWeight": "BMI >= 18.5 && BMI <= 25",
        "HighBodyWeight": "BMI > 25"
    }
    const val = await getInstructionText(driver, "query", 10000)
    for(const term in terms) {
        rules[term] = `${val}; ${terms[term]}`
    }
    let result = undefined
    for(let rule in rules) {
        const label = eval(rules[rule])
        if (label) {
            result = rule
        }
    }
    await SelectOptionByLabel(driver, result)
    //console.log(result)
    return "selectOptionByRule:"+result
}

async function checkBoxByRule(driver, rule) {
    const rules = {}
    const terms = {
        "LowBodyWeight": "BMI < 18.5",
        "NormalBodyWeight": "BMI >= 18.5 && BMI <= 25",
        "HighBodyWeight": "BMI > 25"
    }
    const val = await getInstructionText(driver, "query", 10000)
    for(const term in terms) {
        rules[term] = `${val}; ${terms[term]}`
    }
    let result = undefined
    for(let rule in rules) {
        const label = eval(rules[rule])
        if (label) {
            result = rule
        }
    }
    await ClickCheckboxByLabel(driver, result)
    //console.log(result)
    return "clickCheckboxByRule:"+result
}

async function ruleBasedAction(task, web, actions, len, driver, alpha, epsilon) {
    let indices = {}
    let i = 0
    actions.forEach((a) => {
        indices[a.name] = i
        i += 1
    })
    return async function (state) {
        let temp = state
        let featVec = state.annotated
        let reward = 0
        let actionCounter = 0
        let time = undefined
        while ((time = await getTimerValue(driver)) !== "-") {
            const possibleActions = []
            const states = reasonState(task, featVec)
            states.forEach((s) => {
               // console.log(s)
                for (let a in task.states[s][s].HasAction) {
                    if(!(possibleActions.includes(a)))
                        possibleActions.push(a)
                }
            })
            const index = getRandomInt(0, possibleActions.length)
            const name = possibleActions[index]
            const pos = indices[name]
            const action = actions[pos]
            try {
                const actName = await action(driver)
                console.log(actName)
                actionCounter += 1
                temp = await generateState(task, driver, temp, false, actName)
                featVec = temp.annotated
            } catch (e) {
                console.error(e.stackTrace)
            }
        }
        try {
            const rew = await (await driver.findElement(By.id('reward-last'))).getText()
            console.log(rew)
            reward = parseFloat(rew)
           // if(reward > 0)
              //  reward = 1
           // else reward = -1
             //if (reward > 0 && actionCounter > 0)
               // reward /= actionCounter
        } catch (e) {
            console.error(e.stackTrace)
        }
        return {reward, pol: undefined}
    }
}

async function evalAlgorithm(alogritms, algo, web, actions, episodes, repeat, website, browser, learningrate, epsilon) {
    let csv = "Episode, Reward\n"
    let store = []
    for(let i = 0; i < episodes; i++) {
        store[i] = []
    }
    const task = getTaskProfile()
    let actionCounter = 0
    let result = undefined
    let currentAlgorithm = undefined
    const vecSize = 1024 //Object.keys(task.features).length


    for (let i = 0; i < repeat; i++) {
        const driver = await initDriver(website, browser)
        const exec = await alogritms[algo](task, web, actions, vecSize, driver, learningrate, epsilon)
        let counter = 0
        while (counter < episodes) {
            const vec = []
            for (let i = 0; i < vecSize; i++) {
                vec[i] = 0
            }
            const st = {hashed: vec}
            try {
                await startTask(driver)
                const state = await generateState(task, driver, st, true)
                if (result !== undefined && result.pol !== undefined)
                    result = await exec(state, result.pol)
                else
                    result = await exec(state)
                const reward = result.reward
                store[counter].push(reward)
            } catch (e) {
                console.error(e.stackTrace)
            }
            counter += 1
        }
        try {
            await driver.quit()
        } catch(e) {
            console.error(e.stackTrace)
            await driver.quit()
        }
    }

    //Compute average reward for every episode and store in CSV file
    let num = 0
    for(let row of store) {
        num += 1
        const val = row.reduce((acc, curr) => acc + curr)
        csv += `${num}, ${val / row.length}\n`
    }

        if (result !== undefined && result.pol !== undefined && result.pol !== null)
            storeModel(`${web}_${algo}_model_adjusted.json`, result.pol)
        writeFileSync(`${web}_${algo}_eval_${epsilon}.csv`, csv)
    /*try {
        await driver.quit()
    } catch(e) {
        console.error(e.stackTrace)
        await driver.quit()
    }*/
}

async function main(episodes, browser) {
    const websites = ['click-checkboxes', 'click-checkboxes-soft', 'click-checkboxes-large', 'click-checkboxes-transfer',
         'click-button', 'click-button-sequence',
        'choose-list', 'book-flight', 'book-flight-nodelay']
    const task = getTaskProfile()
    const algorithms = {/*RLAgent: selectAction,*/ QLearnAgent: act, KarpathyAgent: act2, RuleBasedAgent: ruleBasedAction}
    const actions = Object.keys(task.actions)
    const actionsFunc = actions.map((a) => {
        return eval(a)
    })
    for(let web of websites) {
        const website = `http://localhost:8080/miniwob/${web}.html`
        for (let algo in algorithms) {
            await evalAlgorithm(algorithms, algo, web, actionsFunc, episodes, 10, website, browser, 0.01, 0.1)
        }
    }
}

main(1000, 'chrome')