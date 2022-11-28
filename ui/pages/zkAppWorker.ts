import {
    Mina,
    isReady,
    PublicKey,
    PrivateKey,
    Field,
    fetchAccount,
  } from 'snarkyjs'
  
  type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;
  
  // ---------------------------------------------------------------------------------------
  
  import type { PythOracle } from '../../contracts/src/PythOracle';
  
  const state = {
    PythOracle: null as null | typeof PythOracle,
    zkapp: null as null | PythOracle,
    transaction: null as null | Transaction,
  }
  
  // ---------------------------------------------------------------------------------------
  
  const functions = {
    loadSnarkyJS: async (args: {}) => {
      await isReady;
    },
    setActiveInstanceToBerkeley: async (args: {}) => {
      const Berkeley = Mina.BerkeleyQANet(
        "https://proxy.berkeley.minaexplorer.com/graphql"
      );
      Mina.setActiveInstance(Berkeley);
    },
    loadContract: async (args: {}) => {
      const { PythOracle } = await import('../../contracts/build/src/PythOracle.js');
      state.PythOracle = PythOracle;
    },
    compileContract: async (args: {}) => {
      await state.PythOracle!.compile();
    },
    fetchAccount: async (args: { publicKey58: string }) => {
      const publicKey = PublicKey.fromBase58(args.publicKey58);
      return await fetchAccount({ publicKey });
    },
    initZkappInstance: async (args: { publicKey58: string }) => {
      const publicKey = PublicKey.fromBase58(args.publicKey58);
      state.zkapp = new state.PythOracle!(publicKey);
    },
    proveUpdateTransaction: async (args: {}) => {
      await state.transaction!.prove();
    },
    getTransactionJSON: async (args: {}) => {
      return state.transaction!.toJSON();
    },
  };
  
  // ---------------------------------------------------------------------------------------
  
  export type WorkerFunctions = keyof typeof functions;
  
  export type ZkappWorkerRequest = {
    id: number,
    fn: WorkerFunctions,
    args: any
  }
  
  export type ZkappWorkerReponse = {
    id: number,
    data: any
  }
  if (process.browser) {
    addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);
  
      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      }
      postMessage(message)
    });
  }