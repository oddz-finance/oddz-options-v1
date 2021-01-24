import { Signer } from "@ethersproject/abstract-signer";

export interface Accounts {
  admin: string;
  admin1: string;
}

export interface Signers {
  admin: Signer;
  admin1: Signer;
}
