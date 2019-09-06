#!/usr/bin/env node
const {readFileSync, writeFileSync, existsSync} = require('fs')
const R = require('ramda')

function getTask() {
    if(existsSync("./task.json")) {
        const json = readFileSync("./task.json")
        const task = JSON.parse(json)
        if(existsSync("./patient.json")) {
            const json = readFileSync("./patient.json")
            const patient = JSON.parse(json)
            return task.concat(patient)
        }
        return task
    } else return undefined
}

function scaleFeatures(value, min, max){
    const scalefactor = max - min;
    if(scalefactor !== 0.0) {
        return Math.round(((value - min) / scalefactor) * 100) / 100
    }
    return 0.0
}

function updateStateFeaturesToNextState(task, statevector, action) {
    let tempo = {scaledVector: {}, unscaledVector: {}}
    let featVector = {}
    let scaledFeatVector = {}
    let featRanges = {}
    let statename = reasonState(task, statevector.unscaledVector)
    statename.forEach((sta) => {
        let state = task.states[sta][sta]
        let ruletokens = state.HasExpression.split(" ")
        let index = 0
        ruletokens.forEach((token) => {
            if (index % 4 === 0) {
                featRanges[token] = {min: undefined, max: undefined}
                if (ruletokens[index + 1] === ">" || ruletokens[index + 1] === ">=") {
                    featRanges[token].min = parseFloat(ruletokens[index + 2])
                } else if (ruletokens[index + 1] === "<" || ruletokens[index + 1] === "<=") {
                    featRanges[token].max = parseFloat(ruletokens[index + 2])
                } else if (ruletokens[index + 1] === "==") {
                    featRanges[token].min = parseFloat(ruletokens[index + 2])
                    featRanges[token].max = parseFloat(ruletokens[index + 2])
                }
            }
            index += 1
        })
        const feats = Object.keys(featRanges)
        feats.forEach((f) => {
            if (featRanges[f].min === undefined) {
                if(f in task.features) {
                    const mini = parseFloat(task.features[f][f].HasRangeStart)
                    featRanges[f].min = mini
                } else {
                    for(let feat in task.features) {
                        if(task.features[feat][feat].HasFeatureType.includes("AGG")) {
                            if(f in task.features[feat][feat].HasObservationFeature) {
                                const mini = parseFloat(task.features[feat][feat].HasObservationFeature[f].HasRangeStart)
                                featRanges[f].min = mini
                            }
                        }
                    }
                }
            }
            if (featRanges[f].max === undefined) {
                if(f in task.features) {
                    const maxi = parseFloat(task.features[f][f].HasRangeEnd)
                    featRanges[f].max = maxi
                } else {
                    for(let feat in task.features) {
                        if(task.features[feat][feat].HasFeatureType.includes("AGG")) {
                            if(f in task.features[feat][feat].HasObservationFeature) {
                                const maxi = parseFloat(task.features[feat][feat].HasObservationFeature[f].HasRangeEnd)
                                featRanges[f].max = maxi
                            }
                        }
                    }
                }
            }
        })
    })
    const effects = action.HasEffect
    const effectKeys = Object.keys(effects)
    const stateKeys = Object.keys(statevector.unscaledVector)
    effectKeys.forEach((ek) => {
        if (effects[ek].HasObservationFeature !== null && effects[ek].HasObservationFeature !== undefined) {
            const featKeys = Object.keys(effects[ek].HasObservationFeature)
            const impactType = effects[ek].HasImpactType
            const impactVal = effects[ek].HasImpactRange
            stateKeys.forEach((sk) => {
                if (featKeys.indexOf(sk) !== -1) {
                    if (sk in task.features) {
                        const min = task.features[sk][sk].HasRangeStart
                        const max = task.features[sk][sk].HasRangeEnd
                        if (statevector.unscaledVector[sk] < min) {
                            //const range = max - min
                            //const val = max - (range / 2)
                            tempo.unscaledVector[sk] = min
                            tempo.scaledVector[sk] = scaleFeatures(min, min, max)
                        }
                        if (statevector.unscaledVector[sk] > max) {
                            tempo.unscaledVector[sk] = max
                            tempo.scaledVector[sk] = scaleFeatures(max, min, max)
                        }
                        if (sk in featRanges) {
                            const featMin = featRanges[sk].min
                            const featMax = featRanges[sk].max
                            if (impactType === "INCREASE") {
                                const val = featMax + impactVal
                                featVector[sk] = val > max ? max : val
                            } else if (impactType === "DECREASE") {
                                const val = featMin - impactVal
                                featVector[sk] = val < min ? min : val
                            } else if (impactType === "CONVERT") {
                                featVector[sk] = statevector.unscaledVector[sk] === 1 ? 0 : 1
                            } else if(impactType === "ON") {
                                featVector[sk] = 1
                            } else if(impactType === "OFF") {
                                featVector[sk] = 0
                            }
                            scaledFeatVector[sk] = scaleFeatures(featVector[sk], min, max)
                        }
                    } else {
                        for(let f in task.features) {
                            if(task.features[f][f].HasFeatureType.includes("AGG")) {
                                if(sk in task.features[f][f].HasObservationFeature) {
                                    const obs = task.features[f][f].HasObservationFeature[sk]
                                    const min = obs.HasRangeStart
                                    const max = obs.HasRangeEnd
                                    if (statevector.unscaledVector[sk] < min) {
                                        //const range = max - min
                                        //const val = max - (range / 2)
                                        tempo.unscaledVector[sk] = min
                                        tempo.scaledVector[sk] = scaleFeatures(min, min, max)
                                    }
                                    if (statevector.unscaledVector[sk] > max) {
                                        tempo.unscaledVector[sk] = max
                                        tempo.scaledVector[sk] = scaleFeatures(max, min, max)
                                    }
                                    if (sk in featRanges) {
                                        const featMin = featRanges[sk].min
                                        const featMax = featRanges[sk].max
                                        if (impactType === "INCREASE") {
                                            const val = featMax + impactVal
                                            featVector[sk] = val > max ? max : val
                                        } else if (impactType === "DECREASE") {
                                            const val = featMin - impactVal
                                            featVector[sk] = val < min ? min : val
                                        } else if (impactType === "CONVERT") {
                                            featVector[sk] = statevector.unscaledVector[sk] === 1 ? 0 : 1
                                        } else if(impactType === "ON") {
                                            featVector[sk] = 1
                                        } else if(impactType === "OFF") {
                                            featVector[sk] = 0
                                        }
                                        scaledFeatVector[sk] = scaleFeatures(featVector[sk], min, max)
                                    }
                                }
                            }
                        }
                    }
                }
               /* else if (!(sk in featVector)) {
                    featVector[sk] = statevector.unscaledVector[sk]
                    scaledFeatVector[sk] = statevector.scaledVector[sk]
                } */
            })
        }
        else {
            featVector = statevector.unscaledVector
            scaledFeatVector = statevector.scaledVector
        }
    })
    return {scaledVector : scaledFeatVector, unscaledVector : featVector}
}

