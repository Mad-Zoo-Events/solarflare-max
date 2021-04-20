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

const appendMappings = (presets, effectType, maps) => {
  if (!presets) {
    return;
  }

  presets.forEach(({id, midiMappings, displayName}) => {
    if (!midiMappings) {
      return;
    }

    midiMappings.forEach(({channel, key, behavior}) => {
      switch (behavior) {
        case "trigger":
          maps.triggerMap.set(`${channel}:${key}`, {
            id,
            effectType,
            displayName
          });
          break;
        case "toggle":
          maps.toggleMap.set(`${channel}:${key}`, {
            id,
            effectType,
            displayName
          });
          break;
        case "hold":
          maps.holdMap.set(`${channel}:${key}`, {
            id,
            effectType,
            displayName
          });
          break;
        case "clock1Toggle":
        case "clock2Toggle":
          maps.clockToggleMap.set(`${channel}:${key}`, {
            displayName,
            payload: {
              presetId: id,
              effectType,
              isRunning: false,
              offBeat: behavior === "clock2Toggle" ? true : false
            }
          });
          break;
        case "clock1Hold":
        case "clock2Hold":
          maps.clockHoldMap.set(`${channel}:${key}`, {
            displayName,
            payload: {
              presetId: id,
              effectType,
              isRunning: false,
              offBeat: behavior === "clock2Hold" ? true : false
            }
          });
          break;
      }
    });
  });
};

module.exports = {
  initializeMappings: async function (username, password) {
    const maps = {
      triggerMap: new Map(),
      toggleMap: new Map(),
      holdMap: new Map(),
      clockToggleMap: new Map(),
      clockHoldMap: new Map(),
      stopAllMap: new Map()
    };

    const {
      commandPresets,
      dragonPresets,
      laserPresets,
      lightningPresets,
      particlePresets,
      potionPresets,
      timeshiftPresets
    } = await fetchEffects(username, password);

    appendMappings(commandPresets, "command", maps);
    appendMappings(particlePresets, "particle", maps);
    appendMappings(dragonPresets, "dragon", maps);
    appendMappings(timeshiftPresets, "timeshift", maps);
    appendMappings(potionPresets, "potion", maps);
    appendMappings(lightningPresets, "lightning", maps);
    appendMappings(laserPresets, "laser", maps);

    stopAllMappings.forEach((mapping) => {
      const {channel, key, displayName, payload} = mapping;
      maps.stopAllMap.set(`${channel}:${key}`, {
        displayName,
        payload
      });
    });

    return maps;
  },

  getCredentials: function () {
    if (!env) {
      Max.post("Credentials file not found. Please refer to the README");
    }
    return {...env};
  }
};
