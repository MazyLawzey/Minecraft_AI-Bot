
module.exports = function (bot) {
  const memory = {
    locations: {},        
    threats: {},          
    resources: {},        
    players: {},          
    events: []            
  }
  const MAX_EVENTS = 100
  function rememberLocation(name, type, position, metadata = {}) {
    const key = `${Math.round(position.x)}_${Math.round(position.y)}_${Math.round(position.z)}`
    memory.locations[key] = {
      name,
      type,
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y),
        z: Math.round(position.z)
      },
      discovered: new Date(),
      ...metadata
    }
    recordEvent('location_discovered', { name, type })
  }
  function rememberThreat(threatType, position, severity = 'medium') {
    const key = `${Math.round(position.x)}_${Math.round(position.z)}`
    memory.threats[key] = {
      type: threatType,
      position: {
        x: Math.round(position.x),
        z: Math.round(position.z)
      },
      severity,
      lastSeen: new Date()
    }
    recordEvent('threat_detected', { type: threatType, severity })
  }
  function rememberResource(resourceType, position, amount = 1) {
    const key = `${resourceType}_${Math.round(position.x)}_${Math.round(position.z)}`
    memory.resources[key] = {
      type: resourceType,
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y),
        z: Math.round(position.z)
      },
      amount,
      found: new Date()
    }
  }
  function rememberPlayer(username, metadata = {}) {
    if (!memory.players[username]) {
      memory.players[username] = {
        name: username,
        firstSeen: new Date(),
        interactions: 0
      }
    }
    memory.players[username].lastSeen = new Date()
    memory.players[username].interactions += 1
    if (metadata) {
      Object.assign(memory.players[username], metadata)
    }
    recordEvent('player_interaction', { player: username })
  }
  function recordEvent(eventType, details = {}) {
    memory.events.push({
      type: eventType,
      details,
      timestamp: new Date()
    })
    if (memory.events.length > MAX_EVENTS) {
      memory.events.shift()
    }
  }
  function findNearestLocation(type, maxDistance = 200) {
    const currentPos = bot.entity.position
    let nearest = null
    let minDist = maxDistance
    for (const loc of Object.values(memory.locations)) {
      if (type && loc.type !== type) continue
      const dist = Math.hypot(
        loc.position.x - currentPos.x,
        loc.position.z - currentPos.z
      )
      if (dist < minDist) {
        minDist = dist
        nearest = loc
      }
    }
    return nearest
  }
  function findNearestResource(resourceType, maxDistance = 100) {
    const currentPos = bot.entity.position
    const resources = Object.values(memory.resources)
      .filter(r => r.type === resourceType)
    let nearest = null
    let minDist = maxDistance
    for (const res of resources) {
      const dist = Math.hypot(
        res.position.x - currentPos.x,
        res.position.z - currentPos.z
      )
      if (dist < minDist) {
        minDist = dist
        nearest = res
      }
    }
    return nearest
  }
  function getThreats(maxDistance = 150) {
    const currentPos = bot.entity.position
    return Object.values(memory.threats)
      .filter(threat => {
        const dist = Math.hypot(
          threat.position.x - currentPos.x,
          threat.position.z - currentPos.z
        )
        return dist < maxDistance
      })
      .sort((a, b) => {
        const distA = Math.hypot(a.position.x - currentPos.x, a.position.z - currentPos.z)
        const distB = Math.hypot(b.position.x - currentPos.x, b.position.z - currentPos.z)
        return distA - distB
      })
  }
  function getMemorySummary() {
    return {
      locations: Object.keys(memory.locations).length,
      threats: Object.keys(memory.threats).length,
      resources: Object.keys(memory.resources).length,
      players: Object.keys(memory.players).length,
      events: memory.events.length
    }
  }
  function clearOldMemories(ageHours = 24) {
    const now = new Date()
    const ageMs = ageHours * 60 * 60 * 1000
    memory.events = memory.events.filter(e => now - e.timestamp < ageMs)
    for (const key in memory.locations) {
      if (now - memory.locations[key].discovered > ageMs) {
        delete memory.locations[key]
      }
    }
    for (const key in memory.threats) {
      if (now - memory.threats[key].lastSeen > ageMs) {
        delete memory.threats[key]
      }
    }
  }
  setInterval(() => {
    clearOldMemories(24)
  }, 60000) 
  return {
    rememberLocation,
    rememberThreat,
    rememberResource,
    rememberPlayer,
    recordEvent,
    findNearestLocation,
    findNearestResource,
    getThreats,
    getMemory: () => memory,
    getMemorySummary,
    clearOldMemories
  }
}
