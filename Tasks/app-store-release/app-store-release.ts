import fs = require('fs');
import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');
import {ToolRunner} from 'vsts-task-lib/toolrunner';

class UserCredentials {
    username: string;
    password: string;

    public UserCredentials() {

    }
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
        if(os.platform() !== 'darwin') {
            throw 'App store promote can only be run from a Mac computer.';
        }

        // Get input variables
        var authType: string = tl.getInput('authType', false);
        var credentials : UserCredentials = new UserCredentials();
        if (authType === 'ServiceEndpoint') {
            var serviceEndpoint = tl.getInput('serviceEndpoint', true); 
            credentials.username = tl.getEndpointAuthorizationParameter(serviceEndpoint, 'username', true);
            credentials.password = tl.getEndpointAuthorizationParameter(serviceEndpoint, 'password', true);
        } else if (authType == 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
        }

        var bundleIdentifier: string = tl.getInput("appIdentifier", true);
        var ipaPath: string = tl.getInput("ipaPath", true);
        var skipBinaryUpload: boolean= tl.getBoolInput("skipBinaryUpload");
        var uploadMetadata: boolean = tl.getBoolInput("uploadMetadata");
        var metadataPath: string = tl.getInput("metadataPath", false);
        var uploadScreenshots: boolean = tl.getBoolInput("uploadScreenshots");
        var screenshotsPath: string = tl.getInput("screenshotsPath", false);
        var releaseNotes: string = tl.getInput("releaseNotes", false);
        var releaseTrack: string = tl.getInput("releaseTrack", true);
        var shouldSkipWaitingForProcessing: boolean = tl.getBoolInput("shouldSkipWaitingForProcessing", false);
        var shouldSubmitForReview: boolean = tl.getBoolInput("shouldSubmitForReview", false);
        var shouldAutoRelease: boolean = tl.getBoolInput("shouldAutoRelease", false);
        var shouldSkipSubmission: boolean = tl.getBoolInput("shouldSkipSubmission", false);
        var teamId: string = tl.getInput("teamId", false);
        var teamName: string = tl.getInput("teamName", false);

        // Set up environment
        var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_PASSWORD'] = credentials.password;
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

        // Add bin of new gem home so we don't ahve to resolve it later;
        process.env['PATH'] = process.env['PATH'] + ":" + gemCache + path.sep + "bin";

        if (releaseTrack === "TestFlight") {
            // Install the ruby gem for fastlane pilot
            tl.debug('Checking for ruby install...');
            tl.which('ruby', true);
            var installPilot: ToolRunner = tl.tool(tl.which('gem', true));
            installPilot.arg(['install', 'pilot']);
            await installPilot.exec();

            // Run pilot to upload to testflight
            var pilotCommand: ToolRunner = tl.tool('pilot');
            pilotCommand.arg(['upload', '-u', credentials.username, '-i', ipaPath]);
            if(isValidFilePath(releaseNotes)) {
                pilotCommand.arg(['--changelog', fs.readFileSync(releaseNotes).toString()]);
            }
            pilotCommand.argIf(shouldSkipSubmission, ['--skip_submission', 'true']);
            pilotCommand.argIf(shouldSkipWaitingForProcessing, ['--skip_waiting_for_build_processing', 'true']);
            await pilotCommand.exec();
        } else if (releaseTrack === "Production") {
            //Install the ruby gem for fastlane deliver
            tl.debug('Checking for ruby install...');
            tl.which('ruby', true);
            var installDeliver: ToolRunner = tl.tool(tl.which('gem', true));
            installDeliver.arg(['install', 'deliver']);
            await installDeliver.exec();

            // Run deliver to publish to Production track
            // See https://github.com/fastlane/deliver for more information on these arguments
            var deliverCommand : ToolRunner = tl.tool('deliver');
            deliverCommand.arg(['--force', '-u', credentials.username, '-a', bundleIdentifier, '-i', ipaPath]);
            deliverCommand.argIf(skipBinaryUpload, ['--skip_binary_upload', 'true']);
            // upload metadata if specified
            if(uploadMetadata && metadataPath) {
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
            deliverCommand.argIf(shouldSubmitForReview, ['--submit_for_review', 'true']);
            deliverCommand.argIf(shouldAutoRelease, ['--automatic_release', 'true']);
            await deliverCommand.exec();
        }

        tl.setResult(tl.TaskResult.Succeeded, 'Successfully published to ' + releaseTrack);

    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();
