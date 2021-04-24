const {getMappings, runEffect, runStopAll, subscribeToClock, unsubscribeFromClock} = require("./client");
const {connectWebSocket, isRunning, isSubscribed} = require("./socketManager");
const Max = require("max-api");

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
    Max.post("Loaded MIDI mappings");

    // Handles the actual note input from the M4L patcher.
    Max.addHandler("note", (note, velocity, channel) => {
        handleNote(note, velocity, channel);
    });

    // Stops all effects if timeline is not playing
    Max.addHandler("is_playing", (isPlaying) => {
        if (isPlaying === 0) {
            Max.post("STOP ALL");
            runStopAll({detachClocks: true, stopEffects: true});
        }
    });

    // Listen for reload
    Max.addHandler("reload", () => {
        getMappings().then(midiMaps => {
            maps = midiMaps;
            Max.post("Reloaded MIDI mappings");
        });
    });

    connectWebSocket();
});

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

        Max.post(displayName);
        runStopAll(payload);

        return;
    }

    if (trigger && velocity > 0) {
        const {effectType, id, displayName} = trigger;
        const action = "trigger";

        Max.post(`${action} ${displayName}`);
        runEffect(effectType, id, action);
    }

    if (toggle && velocity > 0) {
        const {effectType, id, displayName} = toggle;
        let action = "start";

        if (isRunning(id)) {
            action = "stop";
        }

        Max.post(`${action} ${displayName}`);
        runEffect(effectType, id, action);
    }

    if (hold) {
        const {effectType, id, displayName} = hold;
        const action = velocity > 0 ? "start" : "stop";

        Max.post(`${action} ${displayName}`);
        runEffect(effectType, id, action);
    }

    if (clockToggle && velocity > 0) {
        const {displayName, payload} = clockToggle;
        const id = payload.presetId;

        if (isRunning(id)) {
            payload.isRunning = true;
        }

        if (isSubscribed(id)) {
            Max.post(`unsubscribe ${displayName}`);
            unsubscribeFromClock(payload);
        } else {
            Max.post(`subscribe ${displayName}`);
            subscribeToClock(payload);
        }
    }

    if (clockHold) {
        const {displayName, payload} = clockHold;
        const id = payload.presetId;

        if (isRunning(id)) {
            payload.isRunning = true;
        }

        if (velocity > 0) {
            Max.post(`subscribe ${displayName}`);
            subscribeToClock(payload);
        } else {
            Max.post(`unsubscribe ${displayName}`);
            unsubscribeFromClock(payload);
        }
    }
}
