import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  PrivateKey,
  Signature,
} from 'snarkyjs';

const ORACLE_PUBLIC_KEY =
  'B62qizxPbuzM1Ap9SCnoeX1d3nfynDDyjqAPFGNmEj1BX3pKJYQ5zdF';
const PRICE_TIMEOUT = new Field(300);

export class PythOracle extends SmartContract {
  // Define contract state
  @state(PublicKey) oraclePublicKey = State<PublicKey>();

  // Define contract events
  events = {
    pythCheck: Field,
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init(zkappKey: PrivateKey) {
    super.init(zkappKey);
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));

    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
  }

  @method verify(
    signature: Signature,
    id: Field,
    meanPrice: Field,
    confidenceInterval: Field,
    publishTime: Field,
    currentTime: Field
  ) {
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);
    // Evaluate whether the signature is valid for the provided data
    const validSignature = signature.verify(oraclePublicKey, [
      id,
      meanPrice,
      confidenceInterval,
      publishTime,
    ]);
    // Check that the signature is valid
    validSignature.assertTrue();

    // Validate that published time
    publishTime.assertGte(currentTime);
    publishTime.add(PRICE_TIMEOUT).gte(currentTime);
    // Hey are these tokens free? Will they pay me for them?
    meanPrice.gt(Field(0));
    // Are we positively confident?
    confidenceInterval.gte(Field(0));

    // Emit an event showing that
    this.emitEvent('pythCheck', id);
  }
}
