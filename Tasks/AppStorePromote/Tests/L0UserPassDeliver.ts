import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-promote.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authType', 'UserAndPass');
tmr.setInput('username', 'creds-username');
tmr.setInput('password', 'creds-password');
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
        '/usr/bin/deliver': true,
        '/bin/rm': true
    },
    'filePathSupplied': {
        'archivePath': false
    },
    'getVariable': {
        'build.sourcesDirectory': '/user/build',
        'HOME': '/users/test'
    },
    'exist': {
        '/user/build/_XcodeTaskExport_testScheme': false
    },
    'stats': {
        '/user/build': {
            'isFile': false
        }
    },
    'glob': {
        '**/*.xcodeproj/*.xcworkspace': [
            '/user/build/fun.xcodeproj/project.xcworkspace'
        ],
        '/user/build/output/$(SDK)/$(Configuration)/build.sym/**/*.app': [
            '/user/build/output/$(SDK)/$(Configuration)/build.sym/Release.iphoneos/fun.app'
        ],
        '/user/build/**/*.xcarchive': [
            '/user/build/testScheme.xcarchive'
        ],
        '/user/build/testScheme.xcarchive/**/embedded.mobileprovision': [
            '/user/build/testScheme.xcarchive/Products/testScheme.app/embedded.mobileprovision'
        ]
    },
    'exec': {
        '/usr/bin/gem install deliver': {
            'code': 0,
            'stdout': 'truly outrageous!'
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
