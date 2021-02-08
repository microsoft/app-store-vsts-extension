 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-promote.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authType', 'ApiKey');
tmr.setInput('apiKeyId', 'D383SF739');
tmr.setInput('apiKeyIssuerId', '6053b7fe-68a8-4acb-89be-165aa6465141');
tmr.setInput('apitoken', 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa25saGRsWWRMdQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0t');
tmr.setInput('appIdentifier', 'com.microsoft.test.appId');
tmr.setInput('chooseBuild', 'latest');
tmr.setInput('shouldAutoRelease', 'true');
tmr.setInput('installFastlane', 'true');
tmr.setInput('fastlaneToolsVersion', 'LatestVersion');

process.env['AGENT_BUILDDIRECTORY'] = 'test_build_path';
// Keeps the API key file from being deleted, so we can inspect it in our test
process.env['DEBUG_API_KEY_FILE'] = 'true';
process.env['MOCK_NORMALIZE_SLASHES'] = 'true';
process.env['HOME'] = '/usr/bin';
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
    "exec": {
        "/usr/bin/gem install fastlane": {
            "code": 0,
            "stdout": "1 gem installed"
        },
        "/usr/bin/gem update fastlane -i ${gemCache}": {
            "code": 0,
            "stdout": "1 gem installed"
        },
        "fastlane deliver submit_build --precheck_include_in_app_purchases false --api_key_path test_build_path/api_keyD383SF739.json -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force": {
            "code": 0,
            "stdout": "consider it delivered!"
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
