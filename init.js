const {Note} = require('@tonaljs/tonal');
const triggers = require('./triggers');

module.exports = function initializeMappings() {
  const map = new Map();
  triggers.forEach((mapping) => {
    const {channel, note} = mapping;
    if (channel === undefined || note === undefined) return;
    const noteNumber = Note.midi(note) + 12;
    const key = `${channel}:${noteNumber}`;
    console.log(note, key);
    map.set(key, mapping);
  });
  return map;
};
