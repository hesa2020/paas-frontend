import UploaderPlainTextAgentDefinition from "./UploaderPlainTextAgentDefinition";
import { IAgentDefinition } from "../../../../models/IAgentDefinition";

export default class UploaderPlainTextDockerfile extends UploaderPlainTextAgentDefinition {
  protected getPlaceHolderValue() {
    return `# Derived from official mysql image (our base image)
FROM mysql:5.7
# Add a database
ENV MYSQL_DATABASE company`;
  }

  protected convertDataToAgentDefinition(userEnteredValue: string) {
    const capDefinition: IAgentDefinition = {
      schemaVersion: 2,
      dockerfileLines: userEnteredValue.trim().split("\n")
    };

    return JSON.stringify(capDefinition);
  }
}
