let net = require("net");

process.on("uncaughtException", function (error) {
    console.error(error);
});


function log(from, to, action, data) {

    if(!to){
        to={};
    }
    if(Buffer.isBuffer(data)){
        data=data.length;
    }

    console.log(from.remoteAddress, from.remotePort, ">>>>>", to.remoteAddress, to.remotePort, action, data);
}


if (process.argv.length != 7) {
    console.log("usage: %s <localhost> <localport> ==> <remotehost> <remoteport>  <password>", process.argv[1]);
    process.exit();
}

let localhost = process.argv[2];
let localport = process.argv[3];
let remotehost = process.argv[4];
let remoteport = process.argv[5];
let password = process.argv[6];

let server = net.createServer(function (localsocket) {

    console.log("new connect == ", localsocket.remoteAddress, localsocket.remotePort);

    let remotesocket = 0;
    let aut = 0;

    localsocket.on('data', function (data) {

        log(localsocket, remotesocket, 'data', data);

        if (aut != 1) {
            if (data.toString() == password) {
                localsocket.write("ok");
                localsocket.pause();
                aut = 1;

                remotesocket = new net.Socket();
                remotesocket.connect(remoteport, remotehost);

                remotesocket.on('connect', function (data) {
                    log(remotesocket, localsocket, 'connect', data);
                    //console.log("remotesocket >>> connection #%d from %s:%d", server.connections, localsocket.remoteAddress, localsocket.remotePort);
                    localsocket.resume();
                });
                remotesocket.on('close', function (had_error) {
                    log(remotesocket, localsocket, 'close', had_error);
                    //console.log("%s:%d - closing local", localsocket.remoteAddress, localsocket.remotePort);
                    localsocket.end();
                });
                remotesocket.on('data', function (data) {
                    log(remotesocket, localsocket, 'data', data);
                    //console.log("%s:%d - writing data to local", localsocket.remoteAddress, localsocket.remotePort);
                    var flushed = localsocket.write(data);
                    if (!flushed) {
                        console.log("  local not flushed; pausing remote");
                        remotesocket.pause();
                    }
                });
                remotesocket.on('drain', function () {
                    log(remotesocket, localsocket, 'drain', 0);
                    //console.log("%s:%d - resuming local", localsocket.remoteAddress, localsocket.remotePort);
                    localsocket.resume();
                });

            }
            else {
                localsocket.write("password err");
                localsocket.end();
            }
        }
        else {
            //console.log("%s:%d - writing data to remote", localsocket.remoteAddress, localsocket.remotePort);

            if (remotesocket) {
                let flushed = remotesocket.write(data);
                if (!flushed) {
                    console.log("  remote not flushed; pausing local");
                    localsocket.pause();
                }
            }
        }
    });

    localsocket.on('drain', function () {
        if (remotesocket) {
            log(localsocket, remotesocket, 'drain', 0);
            //console.log("%s:%d - resuming remote", localsocket.remoteAddress, localsocket.remotePort);
            remotesocket.resume();
        }
    });

    localsocket.on('close', function (had_error) {
        if (remotesocket) {
            log(localsocket, remotesocket, 'close', had_error);
            //console.log("%s:%d - closing remote", localsocket.remoteAddress, localsocket.remotePort);
            remotesocket.end();
        }
    });

});

server.listen(localport, localhost);

console.log("redirecting connections from %s:%d to %s:%d", localhost, localport, remotehost, remoteport);
