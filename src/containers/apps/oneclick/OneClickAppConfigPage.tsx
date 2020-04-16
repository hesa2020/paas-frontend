import { Card, Col, message, Row } from "antd";
import queryString from "query-string";
import React from "react";
import { RouteComponentProps } from "react-router";
import OneClickAppsApi from "../../../api/OneClickAppsApi";
import { IOneClickTemplate } from "../../../models/IOneClickAppModels";
import DomUtils from "../../../utils/DomUtils";
import Toaster from "../../../utils/Toaster";
import CenteredSpinner from "../../global/CenteredSpinner";
import OneClickAppDeployManager, {
  IDeploymentState
} from "./OneClickAppDeployManager";
import OneClickAppDeployProgress from "./OneClickAppDeployProgress";
import {
  TEMPLATE_ONE_CLICK_APP,
  ONE_CLICK_APP_STRINGIFIED_KEY
} from "./OneClickAppSelector";
import OneClickVariablesSection from "./OneClickVariablesSection";
import Utils from "../../../utils/Utils";
import ApiComponent from "../../global/ApiComponent";

export const ONE_CLICK_APP_NAME_VAR_NAME = "$$cap_appname";
export const ONE_CLICK_ROOT_DOMAIN_VAR_NAME = "$$cap_root_domain";

export default class OneClickAppConfigPage extends ApiComponent<
  RouteComponentProps<any>,
  {
    apiData: IOneClickTemplate | undefined;
    rootDomain: string;
    deploymentState: IDeploymentState | undefined;
  }
> {
  private oneClickAppDeployHelper: OneClickAppDeployManager;
  private isUnmount: boolean = false;

  constructor(props: any) {
    super(props);
    const self = this;
    this.state = {
      apiData: undefined,
      rootDomain: "",
      deploymentState: undefined
    };
    this.oneClickAppDeployHelper = new OneClickAppDeployManager(
      deploymentState => {
        if (self.isUnmount) {
          return;
        }
        self.setState({ deploymentState });
      }
    );
  }

  componentWillUnmount() {
    if (super.componentWillUnmount) super.componentWillUnmount();
    this.isUnmount = true;
  }

  componentDidMount() {
    const self = this;

    const appNameFromPath = this.props.match.params.appName;
    let promiseToFetchOneClick =
      appNameFromPath === TEMPLATE_ONE_CLICK_APP
        ? new Promise<any>(function(resolve) {
            resolve(
              JSON.parse(
                queryString.parse(self.props.location.search)[
                  ONE_CLICK_APP_STRINGIFIED_KEY
                ] as string
              )
            );
          })
        : new OneClickAppsApi().getOneClickAppByName(appNameFromPath);

    let apiData: IOneClickTemplate;

    promiseToFetchOneClick
      .then(function(data: IOneClickTemplate) {
        if ((data.agentVersion || "").toString() !== "2") {
          message.error(
            `One-click app version is ${data.agentVersion}, this version supports "v2". Make sure your Agent is up-to-date with the latest version!!`
          );
          return;
        }

        data.variables = data.variables || [];
        // Adding app name to all one click apps
        data.variables.unshift({
          id: ONE_CLICK_APP_NAME_VAR_NAME,
          label: "App Name",
          description:
            "This is your app name. Pick a name such as my-first-1-click-app",
          validRegex: "/^([a-z0-9]+\\-)*[a-z0-9]+$/" // string version of /^([a-z0-9]+\-)*[a-z0-9]+$/
        });

        apiData = data;

        return self.apiManager.getAgentInfo();
      })
      .then(function(agentInfo) {
        self.setState({ apiData: apiData, rootDomain: agentInfo.rootDomain });
      })
      .catch(Toaster.createCatcher());
  }

  render() {
    const self = this;
    const deploymentState = this.state.deploymentState;
    const apiData = this.state.apiData;
    const displayName =
      apiData && apiData.displayName
        ? apiData.displayName
        : self.props.match.params.appName[0].toUpperCase() +
          self.props.match.params.appName.slice(1);

    if (!apiData) {
      return <CenteredSpinner />;
    }

    if (!!deploymentState) {
      return (
        <OneClickAppDeployProgress
          appName={self.props.match.params.appName}
          deploymentState={deploymentState}
          onFinishClicked={() => self.props.history.push("/apps")}
          onRestartClicked={() => self.setState({ deploymentState: undefined })}
        />
      );
    }

    return (
      <div>
        <Row type="flex" justify="center">
          <Col xs={{ span: 23 }} lg={{ span: 16 }}>
            <Card title={`Setup your ${displayName}`}>
              <h2>{displayName}</h2>
              <p
                style={{
                  whiteSpace: "pre-line",
                  paddingLeft: 15,
                  paddingRight: 15
                }}
              >
                {apiData.instructions.start}
              </p>
              <div style={{ height: 40 }} />
              <OneClickVariablesSection
                oneClickAppVariables={apiData.variables}
                onNextClicked={values => {
                  const template = Utils.copyObject(self.state.apiData!);
                  const valuesAugmented = Utils.copyObject(values);

                  template.variables.push({
                    id: ONE_CLICK_ROOT_DOMAIN_VAR_NAME,
                    label: "Agent root domain"
                  });
                  valuesAugmented[ONE_CLICK_ROOT_DOMAIN_VAR_NAME] =
                    self.state.rootDomain;

                  self.oneClickAppDeployHelper.startDeployProcess(
                    template,
                    valuesAugmented
                  );
                  DomUtils.scrollToTopBar();
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}
