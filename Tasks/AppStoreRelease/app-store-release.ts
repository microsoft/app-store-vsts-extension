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

class UserCredentials {
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
    // We need to allow broken symlinks since there could be broken symlinks found in build output folder, but filtered by ipaPath pattern
    const findOptions: tl.FindOptions = {
        allowBrokenSymbolicLinks: true,
        followSymbolicLinks: true,
        followSpecifiedSymbolicLink: true
    };

    const paths: string[] = tl.findMatch('', ipaPath, findOptions);
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
    let apiKeyFilePath: string;
    let isTwoFactorAuthEnabled: boolean = false;
    let isUsingApiKey: boolean = false;
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        // Check if this is running on Mac and fail the task if not
        if (os.platform() !== 'darwin') {
            throw new Error(tl.loc('DarwinOnly'));
        }

        // Get input variables
        let authType: string = tl.getInput('authType', true);
        let credentials: UserCredentials = new UserCredentials();
        let apiKey: ApiKey;

        const createapiKeyFilePath = (apiKeyId: string) => {
            const tempPath =  tl.getVariable('Agent.TempDirectory') || tl.getVariable('Agent.BuildDirectory');
            return path.join(tempPath, `api_key${apiKeyId}.json`);
        };

        if (authType === 'ServiceEndpoint') {
            let serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(tl.getInput('serviceEndpoint', true), false);

            if (serviceEndpoint.scheme === 'Token') {
                // Using App Store Connect API Key
                isUsingApiKey = true;
                apiKeyFilePath = createapiKeyFilePath(serviceEndpoint.parameters['apiKeyId']);
                apiKey = {
                    key_id: serviceEndpoint.parameters['apiKeyId'],
                    issuer_id: serviceEndpoint.parameters['apiKeyIssuerId'],
                    key: serviceEndpoint.parameters['apitoken'],
                    in_house: serviceEndpoint.parameters['apiKeyInHouse'] === 'apiKeyInHouse_true',
                    is_key_content_base64: true
                };
            } else {
                credentials.username = serviceEndpoint.parameters['username'];
                credentials.password = serviceEndpoint.parameters['password'];
                credentials.appSpecificPassword = serviceEndpoint.parameters['appSpecificPassword'];
                if (credentials.appSpecificPassword) {
                    isTwoFactorAuthEnabled = true;
                    let fastlaneSession: string = serviceEndpoint.parameters['fastlaneSession'];
                    if (fastlaneSession) {
                        credentials.fastlaneSession = fastlaneSession;
                    }
                }
            }
        } else if (authType === 'UserAndPass') {
            credentials.username = tl.getInput('username', true);
            credentials.password = tl.getInput('password', true);
            isTwoFactorAuthEnabled = tl.getBoolInput('isTwoFactorAuth');
            if (isTwoFactorAuthEnabled) {
                credentials.appSpecificPassword = tl.getInput('appSpecificPassword', true);
                credentials.fastlaneSession = tl.getInput('fastlaneSession', false);
            }
        } else if (authType === 'ApiKey') {
            isUsingApiKey = true;
            apiKeyFilePath = createapiKeyFilePath(tl.getInput('apiKeyId', true));
            apiKey = {
                key_id: tl.getInput('apiKeyId', true),
                issuer_id: tl.getInput('apiKeyIssuerId', true),
                key: tl.getInput('apitoken', true),
                in_house: tl.getBoolInput('apiKeyInHouse', false),
                is_key_content_base64: true
            };
        }

