/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';

import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');

import { ToolRunner } from 'vsts-task-lib/toolrunner';

export class UserCredentials {
    username: string;
    password: string;
    appSpecificPassword: string;
    fastlaneSession: string;

    /* tslint:disable:no-empty */
    public UserCredentials() { }
    /* tslint:enable:no-empty */
}

async function run() {
    const appSpecificPasswordEnvVar: string = 'FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD';
    const fastlaneSessionEnvVar: string = 'FASTLANE_SESSION';
    let isTwoFactorAuthEnabled: boolean = false;
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        //check if this is running on Mac and fail the task if not
        if (os.platform() !== 'darwin') {
            throw new Error(tl.loc('DarwinOnly'));
        }

        tl.debug('Reading all inputs...');

        // Get input variables
        let authType: string = tl.getInput('authType', false);
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

        let appIdentifier: string = tl.getInput('appIdentifier', true);
        let chooseBuild: string = tl.getInput('chooseBuild', true);
        let buildNumber: string = tl.getInput('buildNumber', false);
        let shouldAutoRelease: boolean = tl.getBoolInput('shouldAutoRelease', false);
        let teamId: string = tl.getInput('teamId', false);
        let teamName: string = tl.getInput('teamName', false);

        let installFastlane: boolean = tl.getBoolInput('installFastlane', false);
        let fastlaneVersionChoice: string = tl.getInput('fastlaneToolsVersion', false);
        let fastlaneVersionToInstall: string;  //defaults to 'LatestVersion'
        if (fastlaneVersionChoice === 'SpecificVersion') {
            fastlaneVersionToInstall = tl.getInput('fastlaneToolsSpecificVersion', true);
        }
        let fastlaneArguments: string = tl.getInput('fastlaneArguments');
        tl.debug('Read all inputs.');

        // Set up environment
        tl.debug(`GEM_CACHE=${process.env['GEM_CACHE']}`);
        let gemCache: string = process.env['GEM_CACHE'] || path.join(process.env['HOME'], '.gem-cache');
        tl.debug(`gemCache=${gemCache}`);
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_PASSWORD'] = credentials.password;
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

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

        // Install the ruby gem for fastlane
        tl.debug('Checking for ruby install...');
        tl.which('ruby', true);

        //Whenever a specific version of fastlane is requested, we're going to uninstall all installed
        //versions of fastlane beforehand.  Note that this doesn't uninstall dependencies of fastlane.
        if (installFastlane && fastlaneVersionToInstall) {
            let gemRunner: ToolRunner = tl.tool(tl.which('gem', true));
            gemRunner.arg(['uninstall', 'fastlane']);
            tl.debug(`Uninstalling all fastlane versions...`);
            gemRunner.arg(['-a', '-I']);  //uninstall all versions
            await gemRunner.exec();
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

        //Run the deliver command 
        // See https://github.com/fastlane/fastlane/blob/master/deliver/lib/deliver/options.rb for more information on these arguments
        let deliverCommand: ToolRunner = tl.tool('fastlane');
        deliverCommand.arg(['deliver', 'submit_build', '-u', credentials.username, '-a', appIdentifier]);
        if (chooseBuild.toLowerCase() === 'specify') {
            deliverCommand.arg(['-n', buildNumber]);
        }
        deliverCommand.arg(['--skip_binary_upload', 'true', '--skip_metadata', 'true', '--skip_screenshots', 'true']);
        deliverCommand.argIf(shouldAutoRelease, '--automatic_release');
        deliverCommand.argIf(teamId, ['-k', teamId]);
        deliverCommand.argIf(teamName, ['-e', teamName]);
        deliverCommand.arg('--force');
        deliverCommand.argIf(fastlaneArguments, fastlaneArguments);

        await deliverCommand.exec();

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullySubmitted'));
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
