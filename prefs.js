import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import GLib from "gi://GLib";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class MuteHotkeyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        window.add(page);

        const infoGroup = new Adw.PreferencesGroup({
            title: "Setup Instructions",
            description: "This extension needs to be triggered via GNOME Settings",
        });
        page.add(infoGroup);

        const step1Row = new Adw.ActionRow({
            title: "1. Open GNOME Settings → Keyboard → View and Customize Shortcuts",
        });
        infoGroup.add(step1Row);

        const openSettingsButton = new Gtk.Button({
            label: "Open Settings",
            valign: Gtk.Align.CENTER,
        });
        openSettingsButton.connect("clicked", () => {
            try {
                GLib.spawn_command_line_async("gnome-control-center keyboard");
            } catch (e) {
                log("Failed to open settings: " + e);
            }
        });
        step1Row.add_suffix(openSettingsButton);

        const step2Row = new Adw.ActionRow({
            title: '2. Scroll to bottom and click "Custom Shortcuts"',
        });
        infoGroup.add(step2Row);

        const commandGroup = new Adw.PreferencesGroup({
            title: "3. Enter these details",
        });
        page.add(commandGroup);

        const nameRow = new Adw.ActionRow({
            title: "Name",
            subtitle: "Toggle Mute Focused Window",
        });
        commandGroup.add(nameRow);

        const copyNameButton = new Gtk.Button({
            icon_name: "edit-copy-symbolic",
            valign: Gtk.Align.CENTER,
            tooltip_text: "Copy to clipboard",
        });
        copyNameButton.connect("clicked", () => {
            const clipboard = Gdk.Display.get_default().get_clipboard();
            clipboard.set("Toggle Mute Focused Window");
        });
        nameRow.add_suffix(copyNameButton);

        const commandRow = new Adw.ActionRow({
            title: "Command",
            subtitle:
                "gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell/Extensions/MuteHotkey --method org.gnome.Shell.Extensions.MuteHotkey.ToggleMute",
        });
        commandGroup.add(commandRow);

        const copyCommandButton = new Gtk.Button({
            icon_name: "edit-copy-symbolic",
            valign: Gtk.Align.CENTER,
            tooltip_text: "Copy to clipboard",
        });
        copyCommandButton.connect("clicked", () => {
            const clipboard = Gdk.Display.get_default().get_clipboard();
            clipboard.set(
                "gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell/Extensions/MuteHotkey --method org.gnome.Shell.Extensions.MuteHotkey.ToggleMute",
            );
        });
        commandRow.add_suffix(copyCommandButton);

        const step4Row = new Adw.ActionRow({
            title: "Shortcut",
            subtitle: "Set your preferred keyboard shortcut",
        });
        commandGroup.add(step4Row);
    }
}
