import UploaderPlainTextBase from "./UploaderPlainTextBase";

export default class UploaderPlainTextAgentDefinition extends UploaderPlainTextBase {
  protected getPlaceHolderValue() {
    return `{
    "schemaVersion" :2 ,
    "imageName" : "mysql:5.7
}`;
  }

  protected convertDataToAgentDefinition(userEnteredValue: string) {
    return userEnteredValue.trim();
  }
}
