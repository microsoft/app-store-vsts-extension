 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-promote.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

// replace with mock of setVariable when task-lib has the support
process.env['ENDPOINT_AUTH_MyServiceEndpoint'] = '{ "parameters": {"username": "creds-username", "password": "creds-password"}, "scheme": "whatever" }';

tmr.setInput('authType', 'ServiceEndpoint');
tmr.setInput('serviceEndpoint', 'MyServiceEndpoint');
tmr.setInput('appIdentifier', 'com.microsoft.test.appId');
tmr.setInput('chooseBuild', 'latest');
tmr.setInput('shouldAutoRelease', 'true');

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    'which': {
        'ruby': '/usr/bin/ruby',
        'gem': '/usr/bin/gem',
        'deliver': '/usr/bin/deliver'
    },
    'checkPath' : {
        '/usr/bin/ruby': true,
        '/usr/bin/gem': true,
        '/usr/bin/deliver': true
    },
    'exec': {
        '/usr/bin/gem install deliver': {
            'code': 0,
            'stdout': '1 gem installed'
        },
        'deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force': {
            'code': 0,
            'stdout': 'consider it delivered!'
        }
    }
};
tmr.setAnswers(a);

// This is how you can mock NPM packages...
os.platform = () => {
    return 'darwin';
};
tmr.registerMock('os', os);

tmr.run();