function getStringHash(str) {
    let hash = 0
    if(str.length === 0) {
        return hash
    }
    for(let i = 0; i < str.length; i++) {
        let chr = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash = hash & hash
    }
    return Math.abs(hash)
}

function reasonState(task, featureVector) {
    const reasonedStates = []
    const featKeys = Object.keys(featureVector)
    const stateKeys = Object.keys(task.states)
    stateKeys.map((val)=>{
        let str = ""
        const expr = task.states[val][val].HasExpression
        const and = R.replace(/AND/g, '&&', expr)
        const or = R.replace(/OR/g, '||', and)
        const ex = R.replace(/XOR/g, '^', or) + ";"
        featKeys.forEach((feat) => {
            if (ex.includes(feat)) {
                str += `${feat} = ${featureVector[feat]}; `
            }
        })
        if(str !== "") {
            str += ex
            const result = eval(str)
            if (result) reasonedStates.push(val)
        }
    })
    return reasonedStates
}

function reasonReward(task, action, states) {
    let reward = 0.0
    const effects = task.actions[action][action].HasEffect
    const effectKeys = Object.keys(effects)
    let rewardVal = 0
    let punishmentVal = 0
    const isReward = []
    const isPunishment = []
    let evalExpr = ""
    let pEvalExpr = ""
    effectKeys.forEach((key) => {
        const rewardRule = effects[key].HasRewardRule
        const punishmentRule = effects[key].HasPunishmentRule

        if(rewardRule !== undefined) {
            rewardVal = parseFloat(rewardRule.substring(rewardRule.lastIndexOf("=")+1))
            const rewardExpr = rewardRule.substring(0,rewardRule.lastIndexOf("=")-1)
            const rewardExprSplitted = rewardExpr.trim().split(" ")
            const rew = rewardExprSplitted.map((elem) => { if(!elem.includes("AND") && !elem.includes("OR") && !elem.includes("XOR")) return elem += " == 1.0"; else return elem})
            const rewardStates = rewardExpr.trim().split(" ").filter(term => term !== 'OR' && term !== 'AND' && term !== 'XOR' && term !== '=' && term !==rewardRule.split("=")[1])
            const evalReward = rewardStates.reduce(function(acc, val) {
                val =  (states.indexOf(val) !== -1) ? val + " = 1.0; " : val + " = 0.0;";
                return acc + val
            }, "")
            const rEx = rew.reduce((acc, curr) => acc + " " + curr + " ", "")
            const rAND = R.replace(/AND/g, '&&', rEx)
            const rOR = R.replace(/OR/g, '||', rAND)
            const rewEx = R.replace(/XOR/g, '^', rOR)
            evalExpr = evalReward + rewEx+";"

            //if(isReward) reward = (reward + rewardVal) / counter
        }
        if(punishmentRule !== undefined) {
            punishmentVal = parseFloat(punishmentRule.substring(punishmentRule.lastIndexOf("=")+1))
            const punishmentExpr = punishmentRule.substring(0, punishmentRule.lastIndexOf("=")-1)
            const punishmentExprSplitted = punishmentExpr.trim().split(" ")
            const pun = punishmentExprSplitted.map((elem) => {if(!elem.includes("AND") && !elem.includes("OR") && !elem.includes("XOR")) return elem += " == 1.0"; else return elem})
            const punishmentStates = punishmentExpr.trim().split(" ").filter(term => term !== 'OR' && term !== 'AND' && term !== 'XOR' && term !== '=' && term !== punishmentRule.split("=")[1])
            const evalPunishment = punishmentStates.reduce((acc, val) => {
                val = (states.indexOf(val) !== -1) ? val + " = 1.0; " : val + " = 0.0;";
                return acc + val
            }, "")
            const pEx = pun.reduce((acc, curr) => acc + " " + curr + " ", "")
            const pAND = R.replace(/AND/g, '&&', pEx)
            const pOR = R.replace(/OR/g, '||', pAND)
            const punEx = R.replace(/XOR/g, '^', pOR)
            pEvalExpr = evalPunishment + punEx+";"
            //if(isPunishment) reward = (reward + punishmentVal) / counter
        }
        if(eval(evalExpr)) {
            if(isReward.indexOf(evalExpr.trim()) === -1)
                isReward.push(evalExpr.trim())
        }
        if(eval(pEvalExpr)) {
            if (isPunishment.indexOf(pEvalExpr.trim()) === -1)
                isPunishment.push(pEvalExpr.trim())
        }
    })
    if(isReward.length > 0 && isPunishment.length > 0) reward = (rewardVal * isReward.length) + (punishmentVal * isPunishment.length)
    else if(isReward.length > 0) reward = rewardVal
    else if(isPunishment.length > 0) reward = punishmentVal
    return reward
}

