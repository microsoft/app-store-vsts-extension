import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');
//import fs = require('fs');
//var Stats = require('fs').Stats;
//var Readable = require('stream').Readable

let taskPath = path.join(__dirname, '..', 'app-store-release.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('authType', 'UserAndPass');
tmr.setInput('username', 'creds-username');
tmr.setInput('password', 'creds-password');
//tmr.setInput('appIdentifier', 'com.microsoft.test.appId');

tmr.setInput('releaseTrack', 'TestFlight');
tmr.setInput('ipaPath', '<path>');

//let releaseNotes: string = tl.getInput('releaseNotes', false);
tmr.setInput('releaseNotes', 'releaseNotes.md');

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
    // 'filePathSupplied': {
    //     'archivePath': false
    // },
    // 'getVariable': {
    //     'build.sourcesDirectory': '/user/build',
    //     'HOME': '/users/test'
    // },
    // 'exist': {
    //     '/user/build/_XcodeTaskExport_testScheme': false
    // },
    'stats': {
        'releaseNotes.md': {
            'isFile': true
        }
    },
    'statsSync': {
        'releaseNotes.md': {
            'isFile': true
        }
    },
    'exec': {
        '/usr/bin/gem install pilot': {
            'code': 0,
            'stdout': 'truly outrageous!'
        },
        'pilot upload -u creds-username -i <path>': {
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

//fs.statSync(filePath).isFile();
//export function statSync(path: string | Buffer): Stats;
/**
 * 
    interface Stats {
        isFile(): boolean;
        isDirectory(): boolean;
        isBlockDevice(): boolean;
        isCharacterDevice(): boolean;
        isSymbolicLink(): boolean;
        isFIFO(): boolean;
        isSocket(): boolean;
        dev: number;
        ino: number;
        mode: number;
        nlink: number;
        uid: number;
        gid: number;
        rdev: number;
        size: number;
        blksize: number;
        blocks: number;
        atime: Date;
        mtime: Date;
        ctime: Date;
        birthtime: Date;
    }
 */

//export function readFileSync(filename: string, options?: { flag?: string; }): Buffer;

//     var fsMock = {
//         stat: function (path, cb) { /* your mock code */ }
//     };
// mockery.registerMock('fs', fsMock);

//fs.readFileSync(releaseNotes).toString()
// fs.readFileSync = (filename: string, options?: { flag?: string; }) => {
//     var buffer = new Buffer("some text");
//     return buffer;
// };
let fsMock = {
    readFileSync: function (filename, options?) {
        let buffer: Buffer = new Buffer('some text');
        return buffer;
    }
    // statSync: function(filePath) {
    //     // isFile: function() {
    //     //     return true;
    //     // }
    //     // let stats: Stats = new Stats();
    //     // stats
    // }
};
//export function statSync(path: string | Buffer): Stats;

tmr.registerMock('fs', fsMock);

tmr.run();
