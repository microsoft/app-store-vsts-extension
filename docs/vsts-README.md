# Visual Studio Team Services Extension for the App Store

This extension contains a set of deployment tasks which allow you to automate the release and promotion of app updates to Apple's App Store from your CI environment. This can reduce the effort needed to keep your beta and production deployments up-to-date, since you can simply push changes to the configured source control branches, and let your automated build take care of the rest.

## Prerequisites

* In order to automate the release of app updates to the App Store, you need to have manually released at least one version of the app beforehand.
* The tasks install and use [fastlane](https://github.com/fastlane/fastlane) tools. Fastlane requires Ruby 2.0.0 or above and recommends having the latest Xcode command line tools installed on the MacOS computer. 

## Quick Start

Once you have created or retrieved credentials for your App Store account, then perform the following steps to automate releasing updates from a VSTS build or release definition:

1. Install the App Store extension from the [VSTS Marketplace](https://marketplace.visualstudio.com/items/ms-vsclient.app-store)

2. Go to your Visual Studio Team Services or TFS project, click on the **Build** tab, and create a new build definition (the "+" icon) that is hooked up to your project's appropriate source repo

3. Click **Add build step...** and select the neccessary tasks to generate your release assets (e.g. **Gulp**, **Cordova Build**)

4. Click **Add build step...** and select **App Store Release** from the **Deploy** category

5. Configure the **App Store Release** task with the desired authentication method, the generated IPA file path, and the desired release track.

6. Click the **Queue Build** button or push a change to your configured repo in order to run the newly defined build pipeline

7. Your app changes will now be automatically published to the App Store!

## Configuring Your App Store Publisher Credentials

In addition to specifying your publisher credentials directly within each build task, you can also configure your credentials globally and refer to them within each build or release definition as needed. To do this, perform the following steps:

1. Setup an Apple developer account (https://developer.apple.com/)

2. Go into your Visual Studio Team Services or TFS project and click on the gear icon in the upper right corner

3. Click on the **Services** tab

4. Click on **New Service Endpoint** and select **Apple App Store**

5. Give the new endpoint a name and enter the credentials for the developer account you generated in step#1.

6. Select this endpoint via the name you chose in #5 whenever you add either the **App Store Release** or **App Store Promote** tasks to a build or release definition

## Task Reference

In addition to the custom service endpoint, this extension also contributes the following build and release tasks:

* [App Store Release](#app-store-release) - Allows automating the release of updates to existing iOS TestFlight beta apps or production apps in the App Store.

* [App Store Promote](#app-store-promote) - Allows automating the promotion of a previously submitted app from iTunes Connect to the App Store.

### App Store Release

Allows you to release updates to your iOS TestFlight beta app or production app on the App Store, and includes the following options:

![Release task](/images/release-task-with-advanced.png)

1. **Username and Password** or **Service Endpoint** - The credentials used to authenticate with the App Store. Credentials can be typed in directly or configured via a service endpoint that can be referenced from the task (via the `Service Endpoint` authentication method).

2. **Bundle ID** *(String, Required)* - Unique app identifier (e.g. com.myapp.etc).

3. **Binary Path** *(File path, Required)* - Path to the IPA file you want to publish to the specified track.

#### Release Options

**Track** *(String, Required)* - Release track to publish the binary to (e.g. `TestFlight`  or `Production` ).

##### Release Options for TestFlight track

1. **What to Test?** *(File path)* - Path to the file containing notes on what to test for this release.

2. **Skip Build Processing Wait** *(Checkbox)* - Skip waiting for App Store to finish the build processing.
   
3. **Skip Submission** *(Checkbox)* - Upload a beta app without distributing to the testers.

##### Release Options for Production track

1. **Skip Binary Upload** *(Checkbox)* - Skip binary upload and only update metadata and screenshots.

2. **Upload Metadata** *(Checkbox)* - Upload app metadata to the App Store (e.g. title, description, changelog).

3. **Metadata Path** *(File path)* - Path to the metadata to publish. 

4. **Upload Screenshots** *(Checkbox)* - Upload screenshots of the app to the App Store.

5.  **Screenshots Path** *(File path)* - Path to the screenshots to publish. 

6. **Submit for Review** *(Checkbox)* - Automatically submit the new version for review after the upload is completed.

7. **Release Automatically** *(Checkbox)* - Automatically release the app once it is approved.

#### Advanced Options

1. **Team Id** *(String)* - The ID of the producing team. Only necessary when in multiple teams.

2. **Team Name** *(String)* - The name of the producing team. Only necessary when in multiple teams.

### App Store Promote

Allows you to promote an app previously updated to iTunes Connect to the App Store, and includes the following options:

![Promote task](/images/promote-task-with-advanced.png)

1. **Username and Password** or **Service Endpoint** - The credentials used to authenticate with the App Store. Credentials can be typed in directly or configured via a service endpoint that can be referenced from the task (via the `Service Endpoint` authentication method).

2. **Bundle ID** *(String, required)* - The unique identifier for the app to be promoted.

3. **Choose Build** - `Latest` or `Specify build number`. By default the latest build will be submitted for review. 

4. **Build Number** - Required if `Specify build number` option is selected in #3 above. The build number in iTunes Connect that you wish to submit for review.

4. **Release Automatically** *(Checkbox)* - Check to automatically release the app once the approval process is completed.

#### Advanced Options

1. **Team Id** *(String)* - The ID of the producing team. Only necessary when in multiple teams.

2. **Team Name** *(String)* - The name of the producing team. Only necessary when in multiple teams.

## Contact Us

[Report an issue](https://github.com/Microsoft/app-store-vsts-extension/issues)


Apple and the Apple logo are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc.