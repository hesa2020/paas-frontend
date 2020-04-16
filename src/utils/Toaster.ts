import { message } from "antd";

export default class Toaster {
  static toast(error: any) {
    let errorMessage = "Something bad happened.";
    if (error.agentStatus) {
      let errorDescription = error.agentMessage || errorMessage;
      errorMessage = `${error.agentStatus} : ${errorDescription}`;
    }
    message.error(errorMessage);
    if (!!process.env.REACT_APP_IS_DEBUG) console.error(error);
  }

  static createCatcher(functionToRun?: Function) {
    return function(error: any) {
      Toaster.toast(error);
      if (functionToRun) {
        functionToRun();
      }
    };
  }
}
