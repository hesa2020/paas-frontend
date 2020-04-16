import { IAppDef } from "../containers/apps/AppDefinition";
import { IAgentDefinition } from "../models/IAgentDefinition";
import { IRegistryInfo } from "../models/IRegistryInfo";
import { IVersionInfo } from "../models/IVersionInfo";
import Logger from "../utils/Logger";
import StorageHelper from "../utils/StorageHelper";
import HttpClient from "./HttpClient";
import ErrorFactory from "../utils/ErrorFactory";

const BASE_DOMAIN = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL
  : "";
const URL = BASE_DOMAIN + "/api/v2";
Logger.dev("API URL: " + URL);

export default class ApiManager {
  private static lastKnownPassword: string = "";
  private static authToken = StorageHelper.getAuthKeyFromStorage() || "";

  private http: HttpClient;

  constructor() {
    const self = this;
    this.http = new HttpClient(URL, function() {
      if (!ApiManager.lastKnownPassword) {
        return Promise.reject(
          new Error("No saved password. Ignore if initial call.")
        );
      }
      return self.getAuthToken(ApiManager.lastKnownPassword);
    });
    this.http.setAuthToken(ApiManager.authToken);
  }

  getApiBaseUrl() {
    return URL;
  }

  destroy() {
    this.http.destroy();
  }

  static getAuthTokenString() {
    return ApiManager.authToken;
  }

  setAuthToken(authToken: string) {
    ApiManager.authToken = authToken;
    if (!authToken) StorageHelper.clearAuthKeys();
    this.http.setAuthToken(authToken);
  }

  static isLoggedIn() {
    return !!ApiManager.authToken;
  }

  getAuthToken(password: string) {
    const http = this.http;
    ApiManager.lastKnownPassword = password;

    const self = this;
    return Promise.resolve() //
      .then(http.fetch(http.POST, "/login", { password }))
      .then(function(data) {
        self.setAuthToken(data.token);
      })
      .catch(function(error) {
        // Upon wrong password or back-off error, we force logout the user
        // to avoid getting stuck with wrong password loop
        if (
          error.agentStatus + "" ===
            ErrorFactory.STATUS_PASSWORD_BACK_OFF + "" ||
          error.agentStatus + "" === ErrorFactory.STATUS_WRONG_PASSWORD + ""
        ) {
          self.setAuthToken("");
          ApiManager.lastKnownPassword = "";
        }

        return Promise.reject(error);
      });
  }

