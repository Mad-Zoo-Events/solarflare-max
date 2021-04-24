const WebSocket = require("ws");
const {getAuthHeader} = require("./client");
const Max = require("max-api");

const currentlyRunning = new Map();
const currentlySubscribed = new Map();

const connectWebSocket = () => {
    const socket = new WebSocket("wss://visuals.madzoo.events/api/socket", {
        headers: {
            "Authorization": getAuthHeader()
        }
    });
    socket.on("open", () => Max.post("Connected to the websocket"));
    socket.on("message", (data) => handleSocketMessage(JSON.parse(data)));
};

const handleSocketMessage = (message) => {
    const {effectUpdate, clockUpdate} = message;

    if (effectUpdate) {
        const {id, action, errorMessage, stopAll} = effectUpdate;
        if (!errorMessage) {
            if (stopAll) {
                const {stopEffects, detachClocks} = stopAll;
                if (stopEffects) {
                    currentlyRunning.clear();
                }
                if (detachClocks) {
                    currentlySubscribed.clear();
                }
            } else {
                if (action === "start") {
                    currentlyRunning.set(id, true);
                } else if (action === "stop") {
                    currentlyRunning.delete(id);
                }
            }
        }
    }

    if (clockUpdate) {
        const {id, action} = clockUpdate;
        if (action === "subscribe") {
            currentlySubscribed.set(id, true);
        } else {
            currentlySubscribed.delete(id);
        }
    }
};

const isRunning = (id) => {
    return currentlyRunning.has(id);
};

const isSubscribed = (id) => {
    return currentlySubscribed.has(id);
};

module.exports = {
    connectWebSocket,
    isRunning,
    isSubscribed
};
