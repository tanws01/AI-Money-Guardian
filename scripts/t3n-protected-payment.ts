import "dotenv/config";
import {
  T3nClient,
  createEthAuthInput,
  eth_get_address,
  getNodeUrl,
  getScriptVersion,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
} from "@terminal3/t3n-sdk";

const key = process.env.T3N_API_KEY;
const scriptName = process.env.T3N_CONTRACT_SCRIPT;
if (!key) throw new Error("T3N_API_KEY is required.");
if (!scriptName) throw new Error("T3N_CONTRACT_SCRIPT is required, e.g. z:<tenant-id>:money-guardian-policy");

setEnvironment(process.env.T3N_ENV ?? "testnet");
const wasmComponent = await loadWasmComponent();
const address = eth_get_address(key);
const client = new T3nClient({
  wasmComponent,
  handlers: { EthSign: metamask_sign(address, undefined, key) },
});

await client.handshake();
const did = await client.authenticate(createEthAuthInput(address));
const scriptVersion = await getScriptVersion(getNodeUrl(), scriptName);

const amount = Number(process.env.PAYMENT_AMOUNT ?? "500");
const maxAmount = Number(process.env.PAYMENT_MAX_AMOUNT ?? "500");
const consent = (process.env.PAYMENT_CONSENT ?? "true") === "true";

const result = await client.executeAndDecode({
  script_name: scriptName,
  script_version: scriptVersion,
  function_name: "authorize-payment",
  input: {
    amount,
    currency: "MYR",
    category: "utility",
    max_amount: maxAmount,
    consent,
  },
});

console.log(JSON.stringify({
  protected: true,
  agentDid: did.value,
  scriptName,
  scriptVersion,
  decision: result,
}, null, 2));