  getAgentInfo() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/system/info", {}));
  }

  updateRootDomain(rootDomain: string, force: boolean) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/system/changerootdomain", {
          rootDomain,
          force
        })
      );
  }

  enableRootSsl(emailAddress: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.POST, "/user/system/enablessl", { emailAddress }));
  }

  forceSsl(isEnabled: boolean) {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.POST, "/user/system/forcessl", { isEnabled }));
  }

  getAllApps() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/apps/appDefinitions", {}));
  }

  fetchBuildLogs(appName: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/apps/appData/" + appName, {}));
  }

  fetchAppLogsInHex(appName: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(
          http.GET,
          `/user/apps/appData/${appName}/logs?encoding=hex`,
          {}
        )
      );
  }

  uploadAppData(appName: string, file: File) {
    const http = this.http;
    var formData = new FormData();
    formData.append("sourceFile", file);
    return Promise.resolve() //
      .then(
        http.fetch(
          http.POST,
          "/user/apps/appData/" + appName + "?detached=1",
          formData
        )
      );
  }

  uploadAgentDefinitionContent(
    appName: string,
    agentDefinition: IAgentDefinition,
    gitHash: string,
    detached: boolean
  ) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(
          http.POST,
          "/user/apps/appData/" + appName + (detached ? "?detached=1" : ""),
          {
            agentDefinitionContent: JSON.stringify(agentDefinition),
            gitHash
          }
        )
      );
  }

  updateConfigAndSave(appName: string, appDefinition: IAppDef) {
    var instanceCount = appDefinition.instanceCount;
    var agentDefinitionRelativeFilePath =
      appDefinition.agentDefinitionRelativeFilePath;
    var envVars = appDefinition.envVars;
    var notExposeAsWebApp = appDefinition.notExposeAsWebApp;
    var forceSsl = appDefinition.forceSsl;
    var websocketSupport = appDefinition.websocketSupport;
    var volumes = appDefinition.volumes;
    var ports = appDefinition.ports;
    var nodeId = appDefinition.nodeId;
    var appPushWebhook = appDefinition.appPushWebhook;
    var customNginxConfig = appDefinition.customNginxConfig;
    var preDeployFunction = appDefinition.preDeployFunction;
    var containerHttpPort = appDefinition.containerHttpPort;
    var description = appDefinition.description;
    var httpAuth = appDefinition.httpAuth;
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/update", {
          appName: appName,
          instanceCount: instanceCount,
          agentDefinitionRelativeFilePath: agentDefinitionRelativeFilePath,
          notExposeAsWebApp: notExposeAsWebApp,
          forceSsl: forceSsl,
          websocketSupport: websocketSupport,
          volumes: volumes,
          ports: ports,
          customNginxConfig: customNginxConfig,
          appPushWebhook: appPushWebhook,
          nodeId: nodeId,
          preDeployFunction: preDeployFunction,
          containerHttpPort: containerHttpPort,
          description: description,
          httpAuth: httpAuth,
          envVars: envVars
        })
      );
  }

  renameApp(oldAppName: string, newAppName: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/rename", {
          oldAppName,
          newAppName
        })
      );
  }

  registerNewApp(
    appName: string,
    hasPersistentData: boolean,
    detached: boolean
  ) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(
          http.POST,
          "/user/apps/appDefinitions/register" +
            (detached ? "?detached=1" : ""),
          {
            appName,
            hasPersistentData
          }
        )
      );
  }

  deleteApp(appName: string, volumes: string[]) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/delete", {
          appName,
          volumes
        })
      );
  }

  enableSslForBaseDomain(appName: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/enablebasedomainssl", {
          appName
        })
      );
  }

  attachNewCustomDomainToApp(appName: string, customDomain: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/customdomain", {
          appName,
          customDomain
        })
      );
  }

  enableSslForCustomDomain(appName: string, customDomain: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(
          http.POST,
          "/user/apps/appDefinitions/enablecustomdomainssl",
          {
            appName,
            customDomain
          }
        )
      );
  }

  removeCustomDomain(appName: string, customDomain: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/removecustomdomain", {
          appName,
          customDomain
        })
      );
  }

  getLoadBalancerInfo() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/system/loadbalancerinfo", {}));
  }

  getNetDataInfo() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/system/netdata", {}));
  }

  updateNetDataInfo(netDataInfo: any) {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.POST, "/user/system/netdata", { netDataInfo }));
  }

  changePass(oldPassword: string, newPassword: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/changepassword", {
          oldPassword,
          newPassword
        })
      );
  }

  getVersionInfo(): Promise<IVersionInfo> {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/system/versioninfo", {}));
  }

  createBackup(): Promise<{ downloadToken: string }> {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/system/createbackup", {
          postDownloadFileName: "backup.tar"
        })
      );
  }

  performUpdate(latestVersion: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/system/versioninfo", { latestVersion })
      );
  }

  getNginxConfig() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/system/nginxconfig", {}));
  }

  setNginxConfig(customBase: string, customAgent: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/system/nginxconfig", {
          baseConfig: { customValue: customBase },
          agentConfig: { customValue: customAgent }
        })
      );
  }

  getUnusedImages(mostRecentLimit: number) {
    const http = this.http;
    return Promise.resolve() //
      .then(
        http.fetch(http.GET, "/user/apps/appDefinitions/unusedImages", {
          mostRecentLimit: mostRecentLimit + ""
        })
      );
  }

  deleteImages(imageIds: string[]) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/apps/appDefinitions/deleteImages", {
          imageIds
        })
      );
  }

  getDockerRegistries() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/registries", {}));
  }

  enableSelfHostedDockerRegistry() {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(
          http.POST,
          "/user/system/selfhostregistry/enableregistry",
          {}
        )
      );
  }

  disableSelfHostedDockerRegistry() {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(
          http.POST,
          "/user/system/selfhostregistry/disableregistry",
          {}
        )
      );
  }

  addDockerRegistry(dockerRegistry: IRegistryInfo) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/registries/insert", { ...dockerRegistry })
      );
  }

  updateDockerRegistry(dockerRegistry: IRegistryInfo) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/registries/update", { ...dockerRegistry })
      );
  }

  deleteDockerRegistry(registryId: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/registries/delete", {
          registryId
        })
      );
  }

  setDefaultPushDockerRegistry(registryId: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/registries/setpush", {
          registryId
        })
      );
  }

  forceBuild(webhookPath: string) {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.POST, webhookPath, {}));
  }

  getAllNodes() {
    const http = this.http;

    return Promise.resolve() //
      .then(http.fetch(http.GET, "/user/system/nodes", {}));
  }

  addDockerNode(
    nodeType: string,
    privateKey: string,
    remoteNodeIpAddress: string,
    agentIpAddress: string
  ) {
    const http = this.http;

    return Promise.resolve() //
      .then(
        http.fetch(http.POST, "/user/system/nodes", {
          nodeType,
          privateKey,
          remoteNodeIpAddress,
          agentIpAddress
        })
      );
  }
}
