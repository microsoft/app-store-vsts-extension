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

tmr.setInput('authType', 'UserAndPass');
tmr.setInput('username', 'creds-username');
tmr.setInput('password', 'creds-password');
tmr.setInput('releaseTrack', 'TestFlight');
tmr.setInput('appType', 'iOS');
tmr.setInput('ipaPath', 'mypackage.ipa');
tmr.setInput('installFastlane', 'true');
tmr.setInput('fastlaneToolsVersion', 'LatestVersion');
tmr.setInput('distributeOnly', 'true');
tmr.setInput('appIdentifier', 'com.microsoft.test.appId');
tmr.setInput('externalTestersGroups', 'Beta');
tmr.setInput('appBuildNumber', '100');

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
    "findMatch": {
        "mypackage.ipa": [
            "mypackage.ipa"
        ]
    },
    "exec": {
        "/usr/bin/gem install --no-document fastlane": {
            "code": 0,
            "stdout": "1 gem installed"
        },
        "/usr/bin/gem update fastlane -i ${gemCache}": {
            "code": 0,
            "stdout": "1 gem installed"
        },
        "fastlane pilot distribute -u creds-username --build_number 100 -a com.microsoft.test.appId -j ios --groups Beta": {
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
