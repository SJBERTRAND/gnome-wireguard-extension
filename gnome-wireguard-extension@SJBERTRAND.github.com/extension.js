/* extension.js
 *
 * https://github.com/SJBERTRAND/gnome-wireguard-extension
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

import GObject from 'gi://GObject';
import St from 'gi://St';
import NM from 'gi://NM'
import Gio from 'gi://Gio'

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';


const WGIndicator = class {
    constructor(settings,_extension,icon){
        this.settings = settings,
        this.extension = _extension,
        this.icon = icon
    };

    _create_switch(_menu,_connection,_client){
        const _wg_switch = new PopupMenu.PopupSwitchMenuItem(_(_connection.get_id()));
        if (this._check_active(_connection.get_uuid(),_client)) {
            _wg_switch.setToggleState(true);
        };
        
        _client.connect('connection-removed',(client,connection) => {
            if ( _connection.get_uuid() == connection.get_uuid() ){
                _wg_switch.destroy();
            };
        });
        
        _wg_switch.connect('toggled',(_switch,_state) =>{
           if (_state) {
                if (!this._check_active(_connection.get_uuid(),_client)){
                    _client.activate_connection_async(_connection, null, null, null, null);
                };
           }else{
                if(this._check_active(_connection.get_uuid(),_client)){
                    const _active_connection = this._get_active_connection(_connection.get_uuid(),_client);
                    if ( _active_connection != undefined ){
                        _client.deactivate_connection_async(_active_connection,null,null);
                    };
                };
           };    
        });
        
        _client.connect('active-connection-added',(client, active_connection) => {
            if (active_connection.get_uuid() == _connection.get_uuid() ){
                _wg_switch.setToggleState(true);
            };     
        });
        
        _client.connect('active-connection-removed',(client, active_connection) => {
            if (active_connection.get_uuid() == _connection.get_uuid() ){
                _wg_switch.setToggleState(false);
            };
        });
        
        _menu.addMenuItem(_wg_switch,0);
    }; 
    
    
    _check_active(connection_uuid,_client){
        const _active_connections = _client.get_active_connections();
        if ( _active_connections.some(_connection => _connection.uuid == connection_uuid)){
            return true;
        }else{
            return false;
        };
    
    };
    
    _get_active_connection(connection_uuid,_client){
        const _active_connections = _client.get_active_connections();
        const active_connection = _active_connections.find(_connection => _connection.uuid == connection_uuid);
        return active_connection;
    };
    
    _update_icon(_client){
        const _active_connections = _client.get_active_connections();
        if (_active_connections.find(_connection => _connection.type == 'wireguard') ) {
            if (this.settings.get_string('active') == 'wireguard-icon-active.svg'){
                this.icon.gicon = Gio.icon_new_for_string(`${this.extension.path}/icons/${this.settings.get_string('active')}`);
            }else{
                this.icon.gicon = Gio.icon_new_for_string(this.settings.get_string('active'));
            };
        }else{
            if (this.settings.get_string('inactive') == 'wireguard-icon-inactive.svg'){
                this.icon.gicon = Gio.icon_new_for_string(`${this.extension.path}/icons/${this.settings.get_string('inactive')}`);
            }else{
                this.icon.gicon = Gio.icon_new_for_string(this.settings.get_string('inactive'));
            };
        };    
    };
}; // End of WGIndicator


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(_client,_cleanup,_extension) {
        super._init(0.0, _('Wireguard Indicator'));

        this.settings=_extension.getSettings();
        
        let icon = new St.Icon({
                style_class: 'system-status-icon',
        });
        if (this.settings.get_string('inactive') == 'wireguard-icon-inactive.svg'){
            icon.gicon = Gio.icon_new_for_string(`${_extension.path}/icons/${this.settings.get_string('inactive')}`);
        }else{
            icon.gicon = Gio.icon_new_for_string(this.settings.get_string('inactive'));
        };
        
        this.add_child(icon);
        
        this.menu.addAction(_('Settings'),
            () => _extension.openPreferences());
        
        const wg_indicator = new WGIndicator(this.settings,_extension,icon);
        
        _client.get_connections().forEach(item => {
            if ( item.is_type('wireguard') ){
                wg_indicator._create_switch(this.menu,item,_client);
            };
        });
        
        wg_indicator._update_icon(_client);

        const _connection_added_signal_id = _client.connect('connection-added',(client,connection) => {
            wg_indicator._create_switch(this.menu,connection,client);
        });
        
        const _active_connection_added_signal = _client.connect('active-connection-added',(client, active_connection) => {
            if ( active_connection.type == 'wireguard' ){
                wg_indicator._update_icon(client);
            };
        });
        
        const _active_connection_removed_signal = _client.connect('active-connection-removed',(client, active_connection) => {
            if ( active_connection.type == 'wireguard' ){
                wg_indicator._update_icon(client);
            };
        });
        
        
        // Create signal when preferecen key is changed then update the icons
        const _settings_changed_signal_id = this.settings.connect('changed',() => {
            wg_indicator._update_icon(_client);
        });
        
    };
});

export default class IndicatorExampleExtension extends Extension {
    enable() {        
        this._cleanup = new Gio.Cancellable();
        this._client = NM.Client.new(this._cleanup);
        this._indicator = new Indicator(this._client,this._cleanup,this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._cleanup.cancel();
        this._client = null;
        this._indicator.destroy();
        this._indicator = null;
    }
}
