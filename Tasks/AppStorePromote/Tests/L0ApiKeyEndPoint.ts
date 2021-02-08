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

process.env['ENDPOINT_AUTH_MyServiceEndpoint'] = '{ "parameters": {"apiKeyId": "D383SF739", "apiKeyIssuerId": "6053b7fe-68a8-4acb-89be-165aa6465141", "apitoken": "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa25saGRsWWRMdQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0t" }, "scheme": "Token" }';

tmr.setInput('authType', 'ServiceEndpoint');
tmr.setInput('serviceEndpoint', 'MyServiceEndpoint');
tmr.setInput('chooseBuild', 'Latest');
tmr.setInput('appIdentifier', 'com.microsoft.test.appId');

process.env['MOCK_NORMALIZE_SLASHES'] = 'true';
process.env['HOME'] = '/usr/bin';
process.env['AGENT_BUILDDIRECTORY'] = 'test_build_path';
// Keeps the API key file from being deleted, so we can inspect it in our test
process.env['DEBUG_API_KEY_FILE'] = 'true';

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
        "fastlane deliver submit_build --precheck_include_in_app_purchases false --api_key_path test_build_path/api_keyD383SF739.json -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --force": {
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
