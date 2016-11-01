import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');
import {ToolRunner} from 'vsts-task-lib/toolrunner';

export class UserCredentials {
    username: string;
    password: string;

    public UserCredentials() {

    }
}

async function run() {
    try {
        //check if this is running on Mac and fail the task if not
        if(os.platform() !== 'darwin') {
            throw 'The Apple App Store Promote task can only run on a Mac computer.';
        }

        tl.debug('Read all inputs ...');

        // Get input variables
        var authType = tl.getInput('authType', false);
        var credentials : UserCredentials = new UserCredentials();
        if (authType === 'ServiceEndpoint') {
            var serviceEndpoint = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false); 
            credentials.username = serviceEndpoint.parameters['username'];
            credentials.password = serviceEndpoint.parameters['password'];
        } else if (authType == 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
        }

        var appIdentifier = tl.getInput('appIdentifier', true);
        var chooseBuild = tl.getInput('chooseBuild', true);
        var buildNumber = tl.getInput('buildNumber');
        var shouldAutoRelease = tl.getBoolInput('shouldAutoRelease', false);
        var teamId = tl.getInput('teamId', false);
        var teamName = tl.getInput('teamName', false);
                
        tl.debug('Read all inputs.');

        var appVersion;
        var appName;

        // Set up environment
        var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_PASSWORD'] = credentials.password;
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

        // Add bin of new gem home so we don't ahve to resolve it later;
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        //Install the ruby gem for fastlane deliver
        tl.debug('Checking for ruby install...');
        tl.which('ruby', true);
        var installDeliver: ToolRunner = tl.tool(tl.which('gem', true));
        installDeliver.arg(['install', 'deliver']);
        await installDeliver.exec();
        
        //Run the deliver command 
        // See https://github.com/fastlane/deliver for more information on these arguments
        var deliverCommand : ToolRunner = tl.tool('deliver');
        deliverCommand.arg(['submit_build', '-u', credentials.username, '-a', appIdentifier]);
        if (chooseBuild.toLowerCase() === 'specify') {
           deliverCommand.arg(['-n', buildNumber]);     
        }
        deliverCommand.arg(['--skip_binary_upload', 'true', '--skip_metadata', 'true', '--skip_screenshots', 'true']);
        deliverCommand.argIf(shouldAutoRelease, '--automatic_release');
        deliverCommand.argIf(teamId, ['-q', teamId]);
        deliverCommand.argIf(teamName, ['-r', teamName]);
        deliverCommand.arg('--force');

        await deliverCommand.exec();
 
        tl.setResult(tl.TaskResult.Succeeded, 'Build successfully submitted for review.');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();