function  getAgentProfile() {
    const task = getTask()
    const ap = task.filter(curr => curr["@type"][0].includes("Agent"))
    const id = ap[0]["@id"].substring(ap[0]["@id"].lastIndexOf("/")+1)
    const tp = task.filter(curr => curr["@type"][0].includes("Task"))
    const top = task.filter(curr => curr["@type"][0].includes("Topic"))
    const topKeys = Object.keys(top[0])
    const keys = Object.keys(ap[0])
    const discount = parseFloat(ap[0][keys.filter(elem => elem.includes("HasDiscountFactor"))][0]["@value"])
    const epsilon = parseFloat(ap[0][keys.filter(elem => elem.includes("HasEpsilon"))][0]["@value"])
    const alpha = parseFloat(ap[0][keys.filter(elem => elem.includes("HasLearningRate"))][0]["@value"])
    const taskKeys = Object.keys(tp[0])
    //const topics = ap[0][keys.filter(elem => elem.includes("SubscribesFor"))].map(elem => elem["@id"].substring(elem["@id"].lastIndexOf("/")+1))
    const topics = top.map((elem) => {
       return  elem[topKeys.filter(elem => elem.includes("HasName"))][0]["@value"]
    })
    //const topics = t[topKeys.filter(elem => elem.includes("HasName"))][0]["@value"]
    const actions = tp[0][taskKeys.filter(elem => elem.includes("HasAction"))].map(elem => elem["@id"].substring(elem["@id"].lastIndexOf("/")+1))
    const featureSize = tp[0][taskKeys.filter(elem => elem.includes("HasObservationFeature"))].length
    const actionSize = tp[0][taskKeys.filter(elem => elem.includes("HasAction"))].length
    const profile = Object.freeze({
        id,
        discount,
        epsilon,
        alpha,
        featureSize,
        actionSize,
        topics,
        actions
    })
    return profile
}

