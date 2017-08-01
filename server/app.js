var fs = require('fs')
    , http = require('http')
    , socketio = require('socket.io')({ path: '/ws/socket.io'});
const { exec } = require('child_process');
var server = http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-type': 'text/html'});
    res.end(fs.readFileSync('/home/public/ws/index.html'));
}).listen(8080, function() {
});

var socketr = socketio.listen(server)
var rooms = {};
var socketToRoom = {};
function validate(text) {
	return  /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(text);
	
}
socketr.of('/ws').on('connection', function (socket) {
    socket.on('message', function (msg) {
		msg.msg = msg.msg.replace(/<(?:.|\n)*?>/gm, '');
		msg.name = msg.name.replace(/<(?:.|\n)*?>/gm, '');
		
		if(rooms[socketToRoom[socket.id]]['names'][msg.name] != socket) {
			socket.disconnect('booted off the island desu');
			return;
		}
		if(msg.msg == "/ihavethepower") {
			rooms[socketToRoom[socket.id]]['leader'].emit('isNotLeader');
			rooms[socketToRoom[socket.id]]['leader'] = socket;
			msg.msg = "STOLE LEADERSHIP ROLE";
			rooms[socketToRoom[socket.id]]['leader'].emit('isLeader');
		}
		if(socket == rooms[socketToRoom[socket.id]]['leader']) {
			if(msg.msg.startsWith('/queue ')) {
				var link = msg.msg.replace('/queue ', '');
				//add to queue ...
				rooms[socketToRoom[socket.id]]['queue'].push(link);
				msg.msg = " added "+link+" to the queue.";
			} else if(msg.msg.startsWith('/queue')) {
				//just display
				socket.emit('message', {'msg': rooms[socketToRoom[socket.id]]['queue'].join(), 'name': 'SERVER'});
				return;
			}
			
				
		}
        socketr.of('/ws').in(socketToRoom[socket.id]).emit('message', {'msg': msg.msg, 'name': msg.name});
    });
	
    socket.on('connected', function (name) {
		name.name = name.name.replace(/<(?:.|\n)*?>/gm, '');
		name.roomcode = name.roomcode.replace(/<(?:.|\n)*?>/gm, '');
		if(!rooms[name.roomcode]) {
			//new room
			rooms[name.roomcode] = {};
			rooms[name.roomcode]['names'] = {};
			rooms[name.roomcode]['queue'] = [];
			rooms[name.roomcode]['video'] = "";
			rooms[name.roomcode]['time'] = 0;
			rooms[name.roomcode]['leader'] = null;
			rooms[name.roomcode]['link'] = "";
			rooms[name.roomcode]['sub'] = "";
		}
		if(rooms[name.roomcode]['names'][name.name]) {
			if(rooms[name.roomcode]['names'][name.name] != socket) {
				socket.emit('byebye');
				socket.disconnect('booted off the island desu');
			}
			return; //name dup check
		}
		rooms[name.roomcode]['names'][name.name] = socket;
		socket.join(name.roomcode);
		socket.broadcast.to(name.roomcode).emit('message', {'msg': 'CONNECTED', 'name': name.name});
		socketToRoom[socket.id] = name.roomcode;
        socket.emit('newLink', rooms[name.roomcode]['link']);
        socket.emit('newSubs', rooms[name.roomcode]['sub']);
		socketr.of('/ws').in(name.roomcode).emit('playerList', Object.keys(rooms[name.roomcode]['names']));
    });
	socket.on('videoDone', function() {
		//playback HAS ENDED ... check if we have something else in the queue, otherwise, do nothing.
		if(socket != rooms[socketToRoom[socket.id]]['leader'])
			return;
		
		if(rooms[socketToRoom[socket.id]]['queue'].length <= 0) {
	        socketr.of('/ws').in(socketToRoom[socket.id]).emit('message', {'msg': 'done with queue!', 'name': 'SERVER'});
			return;
		}
		//get this and remove it from the stack
        socketr.of('/ws').in(socketToRoom[socket.id]).emit('newLink', rooms[socketToRoom[socket.id]]['queue'][0]);
        socket.emit('play');		
		rooms[socketToRoom[socket.id]]['link'] = rooms[socketToRoom[socket.id]]['queue'][0];
		rooms[socketToRoom[socket.id]]['queue'].splice(0, 1);
        socketr.of('/ws').in(socketToRoom[socket.id]).emit('message', {'msg': 'playing NEXT ...', 'name': 'SERVER'});
		
	});
    socket.on('pause', function() {
		if(socket != rooms[socketToRoom[socket.id]]['leader'])
			return;
        socket.broadcast.to(socketToRoom[socket.id]).emit('pause');
	});
    socket.on('play', function() {
		if(socket != rooms[socketToRoom[socket.id]]['leader'])
			return;
        socket.broadcast.to(socketToRoom[socket.id]).emit('play');
	});
	socket.on('newLink', function(link) {
		if(socket != rooms[socketToRoom[socket.id]]['leader']) 
			return;
	    if(!validate(link)) {
			return;
		}
		if(link.indexOf('https://www.youtube.com/watch') >= 0) {
			//It's a youtube link!! Patch this ...
			console.log("youtube link detected");
			exec('/home/protected/youtube-dl -g '+link, (err, stdout, stderr) => {
			  if (!err) {
			  		console.log(`stdout: ${stdout}`);
					link = stdout;
					if(link.indexOf("https", 3) > -1)
						link = link.substring(0, link.indexOf("https", 3)).trim();
					
			        socketr.of('/ws').in(socketToRoom[socket.id]).emit('newLink', link);
					rooms[socketToRoom[socket.id]]['link'] = link;
			        socketr.of('/ws').in(socketToRoom[socket.id]).emit('newSubs', " ");
					rooms[socketToRoom[socket.id]]['sub'] = "";
				}	
			});
			return;
		}
        socket.broadcast.to(socketToRoom[socket.id]).emit('newLink', link);
		rooms[socketToRoom[socket.id]]['link'] = link;
        socketr.of('/ws').in(socketToRoom[socket.id]).emit('newSubs', " ");
		rooms[socketToRoom[socket.id]]['sub'] = "";
	});
	socket.on('newSubs', function(link) {
		if(socket != rooms[socketToRoom[socket.id]]['leader'])
			return;
	    if(!validate(link)) {
			return;
		}
		console.log('new subs');
		console.log(link);
        socket.broadcast.to(socketToRoom[socket.id]).emit('newSubs', link);
		rooms[socketToRoom[socket.id]]['sub'] = link;
	});
    socket.on('pinger', function(time) {
		if(!socketToRoom[socket.id] || !rooms[socketToRoom[socket.id]])
			return;
		if(rooms[socketToRoom[socket.id]]['leader'] == null) {
			rooms[socketToRoom[socket.id]]['leader'] = socket;
			socket.emit('isLeader');
			socket.emit('synco', rooms[socketToRoom[socket.id]]['time']);
			socket.emit('pause');
		}
		if(socket == rooms[socketToRoom[socket.id]]['leader'] && time != -1) {
			socket.broadcast.to(socketToRoom[socket.id]).emit('synco', time);
			rooms[socketToRoom[socket.id]]['time'] = time;
		}
        socket.emit('ponger');
    });
    socket.on('disconnect', function() {
		//find name
		if(!socketToRoom[socket.id]) //we booted this user ourselves. (they never made it past initial auth)
			return;
		for(var key in rooms[socketToRoom[socket.id]]['names']) {
			if(rooms[socketToRoom[socket.id]]['names'][key] == socket) {
		        socket.broadcast.to(socketToRoom[socket.id]).emit('message', {'msg': 'DC\'D', 'name': key});
				if(rooms[socketToRoom[socket.id]]['leader'] == socket) {
					if(socketr.of('/ws').adapter.rooms[socketToRoom[socket.id]])
						rooms[socketToRoom[socket.id]]['leader'] = socketr.of('/ws').adapter.rooms[socketToRoom[socket.id]][0];
					else
						rooms[socketToRoom[socket.id]]['leader'] = null;
					if(rooms[socketToRoom[socket.id]]['leader'] != null) {
						rooms[socketToRoom[socket.id]]['leader'].emit('isLeader');
					}
				}
				delete rooms[socketToRoom[socket.id]]['names'][key];
				socketr.of('/ws').in(socketToRoom[socket.id]).emit('playerList', Object.keys(rooms[socketToRoom[socket.id]]['names']));
				delete socketToRoom[socket.id];
				return;
			}
		}
    });
	
});
