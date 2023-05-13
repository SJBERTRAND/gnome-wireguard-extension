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

const GETTEXT_DOMAIN = 'Wireguard-extension';

const { GObject, St, NM, GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const NMConnectionCategory = {
WIREGUARD: 'wireguard',
};


var NMConnectionWireguard = class{
		constructor(type){
		this._type = type;
		};

        _get_wireguard_connections(client){
            let _connections = client.get_connections();
            let _wg_connections = [];
            _connections.forEach(item => {
                    if (item.is_type(this._type)){
                        _wg_connections.push(item);
                    }
            });
        return _wg_connections;
        };
        
        _get_device_list_names(client){
                let _device_list=client.get_devices();
                let _device_list_names=[];
                _device_list.forEach(item => {
                        _device_list_names.push(item.get_iface());
                });
        return _device_list_names;
        };
                
         _create_switches(menu, client, icon){
            let _wg_connections = this._get_wireguard_connections(client);
                _wg_connections.forEach(_connection => {
                        this._add_switch(menu, client, _connection, icon);      
                });
            this._update_icon(client, icon);
        };


        _create_new_switches(menu, client, _connection, icon){
                this._add_switch(menu, client, _connection, icon);
        };
        
        _add_switch(menu, client, _connection, icon){
                let item = new PopupMenu.PopupSwitchMenuItem(_(_connection.get_id()),false);                   
                item.set_name(_connection.get_id());
                item._iface=_connection.get_interface_name();
                item._connection=_connection;
                let _device_list_names = this._get_device_list_names(client);
                let _state = _device_list_names.includes(_connection.get_interface_name());
                item.setToggleState(_state);
                this._create_switch_connections(item, client, _connection, icon, menu);
                menu.addMenuItem(item, 0);  
        };
              
        _update_switches(menu, client, _connection, icon){
            if ( _connection.get_connection_type() == 'wireguard' ) {
                let _item_list = menu._getMenuItems();
                    _item_list.forEach(item=>{
                        if ( item._connection == _connection ) {
                            item.destroy();
                        };
                    });                
                this._update_icon(client, icon);
            };
        };
        
        
        _update_switches_toggle_state(menu, client, _device, icon) {
            if ( _device.get_type_description() == 'wireguard' ){
                let _item_list = menu._getMenuItems();
                    _item_list.forEach(item=>{
                        if ( item._iface == _device.get_iface() ){
                            let _device_list_names = this._get_device_list_names(client);
                            let _state = _device_list_names.includes(item._iface);              
                            item.setToggleState(_state);     
                        };
                    });
                this._update_icon(client, icon);
            };
        };
        
        
        _create_switch_connections(item, client, _connection, icon, menu ){
            item.connect('activate', () =>{
                        if (item._switch.state == true){
                            client.activate_connection_async(_connection,null,null,null,null);
				            Main.notify(_('Wireguard ' + _connection.get_id() +' Active'));
                        }else if (item._switch.state == false){
                            let _active_connections = client.get_active_connections();
                            _active_connections.forEach(_active_connection=> {
                                if ( _active_connection.get_id() == _connection.get_id() )
                                    client.deactivate_connection_async(_active_connection,null,null);
                                    Main.notify(_('Wireguard ' + _connection.get_id() +' Inactive'));
                            });    
                        };                
            });
        };
        
        _update_icon(client, icon){
          let _devices_list=client.get_devices();
            let _wg_devices=[];
                _devices_list.forEach(_device => {
                    if ( _device.get_type_description() == 'wireguard'){
                        _wg_devices.push(_device);
                    };
                });
            if ( _wg_devices.length > 0 ){
                icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/wireguard-icon.svg`);
        	} else {
        		icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/wireguard-icon-inactive.svg`);
            };
        };

};



const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(client, WireGuard) {
        super._init(0.0, _('Wireguard-extension'));

        // This part needed for the prefs
        this.settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.gnome-wireguard-extension@SJBERTRAND.github.com');
        
        let icon = new St.Icon({
    	style_class: 'system-status-icon',
    	});
    	icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/wireguard-icon-inactive.svg`);
    	this.add_child(icon);
        
        // Create switches in the menu
        WireGuard._create_switches(this.menu, client, icon);
        
        
        // Connect with NM and add new switches when connection are detected       
        client.connect('connection-added', (_client,_connection) => {
            WireGuard._create_new_switches(this.menu, client, _connection, icon);
        });
        
        // Connect with NM and remove switches when connection are deleted
        
        client.connect('connection-removed', (_client,_connection) => {
            WireGuard._update_switches(this.menu, client, _connection, icon);
        });
        
        // Connect with NM and update switches when devices are added
        
          client.connect('device-added', (_client,_device) => {
            WireGuard._update_switches_toggle_state(this.menu, client, _device, icon);
        });
        
        // Connect with NM and remove switches when devices are removed and do nothing when they are deleted
        
          client.connect('device-removed', (_client,_device) => {
            WireGuard._update_switches_toggle_state(this.menu, client, _device, icon);
        });
        
        // Load the preferences when clicking on setttings
        let item2 = new PopupMenu.PopupMenuItem(_('Settings'));
        item2.connect('activate', () => {
            ExtensionUtils.openPrefs();
        });
        this.menu.addMenuItem(item2);     
    };
});


class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this.client=NM.Client.new(null);
        this.WireGuard = new NMConnectionWireguard(NMConnectionCategory.WIREGUARD);     
        this._indicator = new Indicator(this.client, this.WireGuard);
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this.client=null;
        this.WireGuard=null;
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
