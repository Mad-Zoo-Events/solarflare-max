const Max = require('max-api');
const base64 = require('base-64');
const fetch = require('node-fetch');
const {Note} = require('@tonaljs/tonal');
const {initializeMappings, getCredentials} = require('./init');

const URL_PREFIX = 'https://visuals.madzoo.events/api/effects';

const currentlyPlaying = new Map();
const currentRequests = new Map();
const effectParametersMap = initializeMappings();
const {username, password} = getCredentials();

/**
 * Handles the actual note input from the M4L patcher.
 */
Max.addHandler('note', (note, velocity, channel) => {
  handleNote(note, velocity, channel);
});

/**
 * Handles the actual note input from the M4L patcher.
 */
Max.addHandler('is_playing', (isPlaying) => {
  if (isPlaying === 0) {
    [...currentlyPlaying.keys()].forEach((key) => {
      currentlyPlaying.delete(key);
    });
    const url = `${URL_PREFIX}/stopall`;
    Max.post('STOP ALL', url);
    runEffect(url, {detachClocks: false, stopEffects: true});
  }
});

async function runEffect(url, payload) {
  const body = payload ? JSON.stringify(payload) : null;
  return await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + base64.encode(username + ":" + password)
    },
    body
  });
}

async function handleNote(note, velocity, channel) {
  const params = getEffectParameters(channel, note);
  if (!params) {
    Max.post(`Channel ${channel} Note ${Note.fromMidi(note)} not mapped`);
    return;
  }

  const {effectType, id, payload} = params;
  let action = 'trigger';
  if (effectType === 'command') {
    action = 'trigger';
  } else if (
    effectType === 'particle' ||
    effectType === 'dragon' ||
    effectType === 'timeshift' ||
    effectType === 'potion' ||
    effectType === 'lightning' ||
    effectType === 'laser'
  ) {
    action = velocity > 0 ? 'start' : 'stop';
  } else if (effectType === 'stopall') {
    const url = `${URL_PREFIX}/stopall`;
    runEffect(url, payload);
    return;
  }

  const url = `${URL_PREFIX}/run/${effectType}/${id}/${action}`;

  if (action === 'start') {
    if (currentlyPlaying.get(id)) {
      // Wait until stopped to retrigger
      const stopUrl = url.replace('start', 'stop');
      Max.post(`retrigger ${params.name}`, url);
      manageRequest(id, async () => {
        await runEffect(stopUrl);
        await runEffect(url);
      });
      return;
    }
    currentlyPlaying.set(id, true);
  } else if (action === 'stop') {
    currentlyPlaying.delete(id);
  }

  Max.post(`${action} ${params.name}`, url);
  manageRequest(id, () => runEffect(url));
}

async function manageRequest(id, makeRequest) {
  const currentRequest = currentRequests.get(id);
  if (currentRequest) {
    await currentRequest;
  }

  const request = makeRequest();
  currentRequests.set(id, request);
  await request;
  currentRequests.delete(id);
}

function getEffectParameters(channel, note) {
  const key = `${channel}:${note}`;
  const params = effectParametersMap.get(key);
  return params;
}
