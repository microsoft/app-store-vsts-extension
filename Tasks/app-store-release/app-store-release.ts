/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';

import fs = require('fs');
import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');

import { ToolRunner } from 'vsts-task-lib/toolrunner';

class UserCredentials {
    username: string;
    password: string;
    appSpecificPassword: string;
    fastlaneSession: string;

    /* tslint:disable:no-empty */
    public UserCredentials() { }
    /* tslint:enable:no-empty */
}

function isValidFilePath(filePath: string): boolean {
    try {
        return fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}

// Attempts to find a single ipa file to use by the task.
// If a glob pattern is provided, only a single ipa is allowed.
function findIpa(ipaPath: string): string {
    let paths: string[] = tl.glob(ipaPath);
    if (!paths || paths.length === 0) {
        throw new Error(tl.loc('NoIpaFilesFound', ipaPath));
    }
    if (paths.length > 1) {
        throw new Error(tl.loc('MultipleIpaFilesFound', ipaPath));
    }
    return paths[0];
}

async function run() {
    const appSpecificPasswordEnvVar: string = 'FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD';
    const fastlaneSessionEnvVar: string = 'FASTLANE_SESSION';
    let isTwoFactorAuthEnabled: boolean = false;
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        // Check if this is running on Mac and fail the task if not
        if (os.platform() !== 'darwin') {
            throw new Error(tl.loc('DarwinOnly'));
        }

        // Get input variables
        let authType: string = tl.getInput('authType', true);
        let credentials: UserCredentials = new UserCredentials();
        if (authType === 'ServiceEndpoint') {
            let serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false);
            credentials.username = serviceEndpoint.parameters['username'];
            credentials.password = serviceEndpoint.parameters['password'];
            credentials.appSpecificPassword = serviceEndpoint.parameters['appSpecificPassword'];
            if (credentials.appSpecificPassword) {
                isTwoFactorAuthEnabled = true;
                let fastlaneSession: string = serviceEndpoint.parameters['fastlaneSession'];
                if (!fastlaneSession) {
                    throw Error(tl.loc('FastlaneSessionEmpty'));
                }
                credentials.fastlaneSession = fastlaneSession;
            }
        } else if (authType === 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
            isTwoFactorAuthEnabled = tl.getBoolInput('isTwoFactorAuth');
            if (isTwoFactorAuthEnabled) {
                credentials.appSpecificPassword = tl.getInput('appSpecificPassword', true);
                credentials.fastlaneSession = tl.getInput('fastlaneSession', true);
            }
        }

        let filePath: string = tl.getInput('ipaPath', true);
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
        let usesIdfa: boolean = tl.getBoolInput('usesIdfa', false);
        let shouldSkipSubmission: boolean = tl.getBoolInput('shouldSkipSubmission', false);
        let teamId: string = tl.getInput('teamId', false);
        let teamName: string = tl.getInput('teamName', false);

        let applicationType: string = tl.getInput('appType', true);

        let installFastlane: boolean = tl.getBoolInput('installFastlane', false);
        let fastlaneVersionChoice: string = tl.getInput('fastlaneToolsVersion', false);
        let fastlaneVersionToInstall: string;  //defaults to 'LatestVersion'
        if (fastlaneVersionChoice === 'SpecificVersion') {
            fastlaneVersionToInstall = tl.getInput('fastlaneToolsSpecificVersion', true);
        }

        // Set up environment
        tl.debug(`GEM_CACHE=${process.env['GEM_CACHE']}`);
        let gemCache: string = process.env['GEM_CACHE'] || path.join(process.env['HOME'], '.gem-cache');
        tl.debug(`gemCache=${gemCache}`);
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_PASSWORD'] = credentials.password;
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = 'true';
        process.env['FASTLANE_DISABLE_COLORS'] = 'true';

        if (isTwoFactorAuthEnabled) {
            // Properties required for two-factor authentication:
            // 1) Account username and password
            // 2) App-specific password (Apple account->Security where two factor authentication is set)
            // 3) FASTLANE_SESSION, which is essentially a cookie granting access to Apple accounts
            // To get a FASTLANE_SESSION, run 'fastlane spaceauth -u [email]' interactively (requires PIN)
            // See: https://github.com/fastlane/fastlane/blob/master/spaceship/README.md
            tl.debug('Using two-factor authentication');
            process.env[fastlaneSessionEnvVar] = credentials.fastlaneSession;
            process.env[appSpecificPasswordEnvVar] = credentials.appSpecificPassword;
        }

        // Add bin of new gem home so we don't have to resolve it later
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        // Ensure there's exactly one ipa before installing fastlane tools
        filePath = findIpa(filePath);

        // Install the ruby gem for fastlane
        tl.debug('Checking for ruby install...');
        tl.which('ruby', true);

        //Whenever a specific version of fastlane is requested, we're going to attempt to uninstall any installed
        //versions of fastlane.  Note that this doesn't uninstall dependencies of fastlane.
        if (installFastlane && fastlaneVersionToInstall) {
            try {
                let gemRunner: ToolRunner = tl.tool(tl.which('gem', true));
                gemRunner.arg(['uninstall', 'fastlane']);
                tl.debug(`Uninstalling all fastlane versions...`);
                gemRunner.arg(['-a', '-I']);  //uninstall all versions
                await gemRunner.exec();
            } catch (err) {
                tl.warning(tl.loc('UninstallFastlaneFailed', err));
            }
        }

        // If desired, install the fastlane tools (if they're already present, should be a no-op)
        if (installFastlane) {
            tl.debug('Installing fastlane...');
            let gemRunner: ToolRunner = tl.tool(tl.which('gem', true));
            gemRunner.arg(['install', 'fastlane']);
            if (fastlaneVersionToInstall) {
                tl.debug(`Installing specific version of fastlane: ${fastlaneVersionToInstall}`);
                gemRunner.arg(['-v', fastlaneVersionToInstall]);
            }
            await gemRunner.exec();

            // If desired, update fastlane (if already latest, should be a no-op)
            if (!fastlaneVersionToInstall) {
                tl.debug('Updating fastlane...');
                gemRunner = tl.tool(tl.which('gem', true));
                gemRunner.arg(['update', 'fastlane', '-i', gemCache]);
                await gemRunner.exec();
            }
        } else {
            tl.debug('Skipped fastlane installation.');
        }

        let fastlaneArguments: string = tl.getInput('fastlaneArguments');

        //gem update fastlane -i ~/.gem-cache
        if (releaseTrack === 'TestFlight') {
            // Run pilot (via fastlane) to upload to testflight
            // See https://github.com/fastlane/fastlane/blob/master/pilot/lib/pilot/options.rb for more information on these arguments
            let pilotCommand: ToolRunner = tl.tool('fastlane');
            let bundleIdentifier: string = tl.getInput('appIdentifier', false);
            pilotCommand.arg(['pilot', 'upload', '-u', credentials.username, '-i', filePath]);
            let usingReleaseNotes: boolean = isValidFilePath(releaseNotes);
            if (usingReleaseNotes) {
                pilotCommand.arg(['--changelog', fs.readFileSync(releaseNotes).toString()]);
            }
            pilotCommand.argIf(teamId, ['-q', teamId]);
            pilotCommand.argIf(teamName, ['-r', teamName]);
            pilotCommand.argIf(bundleIdentifier, ['-a', bundleIdentifier]);
            pilotCommand.argIf(shouldSkipSubmission, ['--skip_submission', 'true']);
            pilotCommand.argIf(shouldSkipWaitingForProcessing, ['--skip_waiting_for_build_processing', 'true']);

            let distributedToExternalTesters: boolean = tl.getBoolInput('distributedToExternalTesters', false);
            if (distributedToExternalTesters) {
                tl.debug('Distributing to external testers');
                if (!usingReleaseNotes) {
                    throw new Error(tl.loc('ReleaseNotesRequiredForExternalTesting'));
                }
                pilotCommand.arg(['--distribute_external', 'true']);
                if (shouldSkipSubmission || shouldSkipWaitingForProcessing) {
                    tl.warning(tl.loc('ExternalTestersCannotSkipWarning'));
                }

                let externalTestersGroups: string = tl.getInput('externalTestersGroups');
                pilotCommand.argIf(externalTestersGroups, ['--groups', externalTestersGroups]);
            }

            if (fastlaneArguments) {
                pilotCommand.line(fastlaneArguments);
            }

            await pilotCommand.exec();
        } else if (releaseTrack === 'Production') {
            let bundleIdentifier: string = tl.getInput('appIdentifier', true);
            // Run deliver (via fastlane) to publish to Production track
            // See https://github.com/fastlane/fastlane/blob/master/deliver/lib/deliver/options.rb for more information on these arguments
            let deliverCommand: ToolRunner = tl.tool('fastlane');
            deliverCommand.arg(['deliver', '--force', '-u', credentials.username, '-a', bundleIdentifier]);
            deliverCommand.argIf(skipBinaryUpload, ['--skip_binary_upload', 'true']);

            //Sets -i or -c depending if app submission is for (-i) iOS/tvOS or (-c) MacOS
            switch (applicationType.toLocaleLowerCase()) {
                case 'macos':
                    // Use the -C flag for apps
                    deliverCommand.arg(['-c', filePath]);
                    deliverCommand.arg(['-j', 'osx']); //Fastlane wants arg as OSX
                    break;

                case 'ios':
                    //Use the -I flag for ipa's
                    deliverCommand.arg(['-i', filePath]);
                    deliverCommand.arg(['-j', 'ios']);
                    break;

                case 'tvos':
                    //Use the -I flag for ipa's
                    deliverCommand.arg(['-i', filePath]);
                    deliverCommand.arg(['-j', 'appletvos']);
                    break;

                default:
                    throw new Error(tl.loc('NotValidAppType', applicationType));
            }

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
            deliverCommand.argIf(teamId, ['-k', teamId]);
            deliverCommand.argIf(teamName, ['--team_name', teamName]);
            deliverCommand.argIf(shouldSubmitForReview, ['--submit_for_review', 'true']);
            deliverCommand.argIf(shouldAutoRelease, ['--automatic_release', 'true']);
            deliverCommand.argIf(usesIdfa, ['--submission_information', `'{'add_id_info_uses_idfa': ${usesIdfa}}'`]);

            if (fastlaneArguments) {
                deliverCommand.line(fastlaneArguments);
            }

            await deliverCommand.exec();
        }

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyPublished', releaseTrack));

    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    } finally {
        if (isTwoFactorAuthEnabled) {
            tl.debug('Clearing two-factor authentication environment variables');
            process.env[fastlaneSessionEnvVar] = '';
            process.env[appSpecificPasswordEnvVar] = '';
        }
    }
}

run();
