 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-release.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authType', 'ApiKey');
tmr.setInput('apiKeyId', 'D383SF739');
tmr.setInput('apiKeyIssuerId', '6053b7fe-68a8-4acb-89be-165aa6465141');
tmr.setInput('apitoken', 'dummy_string');
tmr.setInput('releaseTrack', 'TestFlight');
tmr.setInput('appType', 'iOS');
tmr.setInput('ipaPath', 'mypackage.ipa');
tmr.setInput('installFastlane', 'true');
tmr.setInput('fastlaneToolsVersion', 'LatestVersion');

process.env['MOCK_NORMALIZE_SLASHES'] = 'true';
process.env['HOME'] = '/usr/bin';
process.env['AGENT_TEMPDIRECTORY'] = 'test_temp_path';
// Keeps the API key file from being deleted, so we can inspect it in our test
process.env['DEBUG_API_KEY_FILE'] = 'true';
let gemCache: string = '/usr/bin/.gem-cache';

//construct a string that is JSON, call JSON.parse(string), send that to ma.TaskLibAnswers
let myAnswers: string = `{
    "which": {
        "ruby": "/usr/bin/ruby",
        "gem": "/usr/bin/gem",
        "fastlane": "/usr/bin/fastlane"
    },
    "checkPath" : {
        "/usr/bin/ruby": true,
        "/usr/bin/gem": true,
        "/usr/bin/fastlane": true
    },
    "findMatch": {
        "mypackage.ipa": [
            "mypackage.ipa"
        ]
    },
    "exec": {
        "/usr/bin/gem install fastlane": {
            "code": 0,
            "stdout": "1 gem installed"
        },
        "/usr/bin/gem update fastlane -i ${gemCache}": {
            "code": 0,
            "stdout": "1 gem installed"
        },
        "fastlane pilot upload --api_key_path test_temp_path/api_keyD383SF739.json -i mypackage.ipa": {
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
