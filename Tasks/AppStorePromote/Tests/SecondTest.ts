
import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-promote.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

//process.env['HOME']='/users/test'; //replace with mock of setVariable when task-lib has the support
//process.env['USEXCRUN']='false';

tmr.setInput('authType', 'UserAndPass');
// tr.setInput('configuration', '$(Configuration)');
// tr.setInput('sdk', '$(SDK)');
// tr.setInput('xcWorkspacePath', '**/*.xcodeproj/*.xcworkspace');
// tr.setInput('scheme', 'testScheme');
// tr.setInput('packageApp', 'true');
// tr.setInput('signMethod', 'file');
// tr.setInput('p12', '/user/build');
// tr.setInput('p12pwd', '');
// tr.setInput('provProfile', '/user/build');
// tr.setInput('removeProfile', 'false');
// tr.setInput('unlockDefaultKeychain', 'false');
// tr.setInput('defaultKeychainPassword', '');
// tr.setInput('iosSigningIdentity', '');
// tr.setInput('provProfileUuid', '');
// tr.setInput('args', '');
// tr.setInput('cwd', '/user/build');
// tr.setInput('outputPattern', 'output/$(SDK)/$(Configuration)');
// tr.setInput('xcodeDeveloperDir', '');
// tr.setInput('useXctool', 'false');
// tr.setInput('xctoolReporter', '');
// tr.setInput('publishJUnitResults', 'false');
// tr.setInput('archivePath', '/user/build');
// tr.setInput('exportPath', '/user/build');
// tr.setInput('exportOptions', 'auto');

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    'which': {
        'xcodebuild': '/home/bin/xcodebuild',
        'security': '/usr/bin/security',
        '/usr/libexec/PlistBuddy': '/usr/libexec/PlistBuddy',
        'rm': '/bin/rm'
    },
    'checkPath' : {
        '/home/bin/xcodebuild': true,
        '/usr/bin/security': true,
        '/usr/libexec/PlistBuddy': true,
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
        '/home/bin/xcodebuild -version': {
            'code': 0,
            'stdout': 'Xcode 7.3.1'
        },
        '/home/bin/xcodebuild -sdk $(SDK) -configuration $(Configuration) -workspace /user/build/fun.xcodeproj/project.xcworkspace -scheme testScheme build DSTROOT=/user/build/output/$(SDK)/$(Configuration)/build.dst OBJROOT=/user/build/output/$(SDK)/$(Configuration)/build.obj SYMROOT=/user/build/output/$(SDK)/$(Configuration)/build.sym SHARED_PRECOMPS_DIR=/user/build/output/$(SDK)/$(Configuration)/build.pch': {
            'code': 0,
            'stdout': 'xcodebuild output here'
        },
        '/home/bin/xcodebuild -workspace /user/build/fun.xcodeproj/project.xcworkspace -scheme testScheme archive -sdk $(SDK) -configuration $(Configuration) -archivePath /user/build/testScheme' : {
            'code': 0,
            'stdout': 'xcodebuild archive output here'
        },
        '/home/bin/xcodebuild -exportArchive -archivePath /user/build/testScheme.xcarchive -exportPath /user/build/_XcodeTaskExport_testScheme -exportOptionsPlist _XcodeTaskExportOptions.plist': {
            'code': 0,
            'stdout': 'xcodebuild export output here'
        },
        '/usr/libexec/PlistBuddy -c Clear _XcodeTaskExportOptions.plist': {
            'code': 0,
            'stdout': 'plist initialized output here'
        },
        '/usr/libexec/PlistBuddy -c Add method string app-store _XcodeTaskExportOptions.plist': {
            'code': 0,
            'stdout': 'plist add output here'
        },
        '/usr/bin/security cms -D -i /user/build/testScheme.xcarchive/Products/testScheme.app/embedded.mobileprovision': {
            'code': 0,
            'stdout': 'prov profile details here'
        },
        '/usr/libexec/PlistBuddy -c Print ProvisionsAllDevices _xcodetasktmp.plist': {
            'code': 1,
            'stdout': 'ProvisionsAllDevices not found'
        },
        '/usr/libexec/PlistBuddy -c Print Entitlements:get-task-allow _xcodetasktmp.plist': {
            'code': 0,
            'stdout': 'false'
        },
        '/usr/libexec/PlistBuddy -c Print ProvisionedDevices _xcodetasktmp.plist': {
            'code': 1,
            'stdout': 'ProvisionedDevices not found'
        },
        '/bin/rm -f _xcodetasktmp.plist': {
            'code': 0,
            'stdout': 'delete output here'
        }
    }
};
tmr.setAnswers(a);

// This is how you can mock NPM packages...
os.platform = () => {
    return 'win32';
};
tmr.registerMock('os', os);

tmr.run();