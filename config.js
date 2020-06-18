var convict = require('convict');

// Define a schema
var config = convict({
    accountName: {
        doc: 'accountName',
        format: String,
        default: ''
    },
    password: {
        doc: 'password',
        format: String,
        default: ''
    },
    identitySecret: {
        doc: 'identitySecret',
        format: String,
        default: ''
    },
    sharedSecret: {
        doc: 'identitySecret',
        format: String,
        default: ''
    },
});


// Load environment dependent configuration
config.loadFile('./account.json');

// Perform validation
config.validate({ allowed: 'strict' });

module.exports = config;