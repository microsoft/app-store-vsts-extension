import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import os = require('os');

let taskPath = path.join(__dirname, '..', 'app-store-promote.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

// This is how you can mock NPM packages...
os.platform = () => {
    return 'win32';
};
tmr.registerMock('os', os);

tmr.run();
