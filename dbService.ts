import { CosmosClient } from "@azure/cosmos";
import { KeyVaultClient } from "./keyVaultClient";

export class DbService {
  private endpoint = process.env.AZURE_COSMODB_ENDPOINT;
  private DBSecretName = process.env.AZURE_COSMODB_KEY;
  private databaseId = process.env.AZURE_COSMODB_DATABASEID;
  private containerId = process.env.AZURE_COSMODB_CONTAINERID;
  private client: CosmosClient;
  private keyVaultClient: KeyVaultClient;

  constructor() {
    this.keyVaultClient = new KeyVaultClient();
    
  }

  async queryCosmosDB(conversation_id: string) {
    const keyValue = await this.keyVaultClient.getSecret(this.DBSecretName)
    this.client = new CosmosClient({ endpoint: this.endpoint, key: keyValue });

    const querySpec = {
      query: "SELECT c.history FROM c WHERE c.id = @value",
      parameters: [
        {
          name: "@value",
          value: conversation_id
        }
      ]
    };

    const { resources: items } = await this.client
      .database(this.databaseId)
      .container(this.containerId)
      .items.query(querySpec)
      .fetchAll();

    return items;
  }
}