function getTaskProfile() {
    const task = getTask()
    if(task !== null && task !== undefined) {
        const t = task.filter((elem) => {
            return elem["@type"][0].includes("Task")
        })
        const keys = Object.keys(t[0])
        const id = t[0]["@id"].substring(t[0]["@id"].lastIndexOf("/") + 1)
        const status = t[0][keys.filter(elem => elem.includes("HasStatus"))].map(elem => elem["@value"])[0]
        const actionIds = t[0][keys.filter(elem => elem.includes("HasAction"))].map(elem => elem["@id"].substring(elem["@id"].lastIndexOf("/") + 1))
        const featureIds = t[0][keys.filter(elem => elem.includes("HasObservationFeature"))].map(elem => elem["@id"].substring(elem["@id"].lastIndexOf("/") + 1))
        const stateIds = t[0][keys.filter(elem => elem.includes("HasState"))].map(elem => elem["@id"].substring(elem["@id"].lastIndexOf("/") + 1))
        const ap = task.filter(curr => curr["@type"][0].includes("Agent"))
        const agentKeys = Object.keys(ap[0])
        const agent = ap[0]["@id"].substring(ap[0]["@id"].lastIndexOf("/") + 1)
        const topicIds = ap[0][agentKeys.filter(elem => elem.includes("SubscribesFor"))].map(elem => elem["@id"].substring(elem["@id"].lastIndexOf("/") + 1))
        const topicArray = topicIds.map(elem => buildInstance(elem, task, {[elem]: {}}))
        const topics = array2Object(topicArray)
        const patient = task.filter(curr => curr["@type"][0].includes("Patient"))
        // const patientKeys = Object.keys(patients[0])
        const patientIds = patient.map((elem) => {return elem["@id"].substring(elem["@id"].lastIndexOf("/")+1)})
        const patientArray = patientIds.map((elem) => buildInstance(elem, task, {[elem]: {}}))
        const actionsArray = actionIds.map(elem => buildInstance(elem, task, {[elem]: {}}))
        const actions = array2Object(actionsArray)
        const featuresArray = featureIds.map(elem => buildInstance(elem, task, {[elem]: {}}))
        const features = array2Object(featuresArray)
        const statesArray = stateIds.map(elem => buildInstance(elem, task, {[elem]: {}}))
        const states = array2Object(statesArray)
        //const patientArray = patientIds.map(elem => buildInstance(elem, task, {[elem]: {}}))
        const patients = array2Object(patientArray)
        const profile = Object.freeze({
            id,
            status,
            actions,
            features,
            states,
            topics,
            agent,
            patients
        })
        return profile
    } else return undefined
}

