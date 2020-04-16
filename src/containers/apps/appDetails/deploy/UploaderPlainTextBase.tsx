import { Button, Input, Row } from "antd";
import React from "react";
import Toaster from "../../../../utils/Toaster";
import ApiComponent from "../../../global/ApiComponent";

export default abstract class UploaderPlainTextBase extends ApiComponent<
  {
    appName: string;
    onUploadSucceeded: () => void;
  },
  {
    userEnteredValue: string;
    uploadInProcess: boolean;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      userEnteredValue: "",
      uploadInProcess: false
    };
  }

  protected abstract getPlaceHolderValue(): string;

  protected abstract convertDataToAgentDefinition(
    userEnteredValue: string
  ): string;

  startDeploy(agentDefinitionToBeUploaded: string) {
    const self = this;

    Promise.resolve() //
      .then(function() {
        self.setState({ uploadInProcess: true });
        return self.apiManager.uploadAgentDefinitionContent(
          self.props.appName,
          JSON.parse(agentDefinitionToBeUploaded),
          "",
          true
        );
      })
      .then(function() {
        self.setState({ userEnteredValue: "" });
        self.props.onUploadSucceeded();
      })
      .catch(Toaster.createCatcher())
      .then(function() {
        self.setState({ uploadInProcess: false });
      });
  }

  render() {
    const self = this;
    return (
      <div style={{ padding: 16 }}>
        <Row>
          <Input.TextArea
            className="code-input"
            placeholder={self.getPlaceHolderValue()}
            rows={7}
            value={self.state.userEnteredValue}
            onChange={e => {
              self.setState({
                userEnteredValue: e.target.value
              });
            }}
          />
        </Row>
        <div style={{ height: 20 }} />
        <Row type="flex" justify="end">
          <Button
            disabled={
              self.state.uploadInProcess || !self.state.userEnteredValue.trim()
            }
            type="primary"
            onClick={() =>
              self.startDeploy(
                self.convertDataToAgentDefinition(self.state.userEnteredValue)
              )
            }
          >
            Deploy Now
          </Button>
        </Row>
      </div>
    );
  }
}
