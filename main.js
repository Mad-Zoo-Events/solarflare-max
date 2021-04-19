const Max = require('max-api');
const base64 = require('base-64');
const fetch = require('node-fetch');
const {initializeMappings, getCredentials} = require('./init');

const EFFECTS_PREFIX = 'https://visuals.madzoo.events/api/effects';
const CLOCK_PREFIX = 'https://visuals.madzoo.events/api/clock';

const {username, password} = getCredentials();

const currentlyPlaying = new Map();
const currentRequests = new Map();

let startStopMap = new Map();
let triggerMap = new Map();
let clockMap = new Map();
let stopAllMap = new Map();

initializeMappings(username, password).then(maps => {
  startStopMap = maps.startStopMap;
  triggerMap = maps.triggerMap;
  stopAllMap = maps.stopAllMap;
  clockMap = maps.clockMap;

  // Handles the actual note input from the M4L patcher.
  Max.addHandler('note', (note, velocity, channel) => {
    handleNote(note, velocity, channel);
  });

  // Stops all effects if timeline is not playing
  Max.addHandler('is_playing', (isPlaying) => {
    if (isPlaying === 0) {
      currentlyPlaying.clear();

      const url = `${EFFECTS_PREFIX}/stopall`;
      Max.post('STOP ALL', url);
      runEffect(url, {detachClocks: true, stopEffects: true});
    }
  });
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
  const key = `${channel}:${note}`;
  const startStop = startStopMap.get(key);
  const trigger = triggerMap.get(key);
  const stopAll = stopAllMap.get(key);
  const clock = clockMap.get(key);

  if (!startStop && !trigger && !stopAll && !clock) {
    Max.post(`Channel ${channel} Note ${note} not mapped`);
    return;
  }

  if (stopAll) {
    const {displayName, payload} = stopAll;
    const url = `${EFFECTS_PREFIX}/stopall`;

    Max.post(displayName, url);
    runEffect(url, payload);

    return;
  }

  if (trigger && velocity > 0) {
    const {effectType, id, displayName} = trigger;
    const action = 'trigger';
    const url = `${EFFECTS_PREFIX}/run/${effectType}/${id}/${action}`;

    Max.post(`${action} ${displayName}`, url);
    manageRequest(id, () => runEffect(url));
  }

  if (startStop) {
    const {effectType, id, displayName} = startStop;
    const action = velocity > 0 ? 'start' : 'stop';
    const url = `${EFFECTS_PREFIX}/run/${effectType}/${id}/${action}`;

    if (action === 'start') {
      if (currentlyPlaying.get(id)) {
        // Wait until stopped to retrigger
        const stopUrl = url.replace('start', 'stop');
        Max.post(`retrigger ${params.displayName}`, url);
        manageRequest(id, async () => {
          await runEffect(stopUrl);
          await runEffect(url);
        });
      } else {
        currentlyPlaying.set(id, true);
      }
    } else if (action === 'stop') {
      currentlyPlaying.delete(id);
    }

    Max.post(`${action} ${displayName}`, url);
    manageRequest(id, () => runEffect(url));
  }

  if (clock) {
    const {displayName, payload} = clock;
    const action = velocity > 0 ? 'subscribe' : 'unsubscribe';
    const url = `${CLOCK_PREFIX}/${action}`;

    if (currentlyPlaying.get(payload.presetId)) {
      payload.isRunning = true;
      currentlyPlaying.delete(payload.presetId);
    }

    Max.post(`${action} ${displayName}`, url);
    manageRequest(payload.presetId, () => runEffect(url, payload, 'PUT'));
  }
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
