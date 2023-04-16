'use strict';

const { Adw, Gio, Gtk, NM, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


///// Functions //////


function edit_conf(){
log('Edit conf');
};


// Update connection list

function update_list(wg_Connections, client, group){

const wg_Connections2 = [];
    const connections=client.get_connections();
        for ( let connection in connections) {
			if (connections[connection].get_connection_type() == 'wireguard' ) {
					wg_Connections2.push(connections[connection]);
			};
		};

for ( const val in wg_Connections2 ){
    if (wg_Connections.includes(wg_Connections2[val])) {
    log(wg_Connections2[val] + ' already exist');
    }
    else
    {
    let _conn_id = wg_Connections2[val].get_id();
		let row = new Adw.ActionRow({ title: _conn_id });
		group.add(row);	
		// Create a delete button
		let del_btn = new Gtk.Button({ label: 'Delete', valign: Gtk.Align.CENTER});
		del_btn.connect('clicked', () => {
		confirm(group, row, _conn_id);
		});
		//Create an edit button 
		let edit_btn = new Gtk.Button({ label: 'Edit', valign: Gtk.Align.CENTER});
		edit_btn.connect('clicked', () => {
		log('Edit');
		});
		//Add buttons to the row
		row.add_suffix(del_btn);
		row.add_suffix(edit_btn);
    }; //end of if
}; //End of for
}; // end of fucntion update_list




function select_conf(client, group){
 
const wg_Connections = [];
     const connections=client.get_connections();
        for ( let connection in connections) {
			if (connections[connection].get_connection_type() == 'wireguard' ) {
					wg_Connections.push(connections[connection]);
			};
		};
	const wg_connections_names = [];
	for (let _connection in wg_Connections){
	  wg_connections_names.push(wg_Connections[_connection].get_id());
    };

let select_win = new Gtk.FileChooserDialog({ 
use_header_bar: 1,
title: 'Choose a Wireguard .conf file',
action: Gtk.FileChooserAction.OPEN,
modal: true,
});

// Add a filter to choose a .conf file
let filter = new Gtk.FileFilter();
filter.add_suffix('conf');
select_win.add_filter(filter);

// Add the button OK
select_win.add_button('add', -5).connect('clicked', () => {
select_win.destroy();
// Store file choosen in conf_file
let conf_file = select_win.get_file();
// Add the connection
GLib.spawn_command_line_sync(`nmcli connection import type wireguard file "${conf_file.get_path()}"`);
setTimeout(() => { update_list(wg_Connections, client, group); }, 1000);
});

// Add the button cancel
select_win.add_button('Cancel', -6).connect('clicked', () => {
select_win.destroy();
});

// Present the window
select_win.present();
};


// Create a yes and no question before delete the row and configuration

function confirm(group, row, _conn_id){
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
};

///// Initialisation /////


function init() {
}

function fillPreferencesWindow(window) {
    // Use the same GSettings schema as in `extension.js`
    const settings = ExtensionUtils.getSettings('gnome-wireguard-extension@SJBERTRAND.github.com');
        
     ///// Aquire connection info /////
     
     const client=NM.Client.new(null);
     const wg_Connections = [];
     const connections=client.get_connections();
        for ( let connection in connections) {
			if (connections[connection].get_connection_type() == 'wireguard' ) {
					wg_Connections.push(connections[connection]);
			};
		};
	const wg_connections_names = [];
	for (let _connection in wg_Connections){
	  wg_connections_names.push(wg_Connections[_connection].get_id());
    };
    
    /////////
    
    // Create a preferences page and group
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    const top_group = new Adw.PreferencesGroup();
    const bottom_group = new Adw.PreferencesGroup();
    page.add(top_group);
    page.add(group);
    page.add(bottom_group);

    
    ////// Create top label /////
    
    //Create a top label
    const top_label = new Gtk.Label({
        label: 'Available Wireguard Connection(s)',
        valign: Gtk.Align.CENTER,
    });
    top_group.add(top_label);
    
    
    	//Create an edit row and button on top
    	
    	
    	let edit_row = new Adw.ActionRow({ title: 'Edit Wireguard Connection(s)' });
		group.add(edit_row);
    	
		let edit_btn = new Gtk.Button({ label: 'Edit', valign: Gtk.Align.CENTER});
		edit_btn.connect('clicked', () => {
		GLib.spawn_command_line_async('nm-connection-editor');
		});
        edit_row.add_suffix(edit_btn);
    
    /////// Create row for each connection //////

    
    for ( let val in wg_connections_names ) {
        let _connection=client.get_connection_by_id(wg_connections_names[val]);
        let _settings=_connection.get_setting_connection();
		let _device=client.get_device_by_iface(_settings.interface_name);
		let _conn_id = wg_connections_names[val];
		let row = new Adw.ActionRow({ title: _conn_id });
		group.add(row);
		
		// Create a delete button
		let del_btn = new Gtk.Button({ label: 'Delete', valign: Gtk.Align.CENTER});
		del_btn.connect('clicked', () => {
		confirm(group, row, _conn_id);
		});

		//Add buttons to the row
		row.add_suffix(del_btn);
    };
    
    
     //Create a bottom label
    const bottom_label = new Gtk.Label({
        label: 'Add Wireguard Connection',
        valign: Gtk.Align.CENTER,
    });
    bottom_group.add(bottom_label);
    
    //Create a button to select a wireguard configuration
    const button1 = new Gtk.Button({
    label: 'Choose Wireguard Configuration file' ,
    valign: Gtk.Align.CENTER,
    margin_top: '8',
    });
    button1.connect('clicked', () => {
    select_conf(client, group);
    });
    bottom_group.add(button1);


    // Add our page to the window
    window.add(page);
};
