/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';

import fs = require('fs');
import os = require('os');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');

import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';

export class UserCredentials {
    username: string;
    password: string;
    appSpecificPassword: string;
    fastlaneSession: string;

    /* tslint:disable:no-empty */
    public UserCredentials() { }
    /* tslint:enable:no-empty */
}

/**
 * Information for the App Store Connect API key used by fastlane
 * See https://docs.fastlane.tools/app-store-connect-api/#using-fastlane-api-key-json-file
 */
export interface ApiKey {
    /**
     * Key ID (for example 'D383SF740')
     */
    key_id: string;
    /**
     * Issuer ID (for example '6053b7fe-68a8-4acb-89be-165aa6465141')
     */
    issuer_id: string;
    /**
     * The base64-encoded private key contents of the p8 file from Apple.
     */
    key: string;
    /**
     * Optional, set to true to use Enterprise account
     */
    in_house?: boolean;
    /**
     * Indicates whether the key content is base64 encoded
     */
    is_key_content_base64: boolean;
}

async function run() {
    const appSpecificPasswordEnvVar: string = 'FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD';
    const fastlaneSessionEnvVar: string = 'FASTLANE_SESSION';
    let apiKeyFileName: string = undefined;
    let isTwoFactorAuthEnabled: boolean = false;
    let isUsingApiKey: boolean = false;
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
        let apiKey: ApiKey = undefined;

        const createApiKeyFileName = (apiKeyId: string) => {
            const tempPath = tl.getVariable('Agent.BuildDirectory') || tl.getVariable('Agent.TempDirectory');
            return path.join(tempPath, `api_key${apiKeyId}.json`);
        };

        if (authType === 'ServiceEndpoint') {
            let serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false);

            if (serviceEndpoint.scheme === 'Token') {
                // Using App Store Connect API Key
                isUsingApiKey = true;
                apiKeyFileName = createApiKeyFileName(serviceEndpoint.parameters['apiKeyId']);
                apiKey = {
                    key_id: serviceEndpoint.parameters['apiKeyId'],
                    issuer_id: serviceEndpoint.parameters['apiKeyIssuerId'],
                    key: serviceEndpoint.parameters['apitoken'],
                    in_house: serviceEndpoint.parameters['apiKeyInHouse'] === 'true',
                    is_key_content_base64: true
                };
            } else {
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
            }
        } else if (authType === 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
            isTwoFactorAuthEnabled = tl.getBoolInput('isTwoFactorAuth');
            if (isTwoFactorAuthEnabled) {
                credentials.appSpecificPassword = tl.getInput('appSpecificPassword', true);
                credentials.fastlaneSession = tl.getInput('fastlaneSession', true);
            }
        } else if (authType === 'ApiKey') {
            isUsingApiKey = true;
            apiKeyFileName = createApiKeyFileName(tl.getInput('apiKeyId', true));
            apiKey = {
                key_id: tl.getInput('apiKeyId', true),
                issuer_id: tl.getInput('apiKeyIssuerId', true),
                key: tl.getInput('apitoken', true),
                in_house: tl.getBoolInput('apiKeyInHouse', false),
                is_key_content_base64: true
            };
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
        process.env['FASTLANE_DONT_STORE_PASSWORD'] = 'true';

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

        //Run the deliver command 
        // See https://github.com/fastlane/fastlane/blob/master/deliver/lib/deliver/options.rb for more information on these arguments
        let deliverCommand: ToolRunner = tl.tool('fastlane');
        if (isUsingApiKey) {
            if (fs.existsSync(apiKeyFileName)) {
                fs.unlinkSync(apiKeyFileName);
            }
            let apiKeyJsonData = JSON.stringify(apiKey);
            fs.writeFileSync(apiKeyFileName, apiKeyJsonData);

            // Prechecking in-app purchases is not supported with API key authorization
            console.log(tl.loc('PrecheckInAppPurchasesDisabled'));
            deliverCommand.arg(['deliver', 'submit_build', '--precheck_include_in_app_purchases', 'false', '--api_key_path', apiKeyFileName, '-a', appIdentifier]);
        } else {
            deliverCommand.arg(['deliver', 'submit_build', '-u', credentials.username, '-a', appIdentifier]);
        }
        if (chooseBuild.toLowerCase() === 'specify') {
            deliverCommand.arg(['-n', buildNumber]);
        }
        deliverCommand.arg(['--skip_binary_upload', 'true', '--skip_metadata', 'true', '--skip_screenshots', 'true']);
        deliverCommand.argIf(shouldAutoRelease, '--automatic_release');
        deliverCommand.argIf(teamId, ['-k', teamId]);
        deliverCommand.argIf(teamName, ['--team_name', teamName]);
        deliverCommand.arg('--force');

        //use .line instead of arg/argif to support mulitple parameters input by user
        if (fastlaneArguments) {
            deliverCommand.line(fastlaneArguments);
        }

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
        if (isUsingApiKey && apiKeyFileName && process.env['DEBUG_API_KEY_FILE'] !== 'true') {
            tl.debug('Clearing API Key file');
            if (fs.existsSync(apiKeyFileName)) {
                fs.unlinkSync(apiKeyFileName);
            }
        }
    }
}

run();