function buildInstance(id = undefined, task, object) {
    const newInstance = {}
    const obj = task.filter(elem => (
        id.substring(id.lastIndexOf("/")+1) === elem["@id"].substring(elem["@id"].lastIndexOf("/")+1)
    )/*id.indexOf(elem["@id"].substring(elem["@id"].lastIndexOf("/")+1)) !== -1*/)
    const keys = Object.keys(obj[0])
    const filteredKeys = keys.filter(elem => elem.indexOf("@id") === -1 && elem.indexOf("@type") === -1)
    filteredKeys.map(elem => {
        const property = elem.substring(elem.lastIndexOf("-3A") + 3)
        const originSubObjects = obj[0][elem].map((o) => ["@id"] in o ? {["@id"]: o["@id"]} : {[o["@type"]]: o["@value"]})
        const subObjects = obj[0][elem].map((o) => ["@id"] in o ? {["@id"]: o["@id"].substring(o["@id"].lastIndexOf("/") + 1)} : {[o["@type"]]: o["@value"]})
        object[id.substring(id.lastIndexOf("/")+1)][property] = {}
        for (let i = 0; i < subObjects.length; i++) {
            const key = Object.keys(subObjects[i])
            const idKey = "@id"
            const name = id.substring(id.lastIndexOf("/")+1)
            idKey in subObjects[i] ? object[name][property][subObjects[i]["@id"]] = {} : key[0].includes("double") ? object[name][property] = parseFloat(subObjects[i][key[0]]) : object[name][property] = subObjects[i][key[0]]
        }
        subObjects.forEach((so)=>{
            const subKeys = Object.keys(so)
            subKeys.forEach((sk)=>{
                if ("@id" in so) {
                    originSubObjects.map(val => {
                        return buildInstance(val["@id"], task, object[id.substring(id.lastIndexOf("/") + 1)][property], object)
                    })
                }
            })
        })


    })
    return object
}

function array2Object(array) {
    const obj= {}
    array.forEach((elem)=>{
        const key = Object.keys(elem)[0]
        obj[key] = elem
    })
    return Object.freeze((obj))
}

function minutesToMilliseconds(minutes) {
    return 1000 * 60 * minutes
}

function gaussianRand() {
    var rand = 0;
    for (var i = 0; i < 6; i += 1) {
        rand += Math.random();
    }
    return rand / 6;
}

function gaussianRandom(start, end) {
    return Math.floor(start + gaussianRand() * (end - start + 1));
}

function getRandomInt(min, max){
    return Math.floor(Math.random() * (parseInt(max) - parseInt(min))) + parseInt(min)
}

function getRandomDouble (min, max) {
    const val = Math.random() * (parseFloat(max) - parseFloat(min)) + parseFloat(min)
    return Math.round(val * 100) / 100
}

function precision(tp, fp) {
    const p = tp / (tp + fp)
    return p
}

function recall(tp, fn) {
    const r = tp / (tp + fn)
    return r
}

function f1(precision, recall) {
    const score = 2 * ((precision * recall) / (precision + recall))
    return score
}

