const Max = require('max-api');
const fetch = require('node-fetch');
const mapping = require('./mapping');

const URL_PREFIX = 'https://visuals.madzoo.events/effects';
const effectParametersMap = new Map();

initializeParams();

/**
 * Handles the actual note input from the M4L patcher.
 */
Max.addHandler('note', (channel, note, velocity) => {
  if (velocity > 0) {
    handleNoteTrigger(channel, note);
  }
});

function handleNoteTrigger(channel, note) {
  const params = getEffectParameters(channel, note);
  if (!params) {
    Max.post(`Channel ${channel} Note ${note} not mapped`);
    return;
  }

  const {effectType, id, action} = params;
  const url = `${URL_PREFIX}/${effectType}/${id}/${action}`;

  fetch(url, {method: 'POST'});
}

function getEffectParameters(channel, note) {
  const key = `${channel}:${note}`;
  const params = effectParametersMap.get(key);
  return params;
}

function initializeParams() {
  mapping.forEach((parameter) => {
    const {channel, note, effectType, id, action} = parameter;
    const key = `${channel}:${note}`;
    effectParametersMap.set(key, {effectType, id, action});
  });
}
