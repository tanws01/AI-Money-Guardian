import "dotenv/config";
import { readFile } from "node:fs/promises";
import {
  T3nClient,
  TenantClient,
  createEthAuthInput,
  eth_get_address,
  getNodeUrl,
  getScriptVersion,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
} from "@terminal3/t3n-sdk";

const key = process.env.T3N_API_KEY;
if (!key) throw new Error("T3N_API_KEY is required.");

const environment = process.env.T3N_ENV ?? "testnet";
const tail = process.env.T3N_CONTRACT_TAIL ?? "money-guardian-policy";
const version = process.env.T3N_CONTRACT_VERSION ?? "0.1.0";
const wasmPath = process.env.T3N_WASM_PATH ?? "t3n-contract/target/wasm32-wasip2/release/money_guardian_policy.wasm";

setEnvironment(environment);
const wasmComponent = await loadWasmComponent();
const address = eth_get_address(key);
const t3n = new T3nClient({
  wasmComponent,
  handlers: { EthSign: metamask_sign(address, undefined, key) },
});

await t3n.handshake();
const did = await t3n.authenticate(createEthAuthInput(address));
const tenantDid = did.value;
const tenant = new TenantClient({ t3n, baseUrl: getNodeUrl(), tenantDid });

const wasm = await readFile(wasmPath);
const registered = await tenant.contracts.register({ tail, version, wasm });
const scriptName = `z:${tenantDid.slice("did:t3n:".length)}:${tail}`;

console.log(JSON.stringify({
  ok: true,
  environment,
  tenantDid,
  scriptName,
  contractId: registered.contract_id,
  version,
  next: "Set T3N_CONTRACT_SCRIPT to the scriptName, then invoke authorize-payment through the agent execute transport.",
}, null, 2));

const scriptVersion = await getScriptVersion(getNodeUrl(), scriptName);
console.log(JSON.stringify({ scriptVersion }, null, 2));
