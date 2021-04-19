const Max = require('max-api');
const {Note} = require('@tonaljs/tonal');
const mappings = require('./mappings');
const env = require('./env');

module.exports = {
  initializeMappings: function () {
    const map = new Map();
    mappings.forEach((mapping) => {
      const {channel, note} = mapping;
      if (channel === undefined || note === undefined) return;
      const noteNumber = Note.midi(note) + 12;
      const key = `${channel}:${noteNumber}`;
      console.log(note, key);
      map.set(key, mapping);
    });
    return map;
  },

  getCredentials: function () {
    if (!env) {
      Max.post("Credentials file not found. Please refer to the README");
    }
    return {...env};
  }
};
