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

    /* tslint:disable:no-empty */
    public UserCredentials() { }
    /* tslint:enable:no-empty */
}

async function run() {
    try {
        tl.setResourcePath(path.join( __dirname, 'task.json'));

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
        } else if (authType === 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
        }

        let appIdentifier: string = tl.getInput('appIdentifier', true);
        let chooseBuild: string = tl.getInput('chooseBuild', true);
        let buildNumber: string = tl.getInput('buildNumber', false);
        let shouldAutoRelease: boolean = tl.getBoolInput('shouldAutoRelease', false);
        let teamId: string = tl.getInput('teamId', false);
        let teamName: string = tl.getInput('teamName', false);

        tl.debug('Read all inputs.');

        // Set up environment
        let gemCache: string = path.join(process.env['HOME'], '.gem-cache');
        tl.debug(`gemCache=${gemCache}`);
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_PASSWORD'] = credentials.password;
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

        // Add bin of new gem home so we don't have to resolve it later
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        // Install the ruby gem for fastlane
        tl.debug('Checking for ruby install...');
        tl.which('ruby', true);
        // Install the fastlane tools (if they're already present, should be a no-op)
        let gemRunner: ToolRunner = tl.tool(tl.which('gem', true));
        gemRunner.arg(['install', 'fastlane']);
        await gemRunner.exec();
        // Always update fastlane (if already latest, should be a no-op)
        gemRunner = tl.tool(tl.which('gem', true));
        gemRunner.arg(['update', 'fastlane', '-i', gemCache]);
        await gemRunner.exec();

        //Run the deliver command 
        // See https://github.com/fastlane/deliver for more information on these arguments
        let deliverCommand: ToolRunner = tl.tool('fastlane');
        deliverCommand.arg(['deliver', 'submit_build', '-u', credentials.username, '-a', appIdentifier]);
        if (chooseBuild.toLowerCase() === 'specify') {
           deliverCommand.arg(['-n', buildNumber]);
        }
        deliverCommand.arg(['--skip_binary_upload', 'true', '--skip_metadata', 'true', '--skip_screenshots', 'true']);
        deliverCommand.argIf(shouldAutoRelease, '--automatic_release');
        deliverCommand.argIf(teamId, ['-q', teamId]);
        deliverCommand.argIf(teamName, ['-r', teamName]);
        deliverCommand.arg('--force');

        await deliverCommand.exec();

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullySubmitted'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

run();
