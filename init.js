const Max = require('max-api');
const base64 = require('base-64');
const fetch = require('node-fetch');
const stopAllMappings = require('./stop-all-mappings');
const env = require('./env');

const fetchEffects = async (username, password) => {
  const url = 'https://visuals.madzoo.events/api/presets/all';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + base64.encode(username + ":" + password)
    }
  });
  if (response.ok) {
    return await response.json();
  }
};

const appendMappings = (presets, effectType, startStopMap, triggerMap, clockMap) => {
  if (!presets) {
    return;
  }

  presets.forEach(({id, midiMappings, displayName}) => {
    if (!midiMappings) {
      return;
    }

    midiMappings.forEach(({channel, key, behavior}) => {
      switch (behavior) {
        case "startStop":
          startStopMap.set(`${channel}:${key}`, {
            id,
            effectType,
            displayName
          });
          break;
        case "trigger":
          triggerMap.set(`${channel}:${key}`, {
            id,
            effectType,
            displayName
          });
          break;
        case "clockOnBeat":
          clockMap.set(`${channel}:${key}`, {
            displayName,
            payload: {
              presetId: id,
              effectType,
              isRunning: false,
              offBeat: false
            }
          });
          break;
        case "clockOffBeat":
          clockMap.set(`${channel}:${key}`, {
            displayName,
            payload: {
              presetId: id,
              effectType,
              isRunning: false,
              offBeat: true
            }
          });
      }
    });
  });
};

module.exports = {
  initializeMappings: async function (username, password) {
    const startStopMap = new Map();
    const triggerMap = new Map();
    const stopAllMap = new Map();
    const clockMap = new Map();

    const {
      commandPresets,
      dragonPresets,
      laserPresets,
      lightningPresets,
      particlePresets,
      potionPresets,
      timeshiftPresets
    } = await fetchEffects(username, password);

    appendMappings(commandPresets, "command", startStopMap, triggerMap, clockMap);
    appendMappings(particlePresets, "particle", startStopMap, triggerMap, clockMap);
    appendMappings(dragonPresets, "dragon", startStopMap, triggerMap, clockMap);
    appendMappings(timeshiftPresets, "timeshift", startStopMap, triggerMap, clockMap);
    appendMappings(potionPresets, "potion", startStopMap, triggerMap, clockMap);
    appendMappings(lightningPresets, "lightning", startStopMap, triggerMap, clockMap);
    appendMappings(laserPresets, "laser", startStopMap, triggerMap, clockMap);

    stopAllMappings.forEach((mapping) => {
      const {channel, key, displayName, payload} = mapping;
      stopAllMap.set(`${channel}:${key}`, {
        displayName,
        payload
      });
    });

    return {
      startStopMap,
      triggerMap,
      stopAllMap,
      clockMap
    };
  },

  getCredentials: function () {
    if (!env) {
      Max.post("Credentials file not found. Please refer to the README");
    }
    return {...env};
  }
};
