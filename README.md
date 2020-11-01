# Solarflare M4L

This M4L device receives MIDI input from Ableton and translates it into API requests to the [Solarflare](https://github.com/Eynorey/solarflare) visual server.

## Mapping

MIDI Mapping are defined in `mapping.json`, and map a MIDI note (channel / note) to a call to an action on a preset in the Solarflare system, as defined [here](https://github.com/Eynorey/solarflare#api-endpoints). To define a mapping, add an entry to the json array as follows:

```json
{
  "channel": 1,
  "note": 24,
  "effectType": "particle",
  "id": "<uuid>",
  "action": "trigger"
}
```

## Usage in Ableton

Add the `solarflare_msg.amxd` M4L device to a MIDI track in Ableton, and add a MIDI clip. MIDI messages corresponding to mapped actions will trigger an API call.
