"use strict";

import ENV         from '../env.js';
import T           from '../lib/tool.js';
import MxWcStorage from '../lib/storage.js';
import MxWcConfig  from '../lib/config.js';

async function perform() {
  await migrateOldVersion();
  await migrate();
}

async function migrate() {
  // config
  let config = await MxWcConfig.load();
  config = migrateConfig(config);
  await MxWcStorage.set('config', config);

}

function migrateConfig(config) {
  const version = (config.version || MxWcConfig.defaultVersion);
  const migration = ConfigMigration[version];
  if (migration) {
    return migrateConfig(migration(config));
  } else {
    return config;
  }
}

const ConfigMigration = {};

// 0.0 => 1.0
ConfigMigration['0.0'] = function(config) {
  console.info("Migrating config from 0.0 to 1.0")
  config.version = '1.0';
  return config;
}

// =====================================================

async function migrateOldVersion() {
  await migrateV0134();
  await migrateV0146();
  await migrateV0147();
}

async function migrateV0134(){
  const {version} = ENV;
  if(T.isVersionGteq(version, '0.1.36')) {
    return ;
  }
  const key = 'mx-wc-config-migrated-0.1.34'
  const isMigrated = await MxWcStorage.get(key, false);
  if(isMigrated) {
    console.info(key);
  } else {
    await migrateConfigToV0134();
    await migrateStorageToV0134();
    await MxWcStorage.set(key, true);
  }
}

async function migrateV0146() {
  const {version} = ENV;
  const key = 'mx-wc-config-migrated-0.1.46'
  const isMigrated = await MxWcStorage.get(key, false);
  if(isMigrated) {
    console.info(key);
  } else {
    await migrateConfigToV0146();
    await MxWcStorage.set(key, true);
  }
}

async function migrateV0147() {
  const {version} = ENV;
  const key = 'mx-wc-config-migrated-0.1.47'
  const isMigrated = await MxWcStorage.get(key, false);
  if(isMigrated) {
    console.info(key);
  } else {
    await migrateConfigToV0147();
    await MxWcStorage.set(key, true);
  }
}

async function migrateStorageToV0134() {
  const v = await MxWcStorage.get('downloadFold');
  if (v) {
    await MxWcStorage.set('downloadFolder', v);
  }
}

// in version 0.1.34
// Changed Names
//   clippingHandlerName -> clippingHandler
//   enableSwitchHotkey  -> hotkeySwitchEnabled
//   enableMouseMode     -> mouseModeEnabled
//   titleClippingFolderFormat -> titleStyleClippingFolderFormat
//   saveTitleAsFoldName -> titleStyleClippingFolderEnabled
//
// Changed Values
//
//   assetPath
//     $CLIP-FOLD -> $CLIPPING-PATH
//     $MX-WC -> $STORAGE-PATH
//
//   clippingJsPath
//     $MX-WC -> $STORAGE-PATH
//
//
async function migrateConfigToV0134() {
  const config = await MxWcConfig.load()
  if(config.clippingHandlerName) {
    // config version < 0.1.34
    config.clippingHandler =  T.capitalize(config.clippingHandlerName);
    if(config.clippingHandlerName == 'native-app') {
      config.handlerNativeAppEnabled = true;
    }

    config.hotkeySwitchEnabled = config.enableSwitchHotkey;
    config.mouseModeEnabled = config.enableMouseMode;
    config.titleStyleClippingFolderFormat = config.titleClippingFolderFormat;
    config.titleStyleClippingFolderEnabled = config.saveTitleAsFoldName;

    config.assetPath = config.assetPath.replace('$CLIP-FOLD', '$CLIPPING-PATH').replace('$MX-WC', '$STORAGE-PATH');
    config.clippingJsPath = config.clippingJsPath.replace('$MX-WC', '$STORAGE-PATH');

    await MxWcStorage.set('config', config);
    console.debug("0.1.34 migrate");
  } else {
    // config version >= 0.1.34
  }
}

// in version 0.1.46
//
// New configs
//
//   mainFileName
//     saveTitleAsFilename -> $TITLE
//
//   saveTitleFile
//     saveTitleAsFilename -> false
//     titleStyleClippingFolderEnabled -> false
//     else -> true
//
//   clippingFolderName
//
// Renames
//   assetPath -> assetFolder
//   saveClippingInformation
//     -> htmlSaveClippingInformation
//     -> mdSaveClippingInformation
async function migrateConfigToV0146() {
  const config = await MxWcConfig.load()
  if (config.titleStyleClippingFolderFormat) {
    // version < 0.1.46

    // new attributes (set default value)
    config.mainFileName = 'index.$FORMAT';
    config.saveTitleFile = true;
    config.clippingFolderName = '$YYYY-$MM-$DD-$TIME-INTSEC';

    if (config.saveTitleAsFilename) {
      config.mainFileName = '$TITLE.$FORMAT';
      config.saveTitleFile = false;
    }

    if (config.titleStyleClippingFolderEnabled) {
      config.saveTitleFile = false;
    }

    // clippingFolderName
    let arr = [];
    switch(config.defaultClippingFolderFormat) {
      case '$FORMAT-B':
        arr.push('$YYYY$MM$DD$HH$mm$SS');
        break;
      case '$FORMAT-C':
        arr.push('$TIME-INTSEC')
        break;
      default:
        arr.push('$YYYY-$MM-$DD-$TIME-INTSEC');
    }

    if (config.titleStyleClippingFolderEnabled) {
      if (config.titleClippingFolderFormat === '$FORMAT-B') {
        config.clippingFolderName = '$TITLE';
      } else {
        arr.push('$TITLE');
        config.clippingFolderName = arr.join('-');
      }
    }

    config.assetFolder = config.assetPath;
    config.htmlSaveClippingInformation = config.saveClippingInformation;
    config.mdSaveClippingInformation = config.saveClippingInformation;

    await MxWcStorage.set('config', config);
    console.debug("0.1.46 migrate");

  } else {
    // version >= 0.1.46
  }
}

//
// Fix migration of 0.1.46
//
// fix mainFileName $TITLE => $TITLE.$FORMAT
//
async function migrateConfigToV0147() {
  const config = await MxWcConfig.load();
  if (config.mainFileName === '$TITLE') {
    config.mainFileName = '$TITLE.$FORMAT';
    await MxWcStorage.set('config', config);
  }
  console.debug("0.1.47 migrate");
}

const Migration = { perform: perform }

export default Migration;
