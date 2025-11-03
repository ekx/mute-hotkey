import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class MuteHotkeyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);

        // Create a preferences group
        const group = new Adw.PreferencesGroup({
            title: "Keyboard Shortcut",
            description: "Configure the hotkey to mute/unmute the focused window",
        });
        page.add(group);

        // Create the shortcut row
        const row = new Adw.ActionRow({
            title: "Toggle Mute Shortcut",
            subtitle: "Examples: <Super>m, <Control><Alt>m, <Shift><Super>F1",
        });
        group.add(row);

        // Create shortcut label that shows current binding
        const shortcutLabel = new Gtk.ShortcutLabel({
            disabled_text: "Disabled",
            valign: Gtk.Align.CENTER,
        });

        // Update the label with current shortcut
        const updateShortcut = () => {
            const shortcuts = settings.get_strv("toggle-mute");
            shortcutLabel.set_accelerator(shortcuts[0] || null);
        };
        updateShortcut();

        // Create button to open edit dialog
        const button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            has_frame: true,
            icon_name: "document-edit-symbolic",
        });

        button.connect("clicked", () => {
            const currentShortcut = settings.get_strv("toggle-mute")[0] || "";

            const entry = new Gtk.Entry({
                text: currentShortcut,
                placeholder_text: "<Super>m",
                hexpand: true,
            });

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
            });

            const label = new Gtk.Label({
                label: "Enter shortcut combination",
                wrap: true,
                xalign: 0,
            });
            box.append(label);

            const exampleLabel = new Gtk.Label({
                label: "Examples:\n<Super>m\n<Control><Alt>m\n<Shift><Super>F1",
                wrap: true,
                xalign: 0,
                css_classes: ["dim-label"],
            });
            box.append(exampleLabel);

            box.append(entry);

            const buttonBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 6,
                halign: Gtk.Align.END,
                margin_top: 12,
            });
            box.append(buttonBox);

            const editor = new Gtk.Window({
                modal: true,
                transient_for: window,
                title: "Edit Shortcut",
                default_width: 400,
                default_height: 250,
                resizable: false,
                child: box,
            });

            const cancelButton = new Gtk.Button({
                label: "Cancel",
            });
            cancelButton.connect("clicked", () => editor.close());
            buttonBox.append(cancelButton);

            const clearButton = new Gtk.Button({
                label: "Clear",
            });
            clearButton.connect("clicked", () => {
                settings.set_strv("toggle-mute", []);
                editor.close();
            });
            buttonBox.append(clearButton);

            const saveButton = new Gtk.Button({
                label: "Save",
                css_classes: ["suggested-action"],
            });
            saveButton.connect("clicked", () => {
                const shortcut = entry.get_text().trim();
                if (shortcut) {
                    // Validate the shortcut
                    const [valid, keyval, mods] = Gtk.accelerator_parse(shortcut);
                    if (valid && keyval !== 0) {
                        settings.set_strv("toggle-mute", [shortcut]);
                        editor.close();
                    } else {
                        entry.add_css_class("error");
                    }
                } else {
                    settings.set_strv("toggle-mute", []);
                    editor.close();
                }
            });
            buttonBox.append(saveButton);

            // Remove error class when typing
            entry.connect("changed", () => {
                entry.remove_css_class("error");
            });

            // Save on Enter key
            entry.connect("activate", () => {
                saveButton.emit("clicked");
            });

            editor.present();
        });

        // Add both label and button to row
        row.add_suffix(shortcutLabel);
        row.add_suffix(button);

        // Update when setting changes
        settings.connect("changed::toggle-mute", updateShortcut);
    }
}
