

cordova.plugins.diagnostic.getPermissionAuthorizationStatus(function (status) {
  console.log(status);
  switch (status) {
    case cordova.plugins.diagnostic.runtimePermissionStatus.GRANTED:

      break;
    case cordova.plugins.diagnostic.runtimePermissionStatus.NOT_REQUESTED:
      setPermission();
      break;
    case cordova.plugins.diagnostic.runtimePermissionStatus.DENIED:
      setPermission();
      break;
    case cordova.plugins.diagnostic.runtimePermissionStatus.DENIED_ALWAYS:
      setPermission();
      break;
  }
}, this.errorCallback, cordova.plugins.diagnostic.runtimePermission.CAMERA);

function setPermission() {
  cordova.plugins.diagnostic.requestCameraAuthorization(function (status) {
    switch (status) {
      case cordova.plugins.diagnostic.permissionStatus.NOT_REQUESTED:
        break;
      case cordova.plugins.diagnostic.permissionStatus.DENIED:
        break;
      case cordova.plugins.diagnostic.permissionStatus.GRANTED:
        //TODO : Call native plugin.
        break;
      case cordova.plugins.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE:
        break;
    }
  }, function (error) { }, cordova.plugins.diagnostic.locationAuthorizationMode.ALWAYS);
}
