![Build Status](https://mseng.visualstudio.com/_apis/public/build/definitions/b924d696-3eae-4116-8443-9a18392d8544/4518/badge)

# Azure DevOps Extension for the Apple App Store

This extension contains a set of deployment tasks which allow you to automate the release and promotion of app updates to Apple's App Store from your CI environment. This can reduce the effort needed to keep your beta and production deployments up-to-date, since you can simply push changes to the configured source control branches, and let your automated build take care of the rest.

## Prerequisites

* In order to automate the release of app updates to the App Store, you need to have manually released at least one version of the app beforehand.
* The tasks install and use [fastlane](https://github.com/fastlane/fastlane) tools. fastlane requires Ruby 2.0.0 or above and recommends having the latest Xcode command line tools installed on the MacOS computer.

## Quick Start

Once you have created or retrieved credentials for your App Store account, perform the following steps to automate releasing updates from an Azure DevOps build or release pipeline:

1. Install the App Store extension from the [Azure DevOps Marketplace](https://marketplace.visualstudio.com/items/ms-vsclient.app-store).

2. Go to your Azure DevOps or TFS project, click on the **Pipelines** tab, and create a new pipeline (the "+" icon) that is hooked up to your project's appropriate source repository.

3. Click **Add build step...** and select the necessary tasks to generate your release assets (e.g. **Gulp**, **Cordova Build**).

4. Click **Add build step...** and select **App Store Release** from the **Deploy** category.

5. Configure the **App Store Release** task with the desired authentication method, the generated IPA file path, and the desired release track.

6. Click the **Queue Build** button or push a change to your configured repository in order to run the newly defined build.

7. Your app changes will now be automatically published to the App Store!

## Configuring Your App Store Publisher Credentials

In addition to specifying your publisher credentials directly within each build task, you can also configure your credentials globally and refer to them within each build or release pipeline as needed. To do this, perform the following steps:

1. Setup an Apple developer account (https://developer.apple.com/).

2. Go into your Azure DevOps or TFS project and click on the gear icon in the lower left corner.

3. Click on the **Service Connections** tab.

4. Click on **New service connection** and select **Apple App Store**.

5. Choose either **Basic authentication** if you want to use your App Store email, password, app-specific password and fastlane session or **Token based authentication** in case you want to use Apple Api key.

6. Give the new connection a name and enter the credentials.

7. Select this connection using the name you chose in the previous step whenever you add either the **App Store Release** or **App Store Promote** tasks to a build or release pipeline.

### Two-Factor Authentication

You can skip this step if you use **Token based authentication**

Apple authentication is region specific, and Microsoft-hosted agents may not be in the same region as your developer machine. Instead, we recommend that you create a separate Apple ID with a strong password and restricted access.  See [this](https://docs.fastlane.tools/best-practices/continuous-integration/#separate-apple-id-for-ci) link for more details.

To use two-factor authentication, you need to setup the `Fastlane Session` variable on the Apple App Store service connection.

1. Create the fastlane session token by following these [instructions](https://docs.fastlane.tools/best-practices/continuous-integration/#use-of-application-specific-passwords-and-spaceauth).

2. Set this value on the Apple App Store service connection.

#### Use of application specific apple id
If you want to upload apps to TestFlight without triggering two-factor authentication, you need to set up the App specific apple Id. This value should be taken from Apple ID property in the App Information section in App Store Connect (number).
The following conditions are required:
1. Application specific apple id should be provided (number)
2. shouldSkipWaitingForProcessing: true
3. isTwoFactorAuth: true (for service connection - you don't need to specify it if app specific password is specified)
4. releaseNotes shouldn't be specified


## Task Reference

In addition to the custom service connection, this extension also contributes the following build and release tasks:

* [App Store Release](#app-store-release) - Allows automating the release of updates to existing iOS TestFlight beta apps or production apps in the App Store.

* [App Store Promote](#app-store-promote) - Allows automating the promotion of a previously submitted app from iTunes Connect to the App Store.

### App Store Release

Allows you to release updates to your iOS TestFlight beta app or production app on the App Store, and includes the following options:

![Release task](/images/release-task-with-advanced.png)

1. **Authentication method** - What type of credentials will be used to authenticate with the App Store. Credentials can be provided directly (using `App Store Connect Api Key` or `Username and Password` options) or configured via a service connection that can be referenced from the task (via the `Service Connection` authentication method).

2. **App Store Connect API Key ID, Issuer ID and Key Content (base64-encoded)** *(String, required if authentication method is `App Store Connect Api Key`)* - The API key data used to authenticate with the App Store. Key content has to be base64-encoded.

3. **App Store Connect API Key In House** *(Checkbox, required if authentication method is `App Store Connect Api Key`)* - Whether the account used to publish to the Apple App Store is an Enterprise account or not.

4. **Service connection** - Available only if authentication method is `Service Connection`. The creation of the service connection is explained in [this section](#configuring-your-app-store-publisher-credentials).

5. **Email and Password** *(String, required if authentication method is `Username and Password`)* - Specify your Apple ID Developer account email and password here.

#### Release Options

**Track** *(String, Required)* - Release track to publish the binary to (e.g. `TestFlight`  or `Production` ).
##### Common Release Options (Available for TestFlight and Production track)

1. **Bundle ID** *(String)* - Unique app identifier (e.g. com.myapp.etc).  The **Bundle ID** is only required if "Track" is *Production* or "Distribute a previously uploaded binary" is selected.

2. **Application Type** *(iOS, tvOS, macOS)* - The type of application you wish to submit.

3. **Binary Path** *(File path, Required)* - Path to the IPA file you want to publish to the specified track.  A glob pattern can be used but it must resolve to exactly one IPA file.

##### Release Options for TestFlight track

**Distribute a previously uploaded binary to External Testers** *(Checkbox)* - (Disabled by default) Distribute a previously uploaded binary to Apple TestFlight. Select this if you want to distribute a version of a build that already exists in App Store Connect. Otherwise, your IPA file specified in *Binary Path* input will be uploaded.

1. **What to Test?** *(File path)* - Path to the file containing notes on what to test for this release.

2. **App Specific Apple Id** *(String)* - App specific apple Id allows you to upload applications to a TestFlight track without triggering 2FA. This value should be taken from Apple ID property in the App Information section in App Store Connect.

3. **Skip Build Processing Wait** *(Checkbox)* - Skip waiting for App Store to finish the build processing.

4. **Skip Submission** *(Checkbox)* - Upload a beta app without distributing to testers.

5. **Distribute to External Testers** *(Checkbox)* - Select to distribute the build to external testers (cannot be used with 'Skip Build Processing Wait' and 'Skip Submission').  Using this option requires setting release notes in 'What to Test?'.

6. **Groups** *(String)* - Optionally specify the group(s) of external testers this build should be distributed to. All testers in these groups will have access to this build. To specify multiple groups, separate group names by commas e.g. 'External Beta Testers,TestVendors'. If not specified the default 'External Testers' is used.

###### If *"Distribute a previously uploaded binary to External Testers"* is selected

1. **Build Number** *(String)* - The build number of the application build to distribute. If the build number is not specified, the most recent build is distributed.

2. **Groups** *(String)* - Optionally specify the group(s) of external testers this build should be distributed to. All testers in these groups will have access to this build. To specify multiple groups, separate group names by commas e.g. 'External Beta Testers,TestVendors'. If not specified the default 'External Testers' is used.

##### Release Options for Production track

1. **Skip Binary Upload** *(Checkbox)* - Skip binary upload and only update metadata and screenshots. Please note that with enabling this option you also need to pass --description or --pkg as additional fastlane parameters.

2. **Upload Metadata** *(Checkbox)* - Upload app metadata to the App Store (e.g. title, description, changelog).

3. **Metadata Path** *(File path)* - Path to the metadata to publish.

4. **Upload Screenshots** *(Checkbox)* - Upload screenshots of the app to the App Store.

5.  **Screenshots Path** *(File path)* - Path to the screenshots to publish.

6. **Submit for Review** *(Checkbox)* - Automatically submit the new version for review after the upload is completed.

7. **Release Automatically** *(Checkbox)* - Automatically release the app once it is approved.

#### Advanced Options

1. **Team Id** *(String)* - The ID of the producing team. Only necessary when in multiple teams.

2. **Team Name** *(String)* - The name of the producing team. Only necessary when in multiple teams.

3. **Install fastlane** *(Checkbox)* - By default, install a version of the [fastlane](https://github.com/fastlane/fastlane) tools.  Uncheck if your build machine already has the version of fastlane to use.

4. **fastlane Version** - **Latest Version** or **Specific Version**.  If *Specific Version* is chosen, you must provide a value for *fastlane Specific Version*.

5. **fastlane Specific Version** *(String)* - The version of fastlane to install (e.g., 2.15.1).

6. **Additional fastlane arguments** *(String)* - Any additional arguments to pass to the fastlane command.

#### Upload without triggering 2FA - when 2FA is enabled for account

To upload an app without triggering 2FA for App Store Release task the following conditions are required:

- Apple id should be provided (-p "your apple id" in fastlaneArguments input). Please note that there should be app specific apple id in a numeric format (you can take it as a value of Apple ID property in the App Information section in App Store Connect)
- 'shouldSkipWaitingForProcessing' should be set to 'true'
 - 'isTwoFactorAuth' should be set to 'true' (for user and password authentication; for service connection - app specific password should be provided)
 - 'releaseNotes' should be empty

Example of using task without triggering 2FA (for account with 2FA enabled):
```
- task: AppStoreRelease@1
  inputs:
    authType: 'UserAndPass'
    username: '$(fastLane.auth.userName)'
    password: '$(fastLane.auth.password)'
    isTwoFactorAuth: true
    appSpecificPassword: '$(fastLane.auth.appPassword)'
    fastlaneSession: '$(fastLane.auth.session)'
    appIdentifier: '$(fastLane.auth.bundleID)'
    appType: 'iOS'
    ipaPath: '**/*.ipa'
    releaseTrack: 'TestFlight'
    shouldSkipWaitingForProcessing: true
    appSpecificId: '1234567890'
```

### App Store Promote

Allows you to promote an app previously updated to iTunes Connect to the App Store, and includes the following options:

![Promote task](/images/promote-task-with-advanced.png)

1. **Authentication method** - What type of credentials will be used to authenticate with the App Store. Credentials can be provided directly (using `App Store Connect Api Key` or `Username and Password` options) or configured via a service connection that can be referenced from the task (via the `Service Connection` authentication method).

2. **App Store Connect API Key ID, Issuer ID and Key Content (base64-encoded)** *(String, required if authentication method is `App Store Connect Api Key`)* - The API key data used to authenticate with the App Store. Key content has to be base64-encoded.

3. **App Store Connect API Key In House** *(Checkbox, required if authentication method is `App Store Connect Api Key`)* - Whether the account used to publish to the Apple App Store is an Enterprise account or not.

4. **Service connection** - Available only if authentication method is `Service Connection`. The creation of the service connection is explained in [this section](#configuring-your-app-store-publisher-credentials).

5. **Email and Password** *(String, required if authentication method is `Username and Password`)* - Specify your Apple ID Developer account email and password here.

6. **Bundle ID** *(String, required)* - The unique identifier for the app to be promoted.

7. **Choose Build** - `Latest` or `Specify build number`. By default the latest build will be submitted for review.

8. **Build Number** - Required if `Specify build number` option is selected in **Choose Build** above. The build number in iTunes Connect that you wish to submit for review.

9. **Release Automatically** *(Checkbox)* - Check to automatically release the app once the approval process is completed.

#### Advanced Options

1. **Team Id** *(String)* - The ID of the producing team. Only necessary when in multiple teams.

2. **Team Name** *(String)* - The name of the producing team. Only necessary when in multiple teams.

3. **Install fastlane** *(Checkbox)* - By default, install a version of the [fastlane](https://github.com/fastlane/fastlane) tools.  Uncheck if your build machine already has the version of fastlane to use.

4. **fastlane Version** - **Latest Version** or **Specific Version**.  If *Specific Version* is chosen, you must provide a value for *fastlane Specific Version*.

5. **fastlane Specific Version** *(String)* - The version of fastlane to install (e.g., 2.15.1).  If a specific version of fastlane is installed, all previously installed versions will be uninstalled beforehand.

6. **Additional fastlane arguments** *(String)* - Any additional arguments to pass to the fastlane command.

## Firewall Issues

The [fastlane](https://github.com/fastlane/fastlane) tools use the iTunes Transporter to upload metadata and binaries. In case you are behind a firewall, you can specify a different transporter protocol injecting in your release pipeline a variable:
`DELIVER_ITMSTRANSPORTER_ADDITIONAL_UPLOAD_PARAMETERS="-t DAV"`
![Fix Firewall issues](/images/variable-definition-firewall-issues.png)

## Support
Support for this extension is provided on our [GitHub Issue Tracker](https://github.com/Microsoft/app-store-vsts-extension/issues).  You
can submit a [bug report](https://github.com/Microsoft/app-store-vsts-extension/issues/new), a [feature request](https://github.com/Microsoft/app-store-vsts-extension/issues/new)
or participate in [discussions](https://github.com/Microsoft/app-store-vsts-extension/issues).

Apple and the Apple logo are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc.
