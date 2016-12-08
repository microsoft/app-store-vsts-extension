import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');
import sign = require('./node_modules/Agent.Tasks/Tasks/Common/ios-signing-common/ios-signing-common');
import util = require('./node_modules/Agent.Tasks/Tasks/Common/find-files-legacy/findfiles.legacy');
import {ToolRunner} from 'vsts-task-lib/toolrunner';

var userProvisioningProfilesPath = tl.resolve(tl.getVariable('HOME'), 'Library', 'MobileDevice', 'Provisioning Profiles');

function getProvisioningProfilePath(uuid: string) : string {
    return tl.resolve(userProvisioningProfilesPath, uuid.trim().concat('.mobileprovision'));
}

async function run() {
    try {
    	// Check if this is running on Mac and fail the task if not
        if(os.platform() !== 'darwin') {
            throw 'The IPA Resign task can only run on a Mac computer.';
        }

        // Get input variables
        var ipaPath = tl.getPathInput('ipaPath', true, false);
        
        var signMethod:string = tl.getInput('signMethod', true);
        if (signMethod === 'file') {
            var signFileP12Path = tl.getPathInput('signFileP12Path', false, true);
            var signFileP12Password: string = tl.getInput("signFileP12Password", true);
        } else if (signMethod == 'id') {
            var signIdIdentity: string = tl.getInput("signIdIdentity", true);
            var signIdUnlockKeychain: boolean = tl.getBoolInput("signIdUnlockKeychain", false);
            var signIdKeychainPassword: string = tl.getInput("signIdKeychainPassword", false);
        }

        var provisionMethod:string = tl.getInput('provisionMethod', true);
        if (provisionMethod === 'file') {
            var provFileProfilePath = tl.getPathInput('provFileProfilePath', false, true);
            var provFileRemoveProfile: boolean = tl.getBoolInput("provFileRemoveProfile", false);
        } else if (provisionMethod == 'id') {
            var provIdProfileUuid: string = tl.getInput("provIdProfileUuid", true);
        }

        var sighResignArgs:string = tl.getInput('sighResignArgs', false);
        var cwd = tl.getInput('cwdPath', false);

        // Process working directory
        var cwd = cwd
            || tl.getVariable('build.sourceDirectory')
            || tl.getVariable('build.sourcesDirectory')
            || tl.getVariable('System.DefaultWorkingDirectory');
        tl.cd(cwd);

        // Find the IPA file
        var ipaFiles :Array<string> = util.findFiles(ipaPath, false);

        // Fail if multiple matching files were found
        if (ipaFiles.length > 1) {
            throw new Error("Multiple matching files were found with search pattern: " + ipaPath + ". Only one ipa can be resigned at a time.");
        }

        var ipaFilePath = ipaFiles[0];
        
        // Determine the params used when resigning based on sign method.
        var useKeychain:string;
        var deleteKeychain:boolean;
        var useSigningIdentity = null;

        if (signMethod === 'file') {
            signFileP12Path = tl.resolve(cwd, signFileP12Path);
            tl.debug('cwd = ' + cwd);
            var keychain:string = tl.resolve(cwd, '_iparesigntasktmp.keychain');
            var keychainPwd:string = '_iparesigntask_TmpKeychain_Pwd#1';
            
            // Create a temporary keychain and install the p12 into that keychain
            tl.debug('installed cert in temp keychain');
            await sign.installCertInTemporaryKeychain(keychain, keychainPwd, signFileP12Path, signFileP12Password);

            useKeychain = keychain;
            deleteKeychain = true;
            useSigningIdentity = await sign.findSigningIdentity(keychain);
        } else if (signMethod === 'id') {
            var defaultKeychain:string = await sign.getDefaultKeychainPath();

            if (signIdUnlockKeychain) {
                await sign.unlockKeychain(defaultKeychain, signIdKeychainPassword);
            }

            useKeychain = defaultKeychain;
            useSigningIdentity = signIdIdentity;
        }

        // Determine the params used when resigning based on provision method.
        var useProvProfilePath:string;
        var deleteProvProfile:boolean;

        if (provisionMethod === 'file') {
            useProvProfilePath = provFileProfilePath;
            deleteProvProfile = provFileRemoveProfile;
        } else if (provisionMethod === 'id') {
            // Gets the provisioning profile from the default path by uuid (~/Library/MobileDevice/Provisioning Profiles). 
            useProvProfilePath = getProvisioningProfilePath(provIdProfileUuid);
        }

        // Having all the params ready configure the environment and exec fastlane sigh resign.
        // Set up environment
        var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_DISABLE_COLORS'] = true;

        // Add bin of new gem home so we don't ahve to resolve it later;
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        // Install the ruby gem for fastlane sigh
        tl.debug('Checking for ruby install...');
        tl.which('ruby', true);
        var installSigh: ToolRunner = tl.tool(tl.which('gem', true));
        installSigh.arg(['install', 'sigh']);
        await installSigh.exec();

        // Run the sigh command 
        // See https://github.com/fastlane/fastlane/tree/master/sigh for more information on these arguments
        var sighCommand : ToolRunner = tl.tool('sigh');
        sighCommand.arg(['resign', ipaFilePath]);
        sighCommand.arg(['--keychain_path', useKeychain]);
        sighCommand.arg(['--signing_identity', useSigningIdentity]);
        sighCommand.arg(['--provisioning_profile', useProvProfilePath]);

        if (sighResignArgs) {
            sighCommand.line(sighResignArgs);
        }

        await sighCommand.exec();

        // Done
        tl.setResult(tl.TaskResult.Succeeded, 'Successfully resigned ipa ' + ipaFilePath);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    } finally {
        // Clean up the temporary keychain, so it is not used to search for code signing identity in the future.
        if (deleteKeychain) {
            try {
                await sign.deleteKeychain(useKeychain);
            } catch (err) {
                tl.debug('Failed to delete temporary keychain. Error = ' + err);
                tl.warning('Failed to delete temporary keychain created during the resign process. ' + useKeychain);
            }
        }

        // Delete provisioning profile if specified
        if (deleteProvProfile) {
            try {
                await sign.deleteProvisioningProfile(useProvProfilePath);
            } catch (err) {
                tl.debug('Failed to delete provisioning profile. Error = ' + err);
                tl.warning('Failed to delete the provisioning profile ' + useProvProfilePath);
            }
        }
    }
}

run();
