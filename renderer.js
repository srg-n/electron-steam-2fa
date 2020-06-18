const ipc = require('electron').ipcRenderer;

const get2faCodeBtn = document.querySelector('#get2faCode');
const confirmationsDiv = document.querySelector('#confirmations');
const cancelAllBtn = document.querySelector('#cancelAll');
const confirmAllBtn = document.querySelector('#confirmAll');
const initializeBtn = document.querySelector('#initialize');
const getConfirmationsBtn = document.querySelector('#getConfirmations');

const modalText = document.querySelector('#modalText');
const modalTitle = document.querySelector('#modalTitle');

let refreshText = document.querySelector('#refreshText');
let confirmationsList = document.querySelector('#confirmationList');

/*
const syncBtn = document.querySelector('#syncBtn'),
let replyDiv = document.querySelector('#reply');
syncBtn.addEventListener('click', () => {
    let reply = ipc.sendSync('synMessage', 'A sync message to main');
    replyDiv.innerHTML = reply;
});
*/

document.addEventListener('DOMContentLoaded', function () {
    ipc.send('initialize')
}, false);


ipc.on('initSuccessful', (event, args) => {
    ipc.send('aSynMessage', 'getConfirmations');
    refreshText.innerHTML = ``;
});

initializeBtn.addEventListener('click', () => {
    ipc.send('initialize');
});

getConfirmationsBtn.addEventListener('click', () => {
    confirmationsList.innerHTML = '<div class="alert alert-info" role="alert">Refreshing</div><hr> ';
    ipc.send('aSynMessage', 'getConfirmations')
});

confirmAllBtn.addEventListener('click', () => {
    ipc.send('aSynMessage', 'confirmAll')
});

cancelAllBtn.addEventListener('click', () => {
    ipc.send('aSynMessage', 'cancelAll')
});


get2faCodeBtn.addEventListener('click', () => {
    ipc.send('aSynMessage', 'get2faCode')
});


ipc.on('error', (event, args) => {
    showModal('Error', args);
});

function showModal(title, text) {
    modalText.innerHTML = text;
    modalTitle.innerHTML = title;
    $('#infoModal').modal('show');
}


ipc.on('recv2faCode', (event, twoFactorCode) => {
    showModal('2FA Code', twoFactorCode);
});

ipc.on('recvConfirmations', (event, args) => {
    confirmationsList.innerHTML = '';
    if (args.length === 0) {
        confirmationsList.innerHTML = "<center>We don't have anything to confirm.</center>";
        return;
    }
    args.forEach(confirmation => {
        let title;

        if (confirmation.title.includes(' to ')) {
            let toWho = confirmation.title.split(" to ");
            toWho = toWho[1];
            confirmation.title = confirmation.title.substring(6);
            confirmation.title = confirmation.title.split(" to ");
            confirmation.title = confirmation.title[0];

            title = 'Trade with ' + toWho;
        } else title = confirmation.title;

        if (confirmation.offerID === null) confirmation.offerID = '';
        else confirmation.offerID = ' - Offer #' + confirmation.offerID;

        if (confirmation.receiving.includes('For their: ')) {
            confirmation.receiving = confirmation.receiving.split("For their: ");
            confirmation.receiving = confirmation.receiving[1];
        }

        confirmationsList.innerHTML +=
            `<a href="#" class="list-group-item list-group-item-action flex-column align-items-start">
        <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1"><small><img src="${confirmation.icon}" class="rounded float-left" width="32" height="32"></small>${title}</h5>
            <small class="text-muted">${confirmation.time}</small>
        </div>
        <p class="mb-1">Get: ${confirmation.receiving}</p>
        <p class="mb-1">Give: ${confirmation.title}</p>
        <small>#${confirmation.id}${confirmation.offerID}</small>
        
        <div id="confStatus${confirmation.id}">
            <button type="button" class="btn btn-outline-success btn-sm" onclick="confirm2FA(${confirmation.id})">Confirm</button>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="cancel2FA(${confirmation.id})">Cancel</button>
        </div>
        </a>`;
    });

});