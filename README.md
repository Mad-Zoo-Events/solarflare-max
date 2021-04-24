# Solarflare M4L

This M4L device receives MIDI input from Ableton and translates it into API requests to the [Solarflare](https://github.com/Eynorey/solarflare) visual effects system.

## Mapping

You can map effect presets to MIDI notes and channels on https://visuals.madzoo.events/presetmanager.

In addition to these, you can map notes to requests for stopping all effects, unsubscribing everything from the clock, or both. 
These mappings are defined in the [`stop-all-mappings.json`](stop-all-mappings.json) file.

The mappings are fetched once the M4L device starts, and if you make any changes through the control panel you can use the "Reload" button on the Max device to fetch the updates from the backend.

## Credentials

To authenticate against the visual effect system, you need to create an `env.json` file in the root directory and fill in the credentials:

```json
{
  "username": "",
  "password": ""
}
```

## Usage in Ableton

Add the `solarflare-max.amxd` M4L device to a MIDI track in Ableton, and add a MIDI clip. MIDI messages corresponding to mapped actions will trigger an API call.

You can check the Max console for output to verify your mappings work mas intended.
