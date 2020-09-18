import os = require('os');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import sign = require('./ios-signing-common');

import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';

function findMatchExactlyOne(defaultRoot: string, pattern: string): string {
    let files: Array<string> = tl.findMatch(defaultRoot, pattern);

    if (!files || files.length === 0) {
        throw new Error(tl.loc('NoMatchingFileWithSearchPattern', pattern));
    }

    if (files.length > 1) {
        throw new Error(tl.loc('MultipleFilesFound', pattern));
    }

    return files[0];
}

async function run() {
    let deleteKeychain: boolean = false;
    let useKeychain: string;
    let deleteProvProfile: boolean = false;
    let useProvProfilePath: string;

    try {
        tl.setResourcePath(path.join( __dirname, 'task.json'));

        // Check if this is running on Mac and fail the task if not
        if (os.platform() !== 'darwin') {
            throw new Error(tl.loc('DarwinOnly'));
        }

        // Get input variables
        let ipaPath: string = tl.getPathInput('ipaPath', true, false);

        let signMethod: string = tl.getInput('signMethod', true);
        let signFileP12Path: string;
        let signFileP12Password: string;
        let signIdIdentity: string;
        let signIdUnlockKeychain: boolean = false;
        let signIdKeychainPassword: string;
        if (signMethod === 'file') {
            signFileP12Path = tl.getPathInput('signFileP12Path', true, false);
            // Ensure signFileP12Path is actually a path
            if (!tl.filePathSupplied('signFileP12Path')) {
                throw new Error(tl.loc('P12FilePathNotAPath', signFileP12Path));
            }
            signFileP12Password = tl.getInput('signFileP12Password', true);
        } else if (signMethod === 'id') {
            signIdIdentity = tl.getInput('signIdIdentity', true);
            signIdUnlockKeychain = tl.getBoolInput('signIdUnlockKeychain', false);
            signIdKeychainPassword = tl.getInput('signIdKeychainPassword', false);
        }

        let provisionMethod: string = tl.getInput('provisionMethod', true);
        let provFileProfilePath: string;
        let provFileRemoveProfile: boolean = false;
        let provIdProfileUuid: string;
        if (provisionMethod === 'file') {
            provFileRemoveProfile = tl.getBoolInput('provFileRemoveProfile', false);
            provFileProfilePath = tl.getPathInput('provFileProfilePath', true, false);
            // Ensure provFileProfilePath is actually a path
            if (!tl.filePathSupplied('provFileProfilePath')) {
                throw new Error(tl.loc('ProvisionFilePathNotAPath', provFileProfilePath));
            }
        } else if (provisionMethod === 'id') {
            provIdProfileUuid = tl.getInput('provIdProfileUuid', true);
        }

        let entitlementsPath: string;
        if (tl.filePathSupplied('entitlementsPath')) {
            entitlementsPath = tl.getPathInput('entitlementsPath', false, false);
        }

        let sighResignArgs: string = tl.getInput('sighResignArgs', false);
        let cwdPath: string = tl.getInput('cwdPath', false);

        // Process working directory
        let cwd: string = cwdPath
            || tl.getVariable('build.sourceDirectory')
            || tl.getVariable('build.sourcesDirectory')
            || tl.getVariable('System.DefaultWorkingDirectory');
        tl.cd(cwd);
        tl.debug('cwd = ' + cwd);

        // Find the absolute ipa file path
        let useIpaPath: string = findMatchExactlyOne(cwd, ipaPath);

        // Determine the params used when resigning based on sign method.
        let useSigningIdentity = null;

        if (signMethod === 'file') {
            let signFilePath: string = findMatchExactlyOne(cwd, signFileP12Path);
            let keychain: string = tl.resolve(cwd, '_iparesigntasktmp.keychain');
            let keychainPwd: string = '_iparesigntask_TmpKeychain_Pwd#1';

            // Create a temporary keychain and install the p12 into that keychain
            tl.debug('installed cert in temp keychain');
            await sign.installCertInTemporaryKeychain(keychain, keychainPwd, signFilePath, signFileP12Password);

            useKeychain = keychain;
            deleteKeychain = true;
            useSigningIdentity = await sign.findSigningIdentity(keychain);
        } else if (signMethod === 'id') {
            let defaultKeychain: string = await sign.getDefaultKeychainPath();

            if (signIdUnlockKeychain) {
                await sign.unlockKeychain(defaultKeychain, signIdKeychainPassword);
            }

            useKeychain = defaultKeychain;
            useSigningIdentity = signIdIdentity;
        }

        // Determine the params used when resigning based on provision method.
        if (provisionMethod === 'file') {
            useProvProfilePath = findMatchExactlyOne(cwd, provFileProfilePath);
            deleteProvProfile = provFileRemoveProfile;
        } else if (provisionMethod === 'id') {
            // Gets the provisioning profile from the default path by uuid (~/Library/MobileDevice/Provisioning Profiles).
            useProvProfilePath = sign.getProvisioningProfilePath(provIdProfileUuid);
        }

        // Find the absolute entitlements file path.
        let useEntitlementsFilePath: string;
        if (entitlementsPath) {
            useEntitlementsFilePath = findMatchExactlyOne(cwd, entitlementsPath);
        }

        // Having all the params ready configure the environment and exec fastlane sigh resign.
        // Set up environment
        tl.debug(`GEM_CACHE=${process.env['GEM_CACHE']}`);
        let gemCache: string = process.env['GEM_CACHE'] || path.join(process.env['HOME'], '.gem-cache');
        tl.debug(`gemCache=${gemCache}`);
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_DISABLE_COLORS'] = 'true';

        // Add bin of new gem home so we don't ahve to resolve it later;
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        let installFastlane: boolean = tl.getBoolInput('installFastlane', false);
        let fastlaneVersionChoice: string = tl.getInput('fastlaneToolsVersion', false);
        let fastlaneVersionToInstall: string;  //defaults to 'LatestVersion'
        if (fastlaneVersionChoice === 'SpecificVersion') {
            fastlaneVersionToInstall = tl.getInput('fastlaneToolsSpecificVersion', true);
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

        // Run the sigh command 
        // See https://github.com/fastlane/fastlane/tree/master/sigh for more information on these arguments
        let sighCommand: ToolRunner = tl.tool('fastlane');
        sighCommand.arg(['sigh']);
        sighCommand.arg(['resign', useIpaPath]);
        sighCommand.arg(['--keychain_path', useKeychain]);
        sighCommand.arg(['--signing_identity', useSigningIdentity]);
        sighCommand.arg(['--provisioning_profile', useProvProfilePath]);

        sighCommand.argIf(useEntitlementsFilePath, ['--entitlements', useEntitlementsFilePath]);

        if (sighResignArgs) {
            sighCommand.line(sighResignArgs);
        }

        await sighCommand.exec();

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('SuccessfullyResigned', useIpaPath));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    } finally {
        // Clean up the temporary keychain, so it is not used to search for code signing identity in the future.
        if (deleteKeychain) {
            try {
                await sign.deleteKeychain(useKeychain);
            } catch (err) {
                tl.debug('Failed to delete temporary keychain. Error = ' + err);
                tl.warning(tl.loc('FailedTemporaryKeyDeletion', useKeychain));
            }
        }

        // Delete provisioning profile if specified
        if (deleteProvProfile) {
            try {
                await sign.deleteProvisioningProfile(useProvProfilePath);
            } catch (err) {
                tl.debug('Failed to delete provisioning profile. Error = ' + err);
                tl.warning(tl.loc('FailedProvisioningProfileDeletion', useProvProfilePath));
            }
        }
    }
}

run();
