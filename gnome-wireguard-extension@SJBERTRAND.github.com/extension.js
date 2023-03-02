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

const { GObject, St, NM, GLib, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;
const Me = imports.misc.extensionUtils.getCurrentExtension();


let _setTimer = null;
let client = null;
let WireGuard = null;
let icon = null;


const NMConnectionCategory = {
WIREGUARD: 'wireguard',
};


var NMConnectionWireguard = class{
		constructor(type){
		this._type = type;
		};
		
		_get_wg_connections(client){
			const wg_Connections = [];
			const connections=client.get_connections(); 
				for ( let connection in connections) {
					if (connections[connection].get_connection_type() == this._type ) {
					wg_Connections.push(connections[connection]);
					};
				};
		return wg_Connections;
		};
		
	
		_get_wg_connections_names(client){
			const wg_connections_names = [];
			const _connections = this._get_wg_connections(client);
				for (let _connection in _connections){
				wg_connections_names.push(_connections[_connection].get_id());
				};
		return wg_connections_names;
		};
		
		_open_settings(){
		GLib.spawn_command_line_async('nm-connection-editor');
		};
		
		_update_status(_device, item){
			if (_device == null) {
			item.setToggleState(false);
			} else {
			item.setToggleState(true);
			};
		};

						
		_switch_func(item, _connection, _conn_id, client ){
			item.connect('activate', () => {
        			if ( item._switch.state == true) {
        			client.activate_connection_async(_connection,null,null,null,null);
				Main.notify(_('Wireguard ' + _conn_id +' Active'));
				} else {
				let _active_connections = client.get_active_connections();
				for ( let _act_conn in  _active_connections){
				if ( _active_connections[_act_conn].get_id() == _conn_id ){
				client.deactivate_connection_async(_active_connections[_act_conn],null,null);
				Main.notify(_('Wireguard ' + _conn_id +' Inactive'));
				};
				};	
				};
        		});
		};
		
		
		_create_switches(menu, client) {
		let conn_names = this._get_wg_connections_names(client);
	
			for ( let val in conn_names ) {
				let _connection=client.get_connection_by_id(conn_names[val]);
				let _settings=_connection.get_setting_connection();
				let _device=client.get_device_by_iface(_settings.interface_name);
				let _conn_id = conn_names[val];
				let item = new PopupMenu.PopupSwitchMenuItem(_(_conn_id),false);
				this._update_status(_device, item);
				this._switch_func(item,_connection, _conn_id, client);
        			item.set_name(_conn_id);
 				menu.addMenuItem(item);
			};
		};
		
		
		_update_switch_menu(menu, client ) {
		
			let menu_list = menu._getMenuItems();
 			let conn_list = this._get_wg_connections_names(client); 
			let switch_list = [];
			let iface_list = [];
	
			//remove switches without connection
				for ( let item in menu_list) {
					let item_name = menu_list[item].get_name();
						if ( item_name != null ) {
							switch_list.push(item_name);
							let result = conn_list.includes(item_name);			
						if ( result == false) {
						menu_list[item].destroy();
						};
						};
				};
        
			// create switch for new connection
			for (let _item in conn_list) {
				let _result = switch_list.includes(conn_list[_item]);
        				if ( _result == false ) {
						let _conn_id = conn_list[_item];
						let _connection=client.get_connection_by_id(_conn_id);
						let _settings=_connection.get_setting_connection();
						let _device=client.get_device_by_iface(_settings.interface_name);
						let item = new PopupMenu.PopupSwitchMenuItem(_(_conn_id),false);
						this._update_status(_device, item);
						this._switch_func(item,_connection, _conn_id, client);
						item.set_name(_conn_id);
						menu.addMenuItem(item, 0)
        				};
        		};
        
			// update switches status
			let _new_menu_list = menu._getMenuItems();
			for ( let item in _new_menu_list) {
				let item_name = _new_menu_list[item].get_name();
					if ( item_name != null ) {
						let _connection=client.get_connection_by_id(item_name);
						let _settings=_connection.get_setting_connection();
						let _device=client.get_device_by_iface(_settings.interface_name);
							if (_device != null) {
							iface_list.push(_device);
							};
						this._update_status(_device, _new_menu_list[item]);
					};
        		};
        		
        		// Update icon status
        		if ( iface_list.length > 0) {
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

	// Set the icon
	icon = new St.Icon({
    	style_class: 'system-status-icon',
    	//icon_name: 'network-vpn-disabled-symbolic'
	});
	icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/wireguard-icon-inactive.svg`);
	this.add_child(icon);
	
	//// Create indicator menu items ////
	
	let menu=this.menu;
	
	//Create switches
	WireGuard._create_switches(menu, client);
 
        //Create setting menu
        let item_setting = new PopupMenu.PopupMenuItem(_('Connections Settings'));
        item_setting.connect('activate', () => {;
            //WireGuard._open_settings();
            ExtensionUtils.openPrefs();
        });      
        this.menu.addMenuItem(item_setting);
        
              
    };
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        client=NM.Client.new(null);
        WireGuard = new NMConnectionWireguard(NMConnectionCategory.WIREGUARD);
        this._indicator = new Indicator(client, WireGuard);
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        _setTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
        WireGuard._update_switch_menu(this._indicator.menu, client );
        return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
    	client=null;
    	GLib.Source.remove(_setTimer);
    	_setTimer= null;
    	WireGuard= null;
    	icon = null;
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
