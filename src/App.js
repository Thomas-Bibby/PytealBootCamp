import "./App.css";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk, { waitForConfirmation } from "algosdk";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useEffect, useState } from "react";

// Create the PeraWalletConnect instance outside the component
const peraWallet = new PeraWalletConnect();

// The app ID on testnet
const appIndex = 145737873;
const appAccount = "TGTLMJHOZJRECKQPNZGQXZHA6VJCROSNLSMWL5RWFEEDXCGYLDG6KZK7YE";

// connect to the algorand node
const algod = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  443
);

function App() {
  const [accountAddress, setAccountAddress] = useState(null);
  const [currentBankTotal, setCurrentBankTotal] = useState(null);
  const [localCount, setLocalCount] = useState(null);
  const [localCredit, setLocalCredit] = useState(0);
  const [localCreditDebt, setLocalCreditDebt] = useState(0);
  const [amount, setAmount] = useState(0);
  const isConnectedToPeraWallet = !!accountAddress;

  useEffect(() => {
    checkCounterState();
    checkLocalCounterState();
    // reconnect to session when the component is mounted
    peraWallet.reconnectSession().then((accounts) => {
      // Setup disconnect event listener
      peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);

      if (accounts.length) {
        setAccountAddress(accounts[0]);
      }
    });
  }, []);

  return (
    <Container className="App-header">
      <meta name="name" content="Modified Counter App" />
      <h1> Bibby Bank</h1>
      <Row>
        <Col>
          <Button
            className="btn-wallet"
            onClick={
              isConnectedToPeraWallet
                ? handleDisconnectWalletClick
                : handleConnectWalletClick
            }
          >
            {isConnectedToPeraWallet ? "Disconnect" : "Connect to Pera Wallet"}
          </Button>
        </Col>
        <Col>
          <Button className="btn-wallet" onClick={() => updateValues()}>
            Update values
          </Button>
        </Col>
        <Col>
          <Button className="btn-wallet" onClick={() => optInToApp()}>
            Opt-in
          </Button>
        </Col>
      </Row>

      <Container>
        <Row>
          <Col>
            <h3>Local Account Balance</h3>
            <span className="local-counter-text">{localCount / 1000000}</span>
          </Col>
          <Col>
            <h3>Local Credit Balance</h3>
            <span className="counter-text">{localCredit / 1000000}</span>
          </Col>
          <Col>
            <h3>Local Credit Debt</h3>
            <span className="counter-text">{localCreditDebt / 1000000}</span>
          </Col>
          <Col>
            <h3>Banking Pool Balance</h3>
            <span className="counter-text">{currentBankTotal / 1000000}</span>
          </Col>
        </Row>

        <Row>
          <Col>
            <Button
              className="btn-add-local"
              onClick={
                // add the method for the local add
                () => depositBankingPool()
              }
            >
              Deposit to Banking Pool
            </Button>
          </Col>
          <Col>
            <Button
              className="btn-dec-local"
              onClick={
                // add the local deduct method
                () => withdrawBankingPool()
              }
            >
              Withdraw to Banking Pool
            </Button>
          </Col>
          <Col>
            <Button
              className="btn-add-global"
              onClick={
                // add the global add function
                () => depositAccount()
              }
            >
              Deposit Account
            </Button>
          </Col>
          <Col>
            <Button
              className="btn-add-local"
              onClick={
                // add the method for the local add
                () => withdrawAccount()
              }
            >
              Withdraw Account
            </Button>
          </Col>

          <Col>
            <Button
              className="btn-dec-local"
              onClick={
                // add the local deduct method
                () => createCreditAccount()
              }
            >
              Increase Credit Amount
            </Button>
          </Col>
          <Col>
            <Button
              className="btn-add-global"
              onClick={
                // add the global add function
                () => withdrawCreditAccount()
              }
            >
              Withdraw Credit
            </Button>
          </Col>
        </Row>
        <Row>
          <h3 className="mt-3">Input:</h3>
          <input onChange={(e) => setAmount(e.currentTarget.value)}></input>
        </Row>
      </Container>
    </Container>
  );

  function handleConnectWalletClick() {
    peraWallet.connect().then((newAccounts) => {
      // setup the disconnect event listener
      peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);

      setAccountAddress(newAccounts[0]);
      checkCounterState();
      checkLocalCounterState();
    });
  }

  function updateValues() {
    checkCounterState();
    checkLocalCounterState();
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();
    setAccountAddress(null);
  }

  async function optInToApp() {
    const suggestedParams = await algod.getTransactionParams().do();
    const optInTxn = algosdk.makeApplicationOptInTxn(
      accountAddress,
      suggestedParams,
      appIndex
    );

    const optInTxGroup = [{ txn: optInTxn, signers: [accountAddress] }];

    const signedTx = await peraWallet.signTransaction([optInTxGroup]);
    console.log(signedTx);
    const { txId } = await algod.sendRawTransaction(signedTx).do();
    const result = await waitForConfirmation(algod, txId, 2);
  }

  async function checkCounterState() {
    try {
      const counter = await algod.getApplicationByID(appIndex).do();
      console.log("counter ", counter);
      if (!!counter.params["global-state"][0].value.uint) {
        setCurrentBankTotal(counter.params["global-state"][0].value.uint);
      } else {
        setCurrentBankTotal(0);
      }
    } catch (e) {
      console.error("There was an error connecting to the algorand node: ", e);
    }
  }

  async function checkLocalCounterState() {
    try {
      const accountInfo = await algod
        .accountApplicationInformation(accountAddress, appIndex)
        .do();
      if (!!accountInfo["app-local-state"]["key-value"][0].value.uint) {
        setLocalCount(
          accountInfo["app-local-state"]["key-value"][0].value.uint
        );
        setLocalCredit(
          accountInfo["app-local-state"]["key-value"][1].value.uint
        );
        setLocalCreditDebt(
          accountInfo["app-local-state"]["key-value"][2].value.uint
        );
      } else {
        setLocalCount(0);
      }
      console.log(accountInfo["app-local-state"]["key-value"][0].value.uint);
    } catch (e) {
      console.error("There was an error connecting to the algorand node: ", e);
    }
  }

  async function depositBankingPool() {
    try {
      // get suggested params
      const suggestedParams = await algod.getTransactionParams().do();
      const appArgs = [new Uint8Array(Buffer.from("Deposit_BankingPool"))];

      console.log("accountAddress ", accountAddress);
      console.log("appAccount ", appAccount);

      const amt = amount * 1000000;

      const actionTx = algosdk.makeApplicationNoOpTxn(
        accountAddress,
        suggestedParams,
        appIndex,
        appArgs
      );

      const payTx = algosdk.makePaymentTxnWithSuggestedParams(
        accountAddress,
        appAccount,
        amt,
        undefined,
        undefined,
        suggestedParams
      );

      algosdk.assignGroupID([actionTx, payTx]);
      console.log("payTx ", payTx);

      const actionTxGroup = [
        { txn: actionTx, signers: [accountAddress] },
        { txn: payTx, signers: [accountAddress] },
      ];

      const stxn1 = await peraWallet.signTransaction([actionTxGroup]);
      //const stxn2 = await peraWallet.signTransaction([payTx]);

      console.log("Sending transactions...");
      const { txId } = await algod.sendRawTransaction(stxn1).do();
      const result = await waitForConfirmation(algod, txId, 2);
      checkCounterState();
      checkLocalCounterState();
    } catch (e) {
      console.error(`There was an error calling the counter app: ${e}`);
    }
  }

  async function withdrawBankingPool() {
    try {
      // get suggested params
      const suggestedParams = await algod.getTransactionParams().do();

      const amt = amount * 1000000;

      console.log("amt ", amt);

      const appArgs = [
        new Uint8Array(Buffer.from("Withdraw_BankingPool")),
        new Uint8Array(Buffer.from(amt)),
      ];

      console.log("accountAddress ", accountAddress);
      console.log("appAccount ", appAccount);

      const actionTx = algosdk.makeApplicationNoOpTxn(
        accountAddress,
        suggestedParams,
        appIndex,
        appArgs
      );

      const actionTxGroup = [{ txn: actionTx, signers: [accountAddress] }];

      const stxn1 = await peraWallet.signTransaction([actionTxGroup]);
      //const stxn2 = await peraWallet.signTransaction([payTx]);

      console.log("Sending transactions...");
      const { txId } = await algod.sendRawTransaction(stxn1).do();
      const result = await waitForConfirmation(algod, txId, 2);
      checkCounterState();
      checkLocalCounterState();
    } catch (e) {
      console.error(`There was an error calling the counter app: ${e}`);
    }
  }

  async function depositAccount() {
    try {
      // get suggested params
      const suggestedParams = await algod.getTransactionParams().do();
      const appArgs = [new Uint8Array(Buffer.from("Deposit_Account"))];

      const amt = amount * 1000000;

      const actionTx = algosdk.makeApplicationNoOpTxn(
        accountAddress,
        suggestedParams,
        appIndex,
        appArgs
      );

      const payTx = algosdk.makePaymentTxnWithSuggestedParams(
        accountAddress,
        appAccount,
        amt,
        undefined,
        undefined,
        suggestedParams
      );

      algosdk.assignGroupID([actionTx, payTx]);
      console.log("payTx ", payTx);

      const actionTxGroup = [
        { txn: actionTx, signers: [accountAddress] },
        { txn: payTx, signers: [accountAddress] },
      ];

      const stxn1 = await peraWallet.signTransaction([actionTxGroup]);
      //const stxn2 = await peraWallet.signTransaction([payTx]);

      console.log("Sending transactions...");
      const { txId } = await algod.sendRawTransaction(stxn1).do();
      const result = await waitForConfirmation(algod, txId, 2);
      checkCounterState();
      checkLocalCounterState();
    } catch (e) {
      console.error(`There was an error calling the counter app: ${e}`);
    }
  }

  async function withdrawAccount() {
    try {
      // get suggested params
      const suggestedParams = await algod.getTransactionParams().do();
      suggestedParams.fee = 2000;

      const amt = amount * 1000000;

      console.log("amt ", amt);

      const numberArg = getUint8Int(amt);

      const appArgs = [
        new Uint8Array(Buffer.from("Withdraw_Account")),
        numberArg,
      ];

      console.log("appArgs ", appArgs);

      const actionTx = algosdk.makeApplicationNoOpTxn(
        accountAddress,
        suggestedParams,
        appIndex,
        appArgs
      );

      const actionTxGroup = [{ txn: actionTx, signers: [accountAddress] }];

      const stxn1 = await peraWallet.signTransaction([actionTxGroup]);
      //const stxn2 = await peraWallet.signTransaction([payTx]);

      console.log("Sending transactions...");
      const { txId } = await algod.sendRawTransaction(stxn1).do();
      const result = await waitForConfirmation(algod, txId, 2);
      checkCounterState();
      checkLocalCounterState();
    } catch (e) {
      console.error(`There was an error calling the counter app: ${e}`);
    }
  }

  async function createCreditAccount() {
    try {
      // get suggested params
      const suggestedParams = await algod.getTransactionParams().do();
      const appArgs = [new Uint8Array(Buffer.from("Create_CreditAccount"))];

      console.log("localCreditDebt ", localCreditDebt);

      let tmpAmount = 1;
      if (localCreditDebt > 0) {
        tmpAmount = localCreditDebt / 1000000;
        tmpAmount += 1;
      }
      const amt = tmpAmount * 1000000;

      console.log("tmpAmount ", tmpAmount);
      console.log("amt ", amt);

      const actionTx = algosdk.makeApplicationNoOpTxn(
        accountAddress,
        suggestedParams,
        appIndex,
        appArgs
      );

      const payTx = algosdk.makePaymentTxnWithSuggestedParams(
        accountAddress,
        appAccount,
        amt,
        undefined,
        undefined,
        suggestedParams
      );

      algosdk.assignGroupID([actionTx, payTx]);
      console.log("payTx ", payTx);

      const actionTxGroup = [
        { txn: actionTx, signers: [accountAddress] },
        { txn: payTx, signers: [accountAddress] },
      ];

      const stxn1 = await peraWallet.signTransaction([actionTxGroup]);
      //const stxn2 = await peraWallet.signTransaction([payTx]);

      console.log("Sending transactions...");
      const { txId } = await algod.sendRawTransaction(stxn1).do();
      const result = await waitForConfirmation(algod, txId, 2);
      checkCounterState();
      checkLocalCounterState();
    } catch (e) {
      console.error(`There was an error calling the counter app: ${e}`);
    }
  }

  async function withdrawCreditAccount() {
    try {
      // get suggested params
      const suggestedParams = await algod.getTransactionParams().do();
      suggestedParams.fee = 2000;

      const amt = amount * 1000000;

      const numberArg = getUint8Int(amt);

      const appArgs = [
        new Uint8Array(Buffer.from("Withdraw_CreditAccount")),
        numberArg,
      ];

      const actionTx = algosdk.makeApplicationNoOpTxn(
        accountAddress,
        suggestedParams,
        appIndex,
        appArgs
      );

      const actionTxGroup = [{ txn: actionTx, signers: [accountAddress] }];

      const stxn1 = await peraWallet.signTransaction([actionTxGroup]);

      console.log("Sending transactions...");
      const { txId } = await algod.sendRawTransaction(stxn1).do();
      const result = await waitForConfirmation(algod, txId, 2);
      checkCounterState();
      checkLocalCounterState();
    } catch (e) {
      console.error(`There was an error calling the counter app: ${e}`);
    }
  }

  function getUint8Int(number) {
    const buffer = Buffer.alloc(8);
    const bigIntValue = BigInt(number);
    buffer.writeBigUInt64BE(bigIntValue);
    return Uint8Array.from(buffer);
  }
}

export default App;
