const { app, BrowserWindow } = require('electron')
const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');
const FS = require('fs');
const ipc = require('electron').ipcMain;
const { shell } = require('electron');
var config = require('./config.js');

let community = new SteamCommunity();

let identitySecret = config.get('identitySecret');
let sharedSecret = config.get('sharedSecret');
// Steam logon options
let logOnOptions = {
    "accountName": config.get('accountName'),
    "password": config.get('password'),
    "twoFactorCode": SteamTotp.getAuthCode(sharedSecret)
};
let confirms = {};

ipc.on('initialize', async (event) => {
    community.login(logOnOptions, function (err, sessionID, cookies, steamguard, oAuthToken) {
        if (err) event.sender.send('error', err.toString())
        else event.sender.send('initSuccessful')
    });
});

function getConfirmations() {
    return new Promise((resolve, reject) => {
        time_conf = Math.floor(Date.now() / 1000);
        key_conf = SteamTotp.getConfirmationKey(identitySecret, time_conf, 'conf');
        community.getConfirmations(time_conf, key_conf, function (err, confirmations) {

            if (err) { logger.error(err); return; }
            confirmations.forEach(confirmation => {
                confirms['conf' + confirmation.id] = {};
                confirms['conf' + confirmation.id] = confirmation;
            });
            console.log(confirms);
            resolve(confirmations);

            /*
            time_details = Math.floor(Date.now() / 1000);
            key_details = SteamTotp.getConfirmationKey("identitySecret, time_details, 'details');
 
            confirmations.forEach(function (confirmation) {
                confirmation.getOfferID(time_details, key_details, function (err, offerID) {
                    if (err) { logger.error(err); return; }
                    console.log(offerID);
                });
            });
            */
        });
    })
}

ipc.on('synMessage', async (event, args) => {
    let confs = await getConfirmations();
    event.returnValue = JSON.stringify(confs);
});

ipc.on('aSynMessage', async (event, args) => {
    try {
        console.log('act: ' + args.action);
        if (args === 'getConfirmations') {
            let confs = await getConfirmations();
            console.log(JSON.stringify(confs));
            event.sender.send('recvConfirmations', confs)
        } else if (args.action === 'openLink') {
            shell.openExternal("https://" + args.data);
        } else if (args === 'get2faCode') {
            let code = SteamTotp.getAuthCode(sharedSecret);
            console.log(code);
            event.sender.send('recv2faCode', code)
        } else if (args.action === 'confirm2FA' || args.action === 'cancel2FA') {
            let act;
            let doneAct;
            if (args.action === 'cancel2FA') {
                act = "cancel";
                doneAct = 'cancelled';
            }
            if (args.action === 'confirm2FA') {
                act = "allow";
                doneAct = 'confirmed';
            }

            console.log('OFFER ACT TRIGGERED ' + args.data);
            let confirmation = confirms['conf' + args.data];
            event.sender.send('confObjectUpdate', { action: doneAct, data: args.data })
            actOn2FA(confirmation, act);
        } else if (args === 'confirmAll' || args === 'cancelAll') {
            let act;
            let doneAct;
            let determine = false;
            console.log('OFFER ACT TRIGGERED ' + doneAct);

            if (args === 'cancelAll') {
                determine = false;
                act = "cancel";
                doneAct = 'cancelledAll';
            }
            if (args === 'confirmAll') {
                determine = true;
                act = "allow";
                doneAct = 'confirmedAll';
            }

            let time = SteamTotp.time();
            let confKey = SteamTotp.getConfirmationKey(identitySecret, time, "conf");
            let allowKey = SteamTotp.getConfirmationKey(identitySecret, time, act);
            community.getConfirmations(time, confKey, function (err, confs) {
                if (err) {
                    callback(err);
                    return;
                }

                if (confs.length == 0) {
                    callback(null, []);
                    return;
                }

                community.respondToConfirmation(confs.map(function (conf) { return conf.id; }), confs.map(function (conf) { return conf.key; }), time, allowKey, determine, function (err) {
                    if (err) throw err;
                });
            });

            event.sender.send('confObjectUpdate', { action: doneAct, data: args.data })
        } else event.sender.send('error', 'Unknown action ' + args.action)
    } catch (e) {
        event.sender.send('error', e.toString());
    }
});

async function actOn2FA(confirmation, act, retries = 0) {
    let time = SteamTotp.time();
    let confKey = SteamTotp.getConfirmationKey(identitySecret, time, act);
    let determine;
    if (act === "allow") determine = true;
    else determine = false;
    confirmation.respond(time, confKey, determine, function (err) {
        if (err) {
            retries++;
            if (retries < 4) actOn2FA(confirmation, act, retries)
            else if (err.message !== "Could not act on confirmation") throw err
        }
        else return true;
    });
    return true;
}

function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 450,
        height: 820,
        webPreferences: {
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    win.loadFile('index.html')

    // Open the DevTools.
    //win.webContents.openDevTools();
    win.setMenuBarVisibility(false);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    app.quit()
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.