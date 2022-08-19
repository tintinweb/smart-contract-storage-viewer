import Head from 'next/head'
import styles from '../styles/Home.module.css'
import HexEditor from 'react-hex-editor';
import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import dynamic from 'next/dynamic'
import EthRPC from '../lib/apiclient';
import { analyzeStorage, hexStringToByteArray, toHexString } from '../lib/decoder';

import Web3 from 'web3';

const DynamicReactJson = dynamic(import('react-json-view'), { ssr: false })


class HexViewWithForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      endpoint: "https://ropsten.infura.io/v3/798abb58ef824315ae09ce39beb1c329",
      etherscanApiKey: undefined,
      startslot: "0x0",
      numslots: 10,
      target: "0x3a6CAE3af284C82934174F693151842Bc71b02b2",
      atBlock: "latest",
      data: new Array(),
      selectedTab: 0,
      txList: [],
      nonce: 0,
      dirty: true,
      error: undefined,
      errorEtherscan: undefined,
      api: new EthRPC(),
      web3: new Web3()
    };

    this._setEndpointChanged();
  }

  _getNetwork() {
    let chainPrefix = this.state.endpoint.match(/https?:\/\/(.*).infura.io.*/);
    if (chainPrefix && chainPrefix.length >= 2) {
      return chainPrefix[1].toLowerCase().trim();
    }
    return;
  }

  _setEndpointChanged() {
    this.setState({
      web3: new Web3(new Web3.providers.HttpProvider(this.state.endpoint)),
    });
    this.state.api.setEndpoint(this.state.endpoint, this.state.etherscanApiKey);
  }

  shouldComponentUpdate() {
    return true;
  }

  shouldUpdateView() {
    return this.state.dirty && this.state.endpoint.length && this.state.numslots != 0 && this.state.target.length == 42;
  }

  componentDidMount() {
    window.tools = {
      Web3: Web3,
      web3: this.state.web3,
      customRpcClient: this.state.api
    }
    this.componentDidUpdate();
  }

  componentDidUpdate() {

    if (!this.shouldUpdateView()) {
      console.log("no update")
      return;
    }
    console.log("updated")

    if (this.state.dirty) {
      this.setState({ dirty: false });
      let atblock = isNaN(parseInt(this.state.atBlock)) ? "latest" : `0x${this.state.atBlock.toString(16)}`;
      //fetch data
      this._setEndpointChanged();


      switch (this.state.selectedTab) {
        case 1:
          /** tx-view */
          this.state.api.etherscanTxList(this.state.target, this._getNetwork(), "txlist").then(resp => {

            function parseMethod(s) {

              let funcParts = s.split("(");

              let funcDeclDef = {
                name: funcParts[0],
                args: []
              }
              funcDeclDef.args = funcParts[1].split(")", 1)[0].split(",").map(a => {
                let parts = a.trim().split(" ")
                return { type: parts.slice(0, -1).join(" "), name: parts[parts.length - 1] }
              })

              return funcDeclDef;
            }

            const that = this;
            function decodeFunction(input, method) {
              let decoded = undefined;
              try {
                decoded = that.state.web3.eth.abi.decodeParameters(method.args.map(a => a.type), toHexString(input));
              } catch (e) {
                decoded = e;
              }
              let args = [];
              for (let argid in method.args) {
                args.push(`(${method.args[argid].type} '${method.args[argid].name}') ${decoded[argid]}`);
                //args.push([method.args[argid].type, method.args[argid].name], decoded[argid])
              }


              return [method.name, args];

              return `${method.name}(${args.join(", ")})`;
            }

            let results = resp.result.map(tx => {
              let funcDecl = tx.functionName;
              let inputBytes = hexStringToByteArray(tx.input)
              let methodId = inputBytes.slice(0, 4);
              let data = inputBytes.slice(4)
              if (!funcDecl) {
                //4bytes
                return
              }
              //parse funcdecl
              let method = parseMethod(funcDecl);
              //console.log(tx)
              let decoded = decodeFunction(data, method);
              let ret = {}
              ret[`function ${decoded[0]}(...)`] = decoded[1];
              ret.ts = tx.timeStamp;
              ret.hash = tx.hash;
              ret.from = tx.from;
              return ret;
              return { ts: tx.timeStamp, hash: tx.hash, };
              //map

            })
            this.setState({ txList: results })

          }).catch(e => {
            this.setState({ errorEtherscan: e })
          });
          break;
        default:
          /** hex-view */
          this.state.api.getStorageAt(this.state.target, this.state.startslot, this.state.numslots, atblock).then(arr => {
            if (arr && arr.length > 0 && arr[0].error) {
              throw new Error(arr[0].error.message);
            }
            let flatData = arr.map(a => a.result).reduce((flat, toFlatten) => flat.concat(hexStringToByteArray(toFlatten)), []);
            this.setState({
              data: flatData,
              nonce: this.state.nonce + 1, //force render
              error: undefined
            });
          }).catch(err => {
            let errMsg;
            if (err instanceof TypeError) {
              errMsg = "Invalid Input";
            } else if (err.message) {
              errMsg = err.message;
            } else if (err.readyState != undefined) {
              errMsg = "Error querying API endpoint (infura?)"
            } else {
              errMsg = err.responseJSON.error.message;
              if (errMsg.substr("rate limited")) {
                errMsg += ". Check your infura API limitations or change API-key."
              }
            }


            this.setState({ error: errMsg })
          });
      }


    }
  }

  render() {

    function handleSetValue(offset, value) {
      //this.setState({data[offset] = value;
      //this.state.nonce += 1;
      console.log(offset, value)
    }

    let chainPrefix = this.state.endpoint.match(/https?:\/\/(.*).infura.io.*/);
    if (chainPrefix && chainPrefix.length >= 2) {
      chainPrefix = chainPrefix[1].toLowerCase().trim();
    } else {
      chainPrefix = "";
    }

    let storageAnalysis = analyzeStorage(this.state);

    return (
      <div>

        <div>
          <form>
            <table>
              <thead>
                <tr>
                  <th>📝 Target</th>
                  <th>First Slot</th>
                  <th># Slots</th>
                  <th>at Block</th>
                  <th>API-Endpoint</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <input type="text" name="target"
                      size={50}
                      pattern="0x[0-9a-FA-F]{40}" title="Target must be an Ethereum Address starting with 0x..."
                      value={this.state.target}
                      onChange={(e) => this.setState({ target: e.target.value.trim(), dirty: true })} />
                  </td>
                  <td>
                    <input type="text" name="startslot"
                      size={15}
                      pattern="[0-9]+" title="Field must be a Number."
                      value={this.state.startslot}
                      onChange={(e) => this.setState({ startslot: e.target.value.trim(), dirty: true })}
                    />
                  </td>
                  <td>
                    <input type="text" name="numslots"
                      size={15}
                      pattern="[0-9]+" title="Field must be a Number."
                      value={this.state.numslots}
                      onChange={(e) => this.setState({ numslots: parseInt(e.target.value.trim()), dirty: true })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="atBlock"
                      pattern="https?://.*" title="Field must be a HTTP(s)-URL."
                      size={10}
                      value={this.state.atBlock}
                      onChange={(e) => this.setState({ atBlock: e.target.value.trim(), dirty: true })}
                    />
                  </td>
                  <td>
                    <div title="Get Api Key">
                      <input
                        type="text"
                        name="endpoint"
                        pattern="https?://.*" title="Field must be a HTTP(s)-URL."
                        size={70}
                        value={this.state.endpoint}
                        onChange={(e) => this.setState({ endpoint: e.target.value.trim(), dirty: true })}
                      />
                      &nbsp;
                      <a href="https://infura.io/register">ⓘ</a>
                    </div>

                  </td>
                  <td>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>

        <Tabs
          onSelect={(index) => this.setState({ selectedTab: index, dirty: true })}
        >
          <TabList>
            <Tab>💾  Storage</Tab>
            <Tab>↹   Transaction Decoder</Tab>
            <Tab>🧰  Tools</Tab>
            <Tab>📍  About</Tab>
          </TabList>

          <TabPanel>
            <div>
              <div>
                <a href={`https://${chainPrefix != 'mainnet' ? `${chainPrefix}.` : ''}etherscan.io/address/${this.state.target}`} target="_blank" rel='noreferrer'>🌐 Etherscan</a>
                {/*   &nbsp;<a href={`https://dashboard.tenderly.co/contract/${chainPrefix}/${this.state.target}`}>🟣 Tenderly</a> */}
              </div>
              <div className='errorBox'>
                {this.state.error ? `❗ StorageDecoder: ${this.state.error}` : ""}
                {this.state.errorEtherscan ? `❗ TxDecoder: Etherscan Rate Limit :/ please provide an API-Key below` : ""}
              </div>
              <HexEditor
                className="hexview"
                columns={0x20}
                height={600}
                data={this.state.data}
                nonce={this.state.nonce}
                showAscii={true}
                showColumnLabels={true}
                showRowLabels={true}
                highlightColumn={true}
                onSetValue={handleSetValue}
                readOnly={true}
                theme={{}}
              />
            </div>
            <span>Datatype Guesser:</span>
            <div className="mt-2 flex">
              <div className="flex items-center text-sm text-gray-500">
                <DynamicReactJson
                  name={false}
                  collapsed={false}
                  displayDataTypes={false}
                  src={
                    Object.keys(storageAnalysis).reduce((result, key) => {
                      result[key] = storageAnalysis[key].guess;
                      return result;
                    }, {})
                  }
                  onSelect={
                    (select) => {
                      switch (select.name) {
                        case 'address':
                          window.open(`https://${chainPrefix && chainPrefix != 'mainnet' ? `${chainPrefix}.` : ""}etherscan.io/address/${select.value}`, '_blank');
                          break;
                      }
                    }
                  }
                />
              </div>
            </div>

          </TabPanel>
          <TabPanel>
            <h3>Transaction Decoder</h3>
            <div title="Get Api Key Etherscan">
              <input
                type="text"
                name="etherscanApiKey"
                title="Etherscan.io API-Key"
                placeholder='Enter your Etherscan API-Key to avoid rate-limiting'
                size={70}
                value={this.state.etherscanApiKey || ""}
                onChange={(e) => this.setState({ etherscanApiKey: e.target.value.trim(), dirty: true })}
              />
            </div>
            <div className="mt-2 flex">
              <div className="flex items-center text-sm text-gray-500">
                <DynamicReactJson
                  name={false}
                  collapsed={false}
                  displayDataTypes={false}
                  src={
                    this.state.txList
                  }
                  onSelect={
                    (select) => {
                      switch (select.name) {
                        case 'hash':
                          window.open(`https://${chainPrefix && chainPrefix != 'mainnet' ? `${chainPrefix}.` : ""}etherscan.io/tx/${select.value}`, '_blank');
                          return;
                        case 'from':
                          window.open(`https://${chainPrefix && chainPrefix != 'mainnet' ? `${chainPrefix}.` : ""}etherscan.io/address/${select.value}`, '_blank');
                          return;
                      }

                      if (select.value.startsWith(`(address`)) {
                        let addr = select.value.split(" ").slice(-1).pop();
                        window.open(`https://${chainPrefix && chainPrefix != 'mainnet' ? `${chainPrefix}.` : ""}etherscan.io/address/${addr}`, '_blank');
                        return;
                      }
                    }
                  }
                />
              </div>
            </div>

          </TabPanel>
          <TabPanel>
            <div>
              <span> 🤫 open your browsers devtools (right-click → inspect) and type <code> `window.tools ↵`</code>.</span>
              <br></br><br></br><br></br>
              <code> ↦   window.tools.web3.utils.keccak256('hi')</code> <a href='https://web3js.readthedocs.io/en/v1.7.5/' target="_blank" rel='noreferrer'>[web3js]</a><a href='https://web3js.readthedocs.io/en/v1.7.5/web3-utils.html' target="_blank" rel='noreferrer'>[web3js-utils]</a>
              <br></br><br></br><br></br>
            </div>
          </TabPanel>
          <TabPanel>
            <div>
              ⇈ <sub><a href="https://github.com/tintinweb/smart-contract-storage-viewer">Fork Me @ tintinweb/smart-contract-storage-viewer</a></sub>
            </div>
          </TabPanel>
        </Tabs>




      </div>
    );
  }
}



export default function Home() {

  return (
    <div className={styles.container}>
      <Head>
        <title>Smart Contract Storage Viewer</title>
        <meta name="description" content="Ethereum Smart Contract Storage Hex Viewer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HexViewWithForm />
      <hr></hr>
      <sub><a href="https://github.com/tintinweb">@tintinweb ❤️</a> <a href="https://github.com/tintinweb/smart-contract-storage-viewer">smart-contract-storage-viewer</a></sub>
    </div>

  )
}
