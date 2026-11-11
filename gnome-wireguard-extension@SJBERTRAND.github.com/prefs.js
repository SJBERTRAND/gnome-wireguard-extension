import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import NM from 'gi://NM';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const WGPreferences = class {
    constructor(_settings){
        this.settings = _settings
    };

    _create_connection_row(connection,group,client,_cancel){
        //Create a new row for the connection
        let connection_row = new Adw.ActionRow({
            title:_(connection.get_id())
        });
        // Create a delete button for the connection
        const delete_button = new Gtk.Button({
            label: _('Delete')
        });
        // Create a signal to destroy the row if the connection is removed
        client.connect('connection-removed',(_client,_connection) => {
            if ( _connection.get_uuid() == connection.get_uuid() ){
                group.remove(connection_row);
            };
        });
        // Create a signal for when the delete button is pressed
        delete_button.connect('clicked', () => { 
            const _delete_dialog = Adw.AlertDialog.new(_(`Delete Wireguard Connection "${connection.get_id()}" ?`),
            _('Deleted connection cannot be restored'));
            _delete_dialog.add_response('cancel',_('Cancel'));
            _delete_dialog.add_response('delete',_('Delete'));
            _delete_dialog.set_close_response('cancel');
            _delete_dialog.set_default_response('cancel');
            _delete_dialog.set_response_appearance('delete',2);        
            _delete_dialog.connect('response',(dialog,response) => {
                if (response == 'delete'){
                    
                    connection.delete_async(_cancel,null);
                };
            });   
            _delete_dialog.present(delete_button);   
        });
        
        //Add the button to the row
        connection_row.add_suffix(delete_button);
        //Add the row to the group
        group.add(connection_row);
    };
    
    _create_add_connection_row(group,_cancel,_client){
        const add_connection_row = new Adw.ActionRow({
            title:_('Add new Wireguard connection'),
            focusable: false
        });
        
        const add_button = new Gtk.Button({
            label: _('Add')
        });
        
        add_connection_row.add_suffix(add_button);
        group.add(add_connection_row);
        
        add_button.connect('clicked', ()=>{
            //Create a file chooser for the configuration file
            const _file_select = new Gtk.FileDialog({
                title: _('Select a Wireguard configuration file'),
                accept_label: _('Add')
            });
            const _file_filter = new Gtk.FileFilter({
                suffixes: ['conf']
            });
            _file_select.set_default_filter(_file_filter);
            
                //Create a signal to listen to connection added and when added remove the autoconnect
                let _connect_signal = _client.connect('connection-added',(client, connection) =>{
                    if ( connection.get_setting_connection().autoconnect){
                        connection.get_setting_connection().autoconnect=false;
                        connection.commit_changes_async(true,_cancel,null);
                        };     
                    _client.disconnect(_connect_signal);
                    _connect_signal = null;
                });
            
                //Present the file chooser
                _file_select.open(null,_cancel,(dialog, async_result)=>{                
                    const selected_file = _file_select.open_finish(async_result);
                    
                    // Import the file through command line
                    let [, , stderr, status] = GLib.spawn_command_line_sync(`nmcli connection import type wireguard file "${selected_file.get_path()}"`);
                    
                    // Show nmcli error if the import failed
                   if (status !== 0) {
                        let error_msg = new TextDecoder().decode(stderr).trim();
                         let error_dialog = new Gtk.AlertDialog({
                            message: 'Failed to import Wireguard configuration',
                            detail: error_msg || `nmcli exited with status ${status}`,
                            modal: true,
                        });
                        error_dialog.show(null);
                    };

            });
        }); //End of button cliked
        
    };
    
    _create_change_icon_rows(icon_group,_cancel){
        //Create filter for selection
        const _icon_filter = new Gtk.FileFilter({
            suffixes: ['svg','png']
        });
        
        //Active Icon row
        let active_row = new Adw.ActionRow({
            title:_('Choose active connection Icon')
        });
        const active_button = new Gtk.Button({
            label: _('Select')
        });
        active_row.add_suffix(active_button);
        
        active_button.connect('clicked', ()=>{
            const _active_select = new Gtk.FileDialog({
                accept_label: _('Select')
            });
            _active_select.set_default_filter(_icon_filter);
            _active_select.open(null,_cancel,(dialog, async_result)=>{
                const new_active_icon = _active_select.open_finish(async_result).get_path();
                this.settings.set_string('active',new_active_icon);
            });
         
        });
        
        //Inactive icon row
        let inactive_row = new Adw.ActionRow({
            title:_('Choose inactive connection Icon')
        });
        const inactive_button = new Gtk.Button({
            label: _('Select')
        });
        inactive_row.add_suffix(inactive_button);
        
        inactive_button.connect('clicked', ()=>{
            const _inactive_select = new Gtk.FileDialog({
                accept_label: _('Select')
            });
            _inactive_select.set_default_filter(_icon_filter);
            _inactive_select.open(null,_cancel,(dialog, async_result)=>{
                const new_inactive_icon = _inactive_select.open_finish(async_result).get_path();
                this.settings.set_string('inactive',new_inactive_icon);
            });
        });
        
        //Reset Icon row
        let reset_row = new Adw.ActionRow({
            title:_('Reset Icons to default')
        });
        const reset_button = new Gtk.Button({
            label: _('Reset')
        });
        reset_row.add_suffix(reset_button);
        
        reset_button.connect('clicked', ()=> {
             this.settings.reset('inactive');
             this.settings.reset('active');
        });
        
        
        
        // Add the rows
        icon_group.add(active_row);
        icon_group.add(inactive_row);
        icon_group.add(reset_row);
    };
    
};

export default class WG_Indicator_Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
    
        //Create a cancellable
        const _cancel = new Gio.Cancellable();
        const _client = NM.Client.new(_cancel);
        //Get the settings
        window._settings = this.getSettings();
        // Call the constructor
        const wg_pref = new WGPreferences(window._settings);
        
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const connection_group = new Adw.PreferencesGroup({
            title: _('Remove Wireguard Connections'),
            description: _('Select the connection to remove'),
        });
        page.add(connection_group);

        const add_group = new Adw.PreferencesGroup({
            title: _('Add Wireguard Connection'),
            description: _('Add a connection from a .conf file'),
        });
        page.add(add_group);
        
        const icon_group = new Adw.PreferencesGroup({
            title: _('Change Active/Inactive Icons'),
            description: _('The icons can be .svg or .png')
        });
        page.add(icon_group);
    
        //Create the rows for every connection
        _client.get_connections().forEach(item => {
                if ( item.is_type('wireguard') ){
                      wg_pref._create_connection_row(item,connection_group,_client,_cancel);  
                };
            });
        
        // Create the Add connection row
        wg_pref._create_add_connection_row(add_group,_cancel,_client);
        
        // Create the change icons rows
        wg_pref._create_change_icon_rows(icon_group,_cancel);
        
        // Create a signal a listen to new connection. When found add a row
        _client.connect('connection-added',(client,new_connection) => {
            wg_pref._create_connection_row(new_connection,connection_group,_client,_cancel);
        });
     
    }
}