        let filePath: string = tl.getInput('ipaPath', false);
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
        let distributeOnly: boolean = tl.getBoolInput('distributeOnly', false);
        let appBuildNumber: string = tl.getInput('appBuildNumber', false);
        const appSpecificId: string = tl.getInput('appSpecificId', false);

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
            if (credentials.fastlaneSession) {
                process.env[fastlaneSessionEnvVar] = credentials.fastlaneSession;
            } else {
                if (!appSpecificId) {
                    tl.warning(tl.loc('SessionAndAppIdNotSet'));
                }
                if (!shouldSkipWaitingForProcessing) {
                    tl.warning(tl.loc('ShouldSkipWaitingForProcessingNotTrue'));
                }
            }
            process.env[appSpecificPasswordEnvVar] = credentials.appSpecificPassword;

        }

        // Add bin of new gem home so we don't have to resolve it later
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        if (!skipBinaryUpload && !distributeOnly) {
            if (!filePath) {
                throw new Error(tl.loc('IpaPathNotSpecified'));
            }
            // Ensure there's exactly one ipa before installing fastlane tools
            filePath = findIpa(filePath);
        }

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

        if (isUsingApiKey) {
            if (fs.existsSync(apiKeyFilePath)) {
                fs.unlinkSync(apiKeyFilePath);
            }
            let apiKeyJsonData = JSON.stringify(apiKey);
            fs.writeFileSync(apiKeyFilePath, apiKeyJsonData);
        }

        //gem update fastlane -i ~/.gem-cache
        if (releaseTrack === 'TestFlight') {
            // Run pilot (via fastlane) to upload to testflight
            // See https://github.com/fastlane/fastlane/blob/master/pilot/lib/pilot/options.rb for more information on these arguments
            let pilotCommand: ToolRunner = tl.tool('fastlane');
            let externalTestersGroups: string = tl.getInput('externalTestersGroups');
            let authArgs: string[];
            if (isUsingApiKey) {
                authArgs = ['--api_key_path', apiKeyFilePath];
            } else {
                authArgs = ['-u', credentials.username];
            }
            if (distributeOnly) {
                let bundleIdentifier: string = tl.getInput('appIdentifier', true);
                pilotCommand.arg(['pilot', 'distribute', ...authArgs]);
                pilotCommand.argIf(appBuildNumber, ['--build_number', appBuildNumber]);
                pilotCommand.argIf(bundleIdentifier, ['-a', bundleIdentifier]);
                pilotCommand.argIf(externalTestersGroups, ['--groups', externalTestersGroups]);
            } else {
                let bundleIdentifier: string = tl.getInput('appIdentifier', false);
                pilotCommand.arg(['pilot', 'upload', ...authArgs]);
                pilotCommand.arg(['-i', filePath]);
                let usingReleaseNotes: boolean = isValidFilePath(releaseNotes);
                if (usingReleaseNotes) {
                    if (!credentials.fastlaneSession) {
                        tl.warning(tl.loc('ReleaseNotesRequiresFastlaneSession'));
                    }

                    pilotCommand.arg(['--changelog', fs.readFileSync(releaseNotes).toString()]);
                }
                pilotCommand.argIf(teamId, ['-q', teamId]);
                pilotCommand.argIf(teamName, ['-r', teamName]);
                pilotCommand.argIf(bundleIdentifier, ['-a', bundleIdentifier]);
                pilotCommand.argIf(shouldSkipSubmission, ['--skip_submission', 'true']);
                pilotCommand.argIf(shouldSkipWaitingForProcessing, ['--skip_waiting_for_build_processing', 'true']);
                pilotCommand.argIf(appSpecificId, ['-p', appSpecificId]);

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

                    pilotCommand.argIf(externalTestersGroups, ['--groups', externalTestersGroups]);
                }
            }

            //Sets -m depending if app submission is for (ios) iOS, (appletvos) tvOS or (osx) MacOS https://github.com/fastlane/fastlane/blob/326bc64483479107699376280b00aa5f5eef40f8/pilot/lib/pilot/options.rb#L46
            switch (applicationType.toLocaleLowerCase()) {
                case 'macos':
                    pilotCommand.arg(['-m', 'osx']); //Fastlane wants arg as OSX
                    break;

                case 'ios':
                    pilotCommand.arg(['-m', 'ios']);
                    break;

                case 'tvos':
                    pilotCommand.arg(['-m', 'appletvos']);
                    break;

                default:
                    throw new Error(tl.loc('NotValidAppType', applicationType));
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
            if (isUsingApiKey) {
                // Prechecking in-app purchases is not supported with API key authorization
                console.log(tl.loc('PrecheckInAppPurchasesDisabled'));
                deliverCommand.arg(['deliver', '--force', '--precheck_include_in_app_purchases', 'false', '--api_key_path', apiKeyFilePath, '-a', bundleIdentifier]);
            } else {
                deliverCommand.arg(['deliver', '--force', '-u', credentials.username, '-a', bundleIdentifier]);
            }
            deliverCommand.argIf(skipBinaryUpload, ['--skip_binary_upload', 'true']);

            //Sets -i or -c depending if app submission is for (-i) iOS/tvOS or (-c) MacOS
            switch (applicationType.toLocaleLowerCase()) {
                case 'macos':
                    // Use the -C flag for apps
                    if (!skipBinaryUpload) {
                        deliverCommand.arg(['-c', filePath]);
                    }
                    deliverCommand.arg(['-j', 'osx']); //Fastlane wants arg as OSX
                    break;

                case 'ios':
                    //Use the -I flag for ipa's
                    if (!skipBinaryUpload) {
                        deliverCommand.arg(['-i', filePath]);
                    }
                    deliverCommand.arg(['-j', 'ios']);
                    break;

                case 'tvos':
                    //Use the -I flag for ipa's
                    if (!skipBinaryUpload) {
                        deliverCommand.arg(['-i', filePath]);
                    }
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
            if (shouldAutoRelease) {
                deliverCommand.arg(['--automatic_release', 'true']);
            } else {
                deliverCommand.arg(['--automatic_release', 'false']);
            }

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
        if (isUsingApiKey && apiKeyFilePath && process.env['DEBUG_API_KEY_FILE'] !== 'true') {
            tl.debug('Clearing API Key file');
            if (fs.existsSync(apiKeyFilePath)) {
                fs.unlinkSync(apiKeyFilePath);
            }
        }
    }
}

run();