function parseComplexExpression(task, tokens) {
    let index = 0
    const result = {scaledVector: {}, unscaledVector: {}}
    const ranges = {}
    const operators = {}
    tokens.forEach((token) => {
        if(index % 4 === 0) {
            if(index + 2 < tokens.length) {
                if(!(token in ranges))
                    ranges[token] = {min: undefined, max: undefined, composition: {and: [], or : [], xor: []}}
                if(index + 4 < tokens.length) {
                    if(tokens[index +3 ] === "AND" && ranges[token].composition.and.indexOf(tokens[index + 4]) === -1)
                        ranges[token].composition.and.push(tokens[index + 4])
                    else if(tokens[index + 3] === "OR" && ranges[token].composition.or.indexOf(tokens[index + 4]) === -1)
                        ranges[token].composition.or.push(tokens[index + 4])
                    else if(tokens[index + 3] === "XOR" && ranges[token].composition.xor.indexOf(tokens[index + 4]) === -1)
                        ranges[token].composition.xor.push(tokens[index + 4])
                }
                if(tokens[index + 1].indexOf(">") !== -1 || tokens[index + 1].indexOf(">=") !== -1) {
                    ranges[token]["min"] = parseFloat(tokens[index + 2])
                } else if(tokens[index + 1].indexOf("<") !== -1 || tokens[index + 1].indexOf("<=") !== -1)
                    ranges[token]["max"] = parseFloat(tokens[index + 2])
                else if(tokens[index + 1].indexOf("==") !== -1) {
                    ranges[token]["max"] = parseFloat(tokens[index + 2])
                    ranges[token]["min"] = parseFloat(tokens[index + 2])
                }
            }
        }
        index += 1
    })
    const keys = Object.keys(ranges)
    keys.forEach((k) => {
        if(ranges[k].min === undefined) {
            if(k in task.features) {
                ranges[k].min = task.features[k][k].HasRangeStart
            } else {
                for(let f in task.features) {
                    if(task.features[f][f].HasFeatureType.includes("AGG")) {
                        if(k in task.features[f][f].HasObservationFeature) {
                            ranges[k].min = task.features[f][f].HasObservationFeature[k].HasRangeStart
                        }
                    }
                }
            }
        }
        if(ranges[k].max === undefined) {
            if(k in task.features) {
                ranges[k].max = task.features[k][k].HasRangeEnd
            } else {
                for(let f in task.features) {
                    if(task.features[f][f].HasFeatureType.includes("AGG")) {
                        if(k in task.features[f][f].HasObservationFeature) {
                            ranges[k].max = task.features[f][f].HasObservationFeature[k].HasRangeEnd
                        }
                    }
                }
            }
        }
    })


    keys.forEach((k) => {
        if(!(k in result.unscaledVector)) {
            const operand = ranges[k]
            const min = operand.min
            const max = operand.max
            let val = undefined
            if(task.features[k][k].HasFeatureType === "NOMINAL") {
                val = getRandomInt(min, max)
            } else {
                val = getRandomDouble(min, max)
            }
            result.unscaledVector[k] = val
            result.scaledVector[k] = scaleFeatures(val, min, max)
            if (operand.composition.and.length > 0) {
                operand.composition.and.forEach(cp => {
                    const instance = ranges[cp]
                    let val2 = undefined
                    if(task.features[k][k].HasFeatureType === "NOMINAL") {
                        val2 = getRandomInt(instance.min, instance.max)
                    } else {
                        val2 = getRandomDouble(instance.min, instance.max)
                    }
                    result.unscaledVector[cp] = val2
                    result.scaledVector[cp] = scaleFeatures(val2, instance.min, instance.max)
                })
            }
            if (operand.composition.or.length > 0) {
                operand.composition.or.forEach(cp => {
                    const instance = ranges[cp]
                    let val2 = undefined
                    if(task.features[k][k].HasFeatureType === "NOMINAL") {
                        val2 = getRandomInt(instance.min, instance.max)
                    } else {
                        val2 = getRandomDouble(instance.min, instance.max)
                    }

                    result.unscaledVector[cp] = val2
                    result.scaledVector[cp] = scaleFeatures(val2, instance.min, instance.max)
                })
            }
            if (operand.composition.xor.length > 0) {
                operand.composition.xor.forEach(cp => {
                    const instance = ranges[cp]
                    const range1 = (instance.max * 2) - instance.max
                    const range2 = instance.min
                    let val2 = undefined
                    if(task.features[k][k].HasFeatureType === "NOMINAL") {
                        val2 = [instance.max, instance.min]
                    } else {
                        val2 = [getRandomDouble(instance.max, instance.max * 2), getRandomDouble(0, instance.min)]
                    }
                    const index = getRandomInt(0, 2)
                    result.unscaledVector[cp] = val2[index]
                    index === 0 ? result.scaledVector[cp] = scaleFeatures(val2[index], instance.max, instance.max * 2) : scaleFeatures(val2[index], 0, instance.min)
                })
            }
        }
    })
    return Object.freeze(result)
}

function parseExpression(task, tokens) {
    let val = 0
    const result = {unscaledVector: {}, scaledVector: {}}
    const min = task.features[tokens[0]][tokens[0]].HasRangeStart
    const max = task.features[tokens[0]][tokens[0]].HasRangeEnd
    if (tokens[1] === ">") {
        val = getRandomDouble(parseFloat(tokens[2]) + 1, max)
    } else if (tokens[1] === "<") {
        val = getRandomDouble(min, parseFloat(tokens[2]) - 1)
    } else if (tokens[1] === ">=") {
        val = getRandomDouble(parseFloat(tokens[2]), max)
    } else if (tokens[1] === "<=") {
        val = getRandomDouble(min, parseFloat(tokens[2]))
    } else if (tokens[1] === "==") {
        val = parseFloat(tokens[2])
    }
    const scaled = scaleFeatures(val, min, max)
    result.unscaledVector[tokens[0]] = val
    result.scaledVector[tokens[0]] = scaled
    return Object.freeze(result)
}

module.exports = {
    getRandomInt,
    getRandomDouble,
    getTaskProfile,
    getAgentProfile,
    minutesToMilliseconds,
    reasonState,
    reasonReward,
    gaussianRandom,
    scaleFeatures,
    precision,
    recall,
    f1,
    updateStateFeaturesToNextState,
    getStringHash,
    parseExpression,
    parseComplexExpression
}