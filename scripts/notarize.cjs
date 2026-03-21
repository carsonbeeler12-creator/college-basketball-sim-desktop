const { notarize } = require('@electron/notarize');

module.exports = async function notarizeApp(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  const requireNotarization = process.env.REQUIRE_MAC_NOTARIZATION === 'true';

  if (!appleId || !appleIdPassword || !teamId) {
    const message =
      'Skipping macOS notarization because APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID is missing.';

    if (requireNotarization) {
      throw new Error(
        `${message} REQUIRE_MAC_NOTARIZATION=true is set, so this build cannot continue unsigned.`
      );
    }

    console.warn(message);
    return;
  }

  await notarize({
    appBundleId: packager.appInfo.id,
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
    teamId,
  });
};
