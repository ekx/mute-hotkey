// extension.js
import Shell from "gi://Shell";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

const DBUS_INTERFACE = `
<node>
  <interface name="org.gnome.Shell.Extensions.MuteHotkey">
    <method name="ToggleMute"/>
  </interface>
</node>`;

export default class MuteHotkeyExtension {
  enable() {
    this._dbus = Gio.DBusExportedObject.wrapJSObject(DBUS_INTERFACE, this);
    this._dbus.export(
      Gio.DBus.session,
      "/org/gnome/Shell/Extensions/MuteHotkey",
    );
  }

  disable() {
    if (this._dbus) {
      this._dbus.unexport();
      this._dbus = null;
    }
  }

  ToggleMute() {
    const focusedWindow = global.display.focus_window;
    const windowTracker = Shell.WindowTracker.get_default();
    const app = windowTracker.get_window_app(focusedWindow);

    if (!app) {
      console.warn("mute hotkey - no app found :(");
      return;
    }

    const windowTitle = focusedWindow.get_title().toLowerCase();
    const pid = focusedWindow.get_pid();
    const appName = app.get_name().toLowerCase();
    const appId = app.get_id().replace(".desktop", "").toLowerCase();

    let binaryName = appName;
    let binaryName2 = appName;
    if (appName == "gamescope" || appName == "gamescope-wl") {
      binaryName = "wine64-preloader";
      binaryName2 = "wine-preloader";
    }

    // console.warn(`focused window title ${windowTitle}`);
    // console.warn(`focused window pid ${pid}`);
    // console.warn(`focused window appName ${appName}`);
    // console.warn(`focused window appId ${appId}`);
    // console.warn(`focused window binaryName ${binaryName}`);
    // console.warn(`focused window binaryName2 ${binaryName2}`);

    try {
      let [success, stdout] = GLib.spawn_command_line_sync(
        "pactl list sink-inputs",
      );

      if (success) {
        const output = new TextDecoder().decode(stdout);
        const sinkInputs = output.split("Sink Input #");

        let matchingSinks = [];
        let anyMuted = false;

        for (let i = 1; i < sinkInputs.length; i++) {
          const input = sinkInputs[i];
          const inputLower = input.toLowerCase();

          if (
            inputLower.includes(`application.name = "${appName}"`) ||
            inputLower.includes(`application.name = "${windowTitle}"`) ||
            inputLower.includes(`application.process.binary = "${appId}"`) ||
            inputLower.includes(`application.process.binary = "${appName}"`) ||
            inputLower.includes(`application.process.binary = "${binaryName}"`) ||
            inputLower.includes(`application.process.binary = "${binaryName2}"`) ||
            inputLower.includes(`application.process.id = "${pid}"`) ||
            inputLower.includes(appName) ||
            inputLower.includes(appId)
          ) {
            const firstLine = input.split("\n")[0];
            const sinkInputId = firstLine.trim();

            if (input.includes("Mute: yes")) {
              anyMuted = true;
            }

            matchingSinks.push(sinkInputId);
          }
        }

        if (matchingSinks.length > 0) {
          const newMuteState = anyMuted ? "0" : "1";

          for (let sinkInputId of matchingSinks) {
            // onsole.warn(`pactl set-sink-input-mute ${sinkInputId} ${newMuteState}`);

            GLib.spawn_command_line_async(
              `pactl set-sink-input-mute ${sinkInputId} ${newMuteState}`,
            );
          }
        }
      }
    } catch (e) {
      logError(e, "Failed to toggle mute");
    }
  }
}
