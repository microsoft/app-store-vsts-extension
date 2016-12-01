import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-release.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

// replace with mock of setVariable when task-lib has the support
process.env['ENDPOINT_AUTH_MyServiceEndpoint'] = '{ "parameters": {"username": "creds-username", "password": "creds-password"}, "scheme": "whatever" }';

tmr.setInput('authType', 'ServiceEndpoint');
tmr.setInput('serviceEndpoint', 'MyServiceEndpoint');
tmr.setInput('appIdentifier', 'com.microsoft.test.appId');

// let ipaPath: string = tl.getInput('ipaPath', true);
tmr.setInput('ipaPath', '<path>');

// let skipBinaryUpload: boolean = tl.getBoolInput('skipBinaryUpload');
tmr.setInput('skipBinaryUpload', 'true');
// let uploadMetadata: boolean = tl.getBoolInput('uploadMetadata');
tmr.setInput('uploadMetadata', 'false');
// let metadataPath: string = tl.getInput('metadataPath', false);
tmr.setInput('uploadMetadata', '');
// let uploadScreenshots: boolean = tl.getBoolInput('uploadScreenshots');
tmr.setInput('uploadScreenshots', 'false');
// let screenshotsPath: string = tl.getInput('screenshotsPath', false);
tmr.setInput('screenshotsPath', '');
// let releaseNotes: string = tl.getInput('releaseNotes', false);
tmr.setInput('releaseNotes', '');
// let releaseTrack: string = tl.getInput('releaseTrack', true);
tmr.setInput('releaseTrack', 'TestFlight'); // Production
// let shouldSkipWaitingForProcessing: boolean = tl.getBoolInput('shouldSkipWaitingForProcessing', false);
tmr.setInput('shouldSkipWaitingForProcessing', '');
// let shouldSubmitForReview: boolean = tl.getBoolInput('shouldSubmitForReview', false);
tmr.setInput('shouldSubmitForReview', 'false');
// let shouldAutoRelease: boolean = tl.getBoolInput('shouldAutoRelease', false);
tmr.setInput('shouldAutoRelease', 'false');
// let shouldSkipSubmission: boolean = tl.getBoolInput('shouldSkipSubmission', false);
tmr.setInput('shouldSkipSubmission', 'true');
// let teamId: string = tl.getInput('teamId', false);
tmr.setInput('teamId', '');
// let teamName: string = tl.getInput('teamName', false);
tmr.setInput('teamName', '');

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers> {
    'which': {
        'ruby': '/usr/bin/ruby',
        'gem': '/usr/bin/gem',
        'deliver': '/usr/bin/deliver',
        'pilot': '/usr/bin/pilot'
    },
    'checkPath' : {
        '/usr/bin/ruby': true,
        '/usr/bin/gem': true,
        '/usr/bin/deliver': true,
        '/usr/bin/pilot': true
    },
    'filePathSupplied': {
        'archivePath': false
    },
    'getVariable': {
        'build.sourcesDirectory': '/user/build',
        'HOME': '/users/test'
    },
    // 'exist': {
    //     '/user/build/_XcodeTaskExport_testScheme': false
    // },
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
        '/usr/bin/gem install pilot': {
            'code': 0,
            'stdout': 'truly outrageous!'
        },
        'pilot upload -u creds-username -i <path> --skip_submission true': {
            'code': 0,
            'stdout': 'truly outrageous!'
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
