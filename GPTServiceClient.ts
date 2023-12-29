import axios from 'axios';
import dotenv from 'dotenv';
import { KeyVaultClient } from './keyVaultClient';

export class GPTServiceClient {
  private keyVaultClient: KeyVaultClient;

  constructor() {
    this.keyVaultClient = new KeyVaultClient();
  }

  public async callService(requestData: any): Promise<any> {
    const functionKey = await this.keyVaultClient.getSecret(process.env.SECRET_NAME);
    const response = await axios.post(process.env.ORCHESTRATOR_ENDPOINT, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': functionKey
      },
    });
    return response.data;
  }

  
}