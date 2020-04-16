import { Button, Card, Col, Input, Modal, Row, Tooltip } from "antd";
import React from "react";
import Toaster from "../utils/Toaster";
import ApiComponent from "./global/ApiComponent";
import CenteredSpinner from "./global/CenteredSpinner";
import ErrorRetry from "./global/ErrorRetry";
import NewTabLink from "./global/NewTabLink";
const Search = Input.Search;

export default class Dashboard extends ApiComponent<
  {},
  { isLoading: boolean; apiData: any; userEmail: string }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      userEmail: "",
      isLoading: true,
      apiData: undefined
    };
  }

  componentDidMount() {
    this.reFetchData();
  }

  reFetchData() {
    const self = this;
    self.setState({ isLoading: true, apiData: undefined });
    return this.apiManager
      .getAgentInfo()
      .then(function(data: any) {
        self.setState({ apiData: data });
      })
      .catch(Toaster.createCatcher())
      .then(function() {
        self.setState({ isLoading: false });
      });
  }

  onForceSslClicked() {
    const self = this;

    const isUsingHttp = window.location.href.startsWith("http://");

    Modal.confirm({
      title: "Force HTTPS",
      content: (
        <p>
          Once Force HTTPS is activated, all HTTP traffic is redirected to
          HTTPS.
          {isUsingHttp
            ? "Since this is a one-way action, and there is no revert, it is highly recommended that you test the HTTPS website first."
            : ""}{" "}
          Do you still want to proceed?
        </p>
      ),
      onOk() {
        self.setState({ isLoading: true });
        self.apiManager
          .forceSsl(true)
          .then(function() {
            Modal.success({
              title: "Force HTTPS activated!",
              content: (
                <div>
                  <p>
                    All HTTP traffic is now redirected to HTTPS.{" "}
                    {isUsingHttp
                      ? "You will have to login again as you will now be redirected to HTTPS website."
                      : ""}
                  </p>
                </div>
              ),
              onOk() {
                if (isUsingHttp) {
                  window.location.replace(
                    "https://agent." + self.state.apiData.rootDomain
                  );
                }
              },
              onCancel() {
                if (isUsingHttp) {
                  window.location.replace(
                    "https://" + self.state.apiData.rootDomain
                  );
                }
              }
            });
          })
          .catch(Toaster.createCatcher())
          .then(function() {
            self.setState({ isLoading: false });
          });
      },
      onCancel() {
        // do nothing
      }
    });
  }

  onEnableSslClicked() {
    const self = this;
    const IGNORE = "IGNORE";

    Promise.resolve()
      .then(function() {
        return new Promise(function(resolve, reject) {
          Modal.success({
            title: "Enable HTTPS",
            content: (
              <div>
                <p>
                  Agent uses{" "}
                  <NewTabLink url="https://letsencrypt.org/">
                    Let&#39;s Encrypt
                  </NewTabLink>{" "}
                  to provide free SSL Certificates (HTTPS). This email address
                  is very important as Let&#39;s Encrypt uses it for validation
                  purposes. Please provide a valid email here.
                </p>
                <p>
                  IMPORTANT: Once you enable HTTPS, you cannot edit the root
                  domain ever again. Make sure you use a good root domain. A
                  good practice is to go one level deeper and setup your root
                  domain. For example, if you own <code>example.com</code>, use{" "}
                  <code>*.agent-root.example.com</code> as your root domain.
                  This will allow you to better manage your subdomains, do not
                  use <code>*.example.com</code> as your root domain.
                </p>
                <Input
                  placeholder="your@email.com"
                  type="email"
                  onChange={event =>
                    self.setState({
                      userEmail: (event.target.value || "").trim()
                    })
                  }
                />
              </div>
            ),
            onOk() {
              resolve(self.state.userEmail || "");
            },
            onCancel() {
              resolve(undefined);
            }
          });
        });
      })
      .then(function(data: any) {
        if (data === undefined) return IGNORE;
        self.setState({ isLoading: true });
        return self.apiManager.enableRootSsl(data);
      })

      .then(function(data: any) {
        if (data === IGNORE) return;

        Modal.success({
          title: "Root Domain HTTPS activated!",
          content: (
            <div>
              <p>
                You can now use{" "}
                <code>{"https://" + self.state.apiData.rootDomain}</code>. Next
                step is to Force HTTPS to disallow plain HTTP traffic.
              </p>
            </div>
          )
        });

        return self.reFetchData();
      })
      .catch(Toaster.createCatcher())
      .then(function() {
        self.setState({ isLoading: false });
      });
  }

  updateRootDomainClicked(rootDomain: string) {
    const self = this;
    if (!self.state.apiData.hasRootSsl) {
      self.performUpdateRootDomain(rootDomain, false);
      return;
    }

    Modal.confirm({
      title: "Force Change Root Domain",
      content: (
        <div>
          <p>
            You have already enabled SSL for your root domain. Changing the root
            domain URL will invalidate HTTPS on root domain and all default
            subdomains for apps if you have any apps.
          </p>
          <p>You can still re-enable HTTPS after changing the root domain.</p>
        </div>
      ),
      onOk() {
        self.performUpdateRootDomain(rootDomain, true);
      },
      onCancel() {
        // do nothing
      }
    });
  }

  performUpdateRootDomain(rootDomain: string, force: boolean) {
    this.apiManager
      .updateRootDomain(rootDomain, force)
      .then(function(data: any) {
        Modal.success({
          title: "Root Domain Updated",
          content: (
            <div>
              <p>
                Click Ok to get redirected to your new root domain. You need to
                log in again.
              </p>
            </div>
          ),
          onOk() {
            window.location.replace("http://agent." + rootDomain);
          }
        });
      })
      .catch(Toaster.createCatcher());
  }

  render() {
    const self = this;

    if (self.state.isLoading) {
      return <CenteredSpinner />;
    }

    if (!self.state.apiData) {
      return <ErrorRetry />;
    }

    return (
      <div>
        {self.createInitialSetup()}
        <br />
        {self.createSetupPanel()}
      </div>
    );
  }

  createSetupPanel() {
    const self = this;
    return (
      <Row type="flex" justify="center">
        <Col xs={{ span: 23 }} lg={{ span: 16 }}>
          <Card title="Agent Root Domain Configurations">
            <div>
              <p>
                The very first thing that Agent needs is a root domain. For
                example, if you own <i>myawesomecompany.com</i>, you can use{" "}
                <i>agent.myawesomecompany.com</i> or{" "}
                <i>foo.bar.myawesomecompany.com</i> as your root domain. First,
                you need to make sure that the ip address for all subdomains of
                the root domain resolve to the Agent ip address. To do this,
                go to the DNS settings in your domain provider website, and set
                a wild card A entry.
                <br /> For example: <b> Type:</b> <u>A</u>,{" "}
                <b>Name (or host):</b> <u>*.agent-root</u>,
                <b> IP (or Points to):</b> <u>110.120.130.140</u> where this is
                the IP address of your Agent machine.
              </p>
              <p>
                <i>
                  NOTE: DNS settings might take several hours to take into
                  effect. See{" "}
                  <NewTabLink url="https://ca.godaddy.com/help/what-factors-affect-dns-propagation-time-1746">
                    {" "}
                    here
                  </NewTabLink>{" "}
                  for more details.
                </i>
              </p>
            </div>

            <hr />
            <br />

            <Row>
              <div>
                <p>
                  For example, if you set <code>*.my-root.example.com</code> to
                  the IP address of your server, just enter{" "}
                  <code>my-root.example.com</code> in the box below:
                </p>
                <br />
                <div>
                  <Search
                    addonBefore="[wildcard]&nbsp;."
                    placeholder="my-root.example.com"
                    defaultValue={self.state.apiData.rootDomain + ""}
                    enterButton="Update Domain"
                    onSearch={value => self.updateRootDomainClicked(value)}
                  />
                </div>
              </div>
              <br />
              <br />
              <Row type="flex" justify="end">
                <Tooltip title="Using Let's Encrypt Free Service">
                  <Button
                    disabled={
                      self.state.apiData.hasRootSsl ||
                      !self.state.apiData.rootDomain
                    }
                    onClick={() => self.onEnableSslClicked()}
                  >
                    Enable HTTPS
                  </Button>
                </Tooltip>
                &nbsp;&nbsp;
                <Tooltip title="Redirect all HTTP to HTTPS">
                  <Button
                    disabled={
                      !self.state.apiData.hasRootSsl ||
                      self.state.apiData.forceSsl
                    }
                    onClick={() => self.onForceSslClicked()}
                  >
                    Force HTTPS
                  </Button>
                </Tooltip>
              </Row>

              <div />
            </Row>
          </Card>
        </Col>
      </Row>
    );
  }

  createInitialSetup() {
    if (this.state.apiData.hasRootSsl) {
      // User has set up the machine, no need to show the welcome message
      return <div />;
    }

    return (
      <Row type="flex" justify="center">
        <Col xs={{ span: 23 }} lg={{ span: 16 }}>
          <Card title="Agent Initial Setup">
            <div>
              <h3>
                Congratulations!{" "}
                <span aria-label="Congrats" role="img">
                  🎉🎉
                </span>
              </h3>
              <p>
                <b /> You have installed Agent successfully! You can set up
                your Agent instance in two ways:
              </p>

              <ul>
                <li>
                  <b>Command Line Tool (RECOMMENDED): </b> On your local
                  machine, simply run
                  <br />
                  <code>npm i -g agent</code>
                  <br />
                  followed by
                  <br />
                  <code>agent serversetup</code>. Then follow the guide.
                </li>
                <li>
                  <b>Use the panel below: </b> This is a non-guided version of
                  the Command Line method. Use this method only for the purpose
                  of experimentation.
                </li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    );
  }
}
