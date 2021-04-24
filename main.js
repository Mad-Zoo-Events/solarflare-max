const Max = require('max-api');
const fetch = require('node-fetch');
const {getMappings, getAuthHeader} = require('./init');

const EFFECTS_PREFIX = 'https://visuals.madzoo.events/api/effects';
const CLOCK_PREFIX = 'https://visuals.madzoo.events/api/clock';

const currentlyPlaying = new Map();
const currentlySubscribed = new Map();
const currentRequests = new Map();

let maps = {
  triggerMap: new Map(),
  toggleMap: new Map(),
  holdMap: new Map(),
  clockToggleMap: new Map(),
  clockHoldMap: new Map(),
  stopAllMap: new Map()
};

getMappings().then(midiMaps => {
  maps = midiMaps;
  Max.post('Loaded MIDI mappings');

  // Handles the actual note input from the M4L patcher.
  Max.addHandler('note', (note, velocity, channel) => {
    handleNote(note, velocity, channel);
  });

  // Stops all effects if timeline is not playing
  Max.addHandler('is_playing', (isPlaying) => {
    if (isPlaying === 0) {
      currentlyPlaying.clear();

      const url = `${EFFECTS_PREFIX}/stopall`;
      Max.post('STOP ALL');
      runEffect(url, {detachClocks: true, stopEffects: true});
    }
  });

  // Listen for reload
  Max.addHandler('reload', () => {
    getMappings().then(midiMaps => {
      maps = midiMaps;
      Max.post('Reloaded MIDI mappings');
    });
  });
});

async function runEffect(url, payload, method) {
  const body = payload ? JSON.stringify(payload) : null;
  return await fetch(url, {
    method: method || 'POST',
    headers: {
      'Authorization': getAuthHeader()
    },
    body
  });
}

async function handleNote(note, velocity, channel) {
  const key = `${channel}:${note}`;

  const trigger = maps.triggerMap.get(key);
  const toggle = maps.toggleMap.get(key);
  const hold = maps.holdMap.get(key);
  const clockToggle = maps.clockToggleMap.get(key);
  const clockHold = maps.clockHoldMap.get(key);
  const stopAll = maps.stopAllMap.get(key);

  if (!trigger && !toggle && !hold && !clockToggle && !clockHold && !stopAll) {
    Max.post(`Channel ${channel} Note ${note} not mapped`);
    return;
  }

  if (stopAll) {
    const {displayName, payload} = stopAll;
    const url = `${EFFECTS_PREFIX}/stopall`;

    Max.post(displayName);
    runEffect(url, payload);

    return;
  }

  if (trigger && velocity > 0) {
    const {effectType, id, displayName} = trigger;
    const action = 'trigger';
    const url = `${EFFECTS_PREFIX}/run/${effectType}/${id}/${action}`;

    Max.post(`${action} ${displayName}`);
    manageRequest(id, () => runEffect(url));
  }

  if (toggle && velocity > 0) {
    const {effectType, id, displayName} = toggle;
    let action = 'start';

    if (currentlyPlaying.has(id)) {
      action = 'stop';
      currentlyPlaying.delete(id);
    } else {
      currentlyPlaying.set(id, true);
    }

    const url = `${EFFECTS_PREFIX}/run/${effectType}/${id}/${action}`;

    Max.post(`${action} ${displayName}`);
    manageRequest(id, () => runEffect(url));
  }

  if (hold) {
    const {effectType, id, displayName} = hold;
    const action = velocity > 0 ? 'start' : 'stop';
    const url = `${EFFECTS_PREFIX}/run/${effectType}/${id}/${action}`;

    if (action === 'start') {
      if (currentlyPlaying.has(id)) {
        // Wait until stopped to retrigger
        const stopUrl = url.replace('start', 'stop');
        Max.post(`retrigger ${params.displayName}`);
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

    Max.post(`${action} ${displayName}`);
    manageRequest(id, () => runEffect(url));
  }

  if (clockToggle && velocity > 0) {
    const {displayName, payload} = clockToggle;
    const id = payload.presetId;
    let action = 'subscribe';

    if (currentlySubscribed.has(id)) {
      action = 'unsubscribe';
      currentlySubscribed.delete(id);
    } else {
      currentlySubscribed.set(id, true);
    }

    const url = `${CLOCK_PREFIX}/${action}`;

    if (currentlyPlaying.has(id)) {
      payload.isRunning = true;
      currentlyPlaying.delete(id);
    }

    Max.post(`${action} ${displayName}`);
    manageRequest(id, () => runEffect(url, payload, 'PUT'));
  }

  if (clockHold) {
    const {displayName, payload} = clockHold;
    const id = payload.presetId;
    const action = velocity > 0 ? 'subscribe' : 'unsubscribe';
    const url = `${CLOCK_PREFIX}/${action}`;

    if (currentlyPlaying.has(id)) {
      payload.isRunning = true;
      currentlyPlaying.delete(id);
    }

    Max.post(`${action} ${displayName}`);
    manageRequest(id, () => runEffect(url, payload, 'PUT'));
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
