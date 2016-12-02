import fs = require('fs');
import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');

import { ToolRunner } from 'vsts-task-lib/toolrunner';

class UserCredentials {
    username: string;
    password: string;

    /* tslint:disable:no-empty */
    public UserCredentials() { }
    /* tslint:enable:no-empty */
}

function isValidFilePath(filePath: string) : boolean {
    try {
        return fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}

async function run() {
    try {
        // Check if this is running on Mac and fail the task if not
        if (os.platform() !== 'darwin') {
            throw new Error(tl.loc('DarwinOnly'));
        }

        // Get input variables
        let authType: string = tl.getInput('authType', true);
        let credentials : UserCredentials = new UserCredentials();
        if (authType === 'ServiceEndpoint') {
            let serviceEndpoint = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false);
            credentials.username = serviceEndpoint.parameters['username'];
            credentials.password = serviceEndpoint.parameters['password'];
        } else if (authType === 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
        }

        //let bundleIdentifier: string = tl.getInput('appIdentifier', true);
        let ipaPath: string = tl.getInput('ipaPath', true);
        let skipBinaryUpload: boolean = tl.getBoolInput('skipBinaryUpload', false);
        let uploadMetadata: boolean = tl.getBoolInput('uploadMetadata', false);
        let metadataPath: string = tl.getInput('metadataPath', false);
        let uploadScreenshots: boolean = tl.getBoolInput('uploadScreenshots', false);
        let screenshotsPath: string = tl.getInput('screenshotsPath', false);
        let releaseNotes: string = tl.getInput('releaseNotes', false);
        let releaseTrack: string = tl.getInput('releaseTrack', true);
        let shouldSkipWaitingForProcessing: boolean = tl.getBoolInput('shouldSkipWaitingForProcessing', false);
        let shouldSubmitForReview: boolean = tl.getBoolInput('shouldSubmitForReview', false);
        let shouldAutoRelease: boolean = tl.getBoolInput('shouldAutoRelease', false);
        let shouldSkipSubmission: boolean = tl.getBoolInput('shouldSkipSubmission', false);
        let teamId: string = tl.getInput('teamId', false);
        let teamName: string = tl.getInput('teamName', false);

        // Set up environment
        let gemCache: string = process.env['GEM_CACHE'] || process.platform === 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_PASSWORD'] = credentials.password;
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;
        process.env['FASTLANE_DISABLE_COLORS'] = true;

        // Add bin of new gem home so we don't have to resolve it later
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        if (releaseTrack === 'TestFlight') {
            // Install the ruby gem for fastlane pilot
            tl.debug('Checking for ruby install...');
            tl.which('ruby', true);
            let installPilot: ToolRunner = tl.tool(tl.which('gem', true));
            installPilot.arg(['install', 'pilot']);
            await installPilot.exec();

            // Run pilot to upload to testflight
            let pilotCommand: ToolRunner = tl.tool('pilot');
            pilotCommand.arg(['upload', '-u', credentials.username, '-i', ipaPath]);
            if (isValidFilePath(releaseNotes)) {
                pilotCommand.arg(['--changelog', fs.readFileSync(releaseNotes).toString()]);
            }
            pilotCommand.argIf(teamId, ['-q', teamId]);
            pilotCommand.argIf(teamName, ['-r', teamName]);
            pilotCommand.argIf(shouldSkipSubmission, ['--skip_submission', 'true']);
            pilotCommand.argIf(shouldSkipWaitingForProcessing, ['--skip_waiting_for_build_processing', 'true']);
            await pilotCommand.exec();
        } else if (releaseTrack === 'Production') {
            let bundleIdentifier: string = tl.getInput('appIdentifier', true);

            //Install the ruby gem for fastlane deliver
            tl.debug('Checking for ruby install...');
            tl.which('ruby', true);
            let installDeliver: ToolRunner = tl.tool(tl.which('gem', true));
            installDeliver.arg(['install', 'deliver']);
            await installDeliver.exec();

            // Run deliver to publish to Production track
            // See https://github.com/fastlane/deliver for more information on these arguments
            let deliverCommand : ToolRunner = tl.tool('deliver');
            deliverCommand.arg(['--force', '-u', credentials.username, '-a', bundleIdentifier, '-i', ipaPath]);
            deliverCommand.argIf(skipBinaryUpload, ['--skip_binary_upload', 'true']);
            // upload metadata if specified
            if (uploadMetadata && metadataPath) {
                deliverCommand.arg(['-m', metadataPath]);
            } else {
                deliverCommand.arg(['--skip_metadata', 'true']);
            }
            // upload screenshots if specified
            if (uploadScreenshots && screenshotsPath) {
                deliverCommand.arg(['-w', screenshotsPath]);
            } else {
                deliverCommand.arg(['--skip_screenshots', 'true']);
            }
            deliverCommand.argIf(teamId, ['-q', teamId]);
            deliverCommand.argIf(teamName, ['-r', teamName]);
            deliverCommand.argIf(shouldSubmitForReview, ['--submit_for_review', 'true']);
            deliverCommand.argIf(shouldAutoRelease, ['--automatic_release', 'true']);
            await deliverCommand.exec();
        }

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyPublished', releaseTrack));

    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();
