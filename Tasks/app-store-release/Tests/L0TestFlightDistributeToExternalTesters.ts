 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-release.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authType', 'UserAndPass');
tmr.setInput('username', 'creds-username');
tmr.setInput('password', 'creds-password');
tmr.setInput('releaseTrack', 'TestFlight');
tmr.setInput('ipaPath', 'mypackage.ipa');
tmr.setInput('appIdentifier', 'com.microsoft.test.appId');
tmr.setInput('distributedToExternalTesters', 'true');

process.env['MOCK_NORMALIZE_SLASHES'] = true;
process.env['HOME'] = '/usr/bin';

//construct a string that is JSON, call JSON.parse(string), send that to ma.TaskLibAnswers
let myAnswers: string = `{
    "which": {
        "ruby": "/usr/bin/ruby",
        "gem": "/usr/bin/gem",
        "fastlane": "/usr/bin/fastlane",
        "pilot": "/usr/bin/pilot"
    },
    "checkPath" : {
        "/usr/bin/ruby": true,
        "/usr/bin/gem": true,
        "/usr/bin/fastlane": true,
        "/usr/bin/pilot": true
    },
    "glob": {
        "mypackage.ipa": [
            "mypackage.ipa"
        ]
    },
    "exec": {
        "fastlane pilot upload -u creds-username -i mypackage.ipa --distribute_external true": {
            "code": 0,
            "stdout": "consider it uploaded!"
        }
     }
 }`;
let json: any = JSON.parse(myAnswers);
// Cast the json blob into a TaskLibAnswers
tmr.setAnswers(<ma.TaskLibAnswers>json);

// This is how you can mock NPM packages...
os.platform = () => {
    return 'darwin';
};
tmr.registerMock('os', os);

tmr.run();
