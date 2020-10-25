const path = require('path');
const Max = require('max-api');
const fetch = require('node-fetch');
const parameters = require('./parameters');

const URL_PREFIX = 'https://visuals.madzoo.events/effects';
const effectParametersMap = new Map();

initializeParams();

Max.addHandler('note', (channel, note, velocity) => {
  if (velocity > 0) {
    handleNoteTrigger(channel, note, velocity);
  }
});

function handleNoteTrigger(channel, note, velocity) {
  const params = getEffectParameters(channel, note);
  if (!params) return;

  const {effectType, id, action} = params;
  const url = `${URL_PREFIX}/${effectType}/${id}/${action}`;

  Max.outlet(url);
  // const requestPromise = fetch(url, {method: 'POST'});
}

function getEffectParameters(channel, note) {
  const key = `${channel}:${note}`;
  const params = effectParametersMap.get(key);
  return params;
}

function initializeParams() {
  parameters.forEach((parameter) => {
    const {channel, note, effectType, id, action} = parameter;
    const key = `${channel}:${note}`;
    effectParametersMap.set(key, {effectType, id, action});
  });
}
