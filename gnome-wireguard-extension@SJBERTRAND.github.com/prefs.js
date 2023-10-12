'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import NM from 'gi://NM';
import GLib from 'gi://GLib';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


var WireGuardOptions = class {
    constructor(client) {
        this.client = client;
    };


    _get_wireguard_connections() {
        let _connections = this.client.get_connections();
        let _wg_connections = [];
        _connections.forEach(item => {
            if (item.is_type('wireguard')) {
                _wg_connections.push(item);
            }
        });
        return _wg_connections;
    };

    _select_configuration_file() { //Create a GTK file selector

        let select_win = new Gtk.FileChooserDialog({
            use_header_bar: 1,
            title: 'Choose a Wireguard .conf file',
            action: Gtk.FileChooserAction.OPEN,
            modal: true,
        });

        let filter = new Gtk.FileFilter();
        filter.add_suffix('conf');
        select_win.add_filter(filter);

        // Add the button OK
        select_win.add_button('add', -5).connect('clicked', () => {
            select_win.destroy();

            // Store file choosen in conf_file
            let conf_file = select_win.get_file();

            // Add the connection when clicking the button
            GLib.spawn_command_line_sync(`nmcli connection import type wireguard file "${conf_file.get_path()}"`);
        });

        // Add the button cancel
        select_win.add_button('Cancel', -6).connect('clicked', () => {
            select_win.destroy();
        });

        // Present the window
        select_win.present();

    }; //end of select configuration file


    _confirm_delete(group, row, _conn_id) {

        let conf_win = new Gtk.Window({
            title: 'Delete Wireguard Connection',
            modal: true,
            destroy_with_parent: true,
            resizable: false,
        });

        let conf_box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            marginTop: 36,
            marginBottom: 36,
            marginStart: 36,
            marginEnd: 36,
            spacing: 18,
        });

        conf_win.child = conf_box;

        let conf_btn_yes = new Gtk.Button({
            label: 'Yes',
        });

        conf_btn_yes.connect('clicked', () => {
            GLib.spawn_command_line_sync(`nmcli connection delete "${_conn_id}"`);
            group.remove(row);
            conf_win.destroy();
        });

        let conf_btn_no = new Gtk.Button({
            label: 'No',
        });

        conf_btn_no.connect('clicked', () => {
            conf_win.destroy();
        });

        let conf_lbl = new Gtk.Label({
            label: `Are you sure you want to delete ${_conn_id} ?`,
            valign: Gtk.Align.CENTER,
        });

        let btn_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            spacing: 18,
        });

        conf_box.append(conf_lbl);
        conf_box.append(btn_box);
        btn_box.append(conf_btn_yes);
        btn_box.append(conf_btn_no);


        conf_win.present();
    }; //end of confirm delete


    _create_rows(group) {
        let _wg_connections = this._get_wireguard_connections();
        _wg_connections.forEach(_connection => {
            this._create_row(group, _connection);
        });
    };


    _create_row(group, _connection) {
        const row = new Adw.ActionRow({ title: _connection.get_id() });
        let del_btn = new Gtk.Button({ label: 'Delete', valign: Gtk.Align.CENTER });
        del_btn.connect('clicked', () => {
            this._confirm_delete(group, row, _connection.get_id());
        });
        row.add_suffix(del_btn);
        group.add(row);
    };

    _create_top_label(top_group) {
        const top_label = new Gtk.Label({
            label: 'Available Wireguard Connection(s)',
            valign: Gtk.Align.CENTER,
        });
        top_group.add(top_label);
    };

    _create_bottom_label(bottom_group) {
        const bottom_label = new Gtk.Label({
            label: 'Add Wireguard Connection',
            valign: Gtk.Align.CENTER,
        });
        bottom_group.add(bottom_label);
    };

    _create_choose_button(bottom_group) {
        const button1 = new Gtk.Button({
            label: 'Choose Wireguard Configuration file',
            valign: Gtk.Align.CENTER,
            margin_top: '8',
        });
        button1.connect('clicked', () => {
            this._select_configuration_file();
        });
        bottom_group.add(button1);
    };
}; // End of constructor WireGuardOptions


function init() {
}

export default class WireguardPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Initialize the constructor
        const client = NM.Client.new(null);
        const wireguard_options = new WireGuardOptions(client);

        // Create a preferences page and group
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();
        const top_group = new Adw.PreferencesGroup();
        const bottom_group = new Adw.PreferencesGroup();
        page.add(top_group);
        page.add(group);
        page.add(bottom_group);


        //Create top label
        wireguard_options._create_top_label(top_group);

        // Create a row per connections
        wireguard_options._create_rows(group);

        //Create a Bottom label
        wireguard_options._create_bottom_label(bottom_group);

        //Create a button to select a wireguard configuration
        wireguard_options._create_choose_button(bottom_group);

        // Create a signal to NM to check for added connection
        client.connect('connection-added', (_client, _connection) => {
            if (_connection.get_connection_type() == 'wireguard') {
                wireguard_options._create_row(group, _connection);
            };
        });

        // Add our page to the window
        window.add(page);

        //Create the signal to stop the client when the window is destroyed
        window.connect('close-request', () => {
            this.client = null;
        });
    }
}

