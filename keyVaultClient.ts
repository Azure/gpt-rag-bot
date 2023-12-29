import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export class KeyVaultClient {
  private secretClient: SecretClient;

  constructor() {
    const vaultName = process.env.AZURE_KEY_VAULT_NAME;
    const vaultUrl = `https://${vaultName}.vault.azure.net`;
    const credential = new DefaultAzureCredential();
    this.secretClient = new SecretClient(vaultUrl, credential);
  }

  async getSecret(secretName: string) {
    const secret = await this.secretClient.getSecret(secretName);
    return secret.value;
  }
}