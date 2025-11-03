// extension.js
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

export default class MuteHotkeyExtension {
    enable() {
        this._settings = this._getSettings();

        // Add keybinding
        Main.wm.addKeybinding(
            "toggle-mute",
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            this._toggleMute.bind(this),
        );
    }

    disable() {
        // Remove keybinding
        Main.wm.removeKeybinding("toggle-mute");
        this._settings = null;
    }

    _getSettings() {
        const schemaId = "org.gnome.shell.extensions.mute-hotkey";
        const extensionPath = import.meta.url.slice(7, -13);
        const schemaDir = GLib.build_filenamev([extensionPath, "schemas"]);

        let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir,
            Gio.SettingsSchemaSource.get_default(),
            false,
        );

        let schema = schemaSource.lookup(schemaId, false);
        return new Gio.Settings({ settings_schema: schema });
    }

    _toggleMute() {
        const focusedWindow = global.display.focus_window;

        if (!focusedWindow) {
            return;
        }

        const windowTracker = Shell.WindowTracker.get_default();
        const app = windowTracker.get_window_app(focusedWindow);

        if (!app) {
            return;
        }

        const appName = app.get_name().toLowerCase();
        const appId = app.get_id().replace(".desktop", "").toLowerCase();
        const pid = focusedWindow.get_pid();

        // Use pactl to toggle mute for all of this application's audio streams
        try {
            // Get all sink inputs
            let [success, stdout] = GLib.spawn_command_line_sync("pactl list sink-inputs");

            if (success) {
                const output = new TextDecoder().decode(stdout);
                const sinkInputs = output.split("Sink Input #");

                let matchingSinks = [];
                let anyMuted = false;

                // Find all matching sink inputs
                for (let i = 1; i < sinkInputs.length; i++) {
                    const input = sinkInputs[i];
                    const inputLower = input.toLowerCase();

                    // Match by application name, binary name, or process name
                    if (
                        inputLower.includes(`application.name = "${appName}"`) ||
                        inputLower.includes(`application.process.binary = "${appId}"`) ||
                        inputLower.includes(`application.process.binary = "${appName}"`) ||
                        inputLower.includes(`application.process.id = "${pid}"`) ||
                        inputLower.includes(appName) ||
                        inputLower.includes(appId)
                    ) {
                        // Extract sink input ID from the beginning of this section
                        const firstLine = input.split("\n")[0];
                        const sinkInputId = firstLine.trim();

                        // Check if any stream is currently muted
                        if (input.includes("Mute: yes")) {
                            anyMuted = true;
                        }

                        matchingSinks.push(sinkInputId);
                    }
                }

                if (matchingSinks.length > 0) {
                    // Toggle all matching sinks to the opposite of current state
                    // If any are muted, unmute all. If all are unmuted, mute all.
                    const newMuteState = anyMuted ? "0" : "1";

                    for (let sinkInputId of matchingSinks) {
                        GLib.spawn_command_line_async(
                            `pactl set-sink-input-mute ${sinkInputId} ${newMuteState}`,
                        );
                    }

                    // Show notification
                    const streamCount = matchingSinks.length > 1 ? ` (${matchingSinks.length} streams)` : "";
                    Main.notify(
                        "Mute Toggle",
                        `${app.get_name()}${streamCount} is now ${anyMuted ? "unmuted" : "muted"}`,
                    );
                } else {
                    // If no stream found
                    Main.notify("Mute Toggle", `No audio stream found for ${app.get_name()}`);
                }
            }
        } catch (e) {
            logError(e, "Failed to toggle mute");
        }
    }
}
