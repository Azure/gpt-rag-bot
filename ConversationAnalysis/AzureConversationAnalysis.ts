import axios, { AxiosResponse } from 'axios';
import { KeyVaultClient } from '../keyVaultClient';

export class AzureConversationAnalysis {
  private endpoint = process.env.AZURE_CONVERSATIONS_ENDPOINT +  '/language/analyze-conversations/jobs?api-version=2023-04-01';
  private subscriptionKey: string;
  private keyVaultClient: KeyVaultClient;

  constructor() {
    this.keyVaultClient = new KeyVaultClient();
  }

  async analyzeConversation(conversationData: any): Promise<any> {
    this.subscriptionKey = await this.keyVaultClient.getSecret(process.env.AZURE_CONVERSATIONS_KEY);
    const headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': this.subscriptionKey
    };
    let text = "no content";
    return axios.post(this.endpoint, conversationData, { headers })
    .then(async (jobTask) => {
      const operationLocation = jobTask.headers['operation-location'];
      if (!operationLocation) {
        throw new Error('Operation-Location header not found');
      }
      let statusResponse;
      do {
        await new Promise(resolve => setTimeout(resolve, 100));
        statusResponse = await axios.get(operationLocation, { headers });
      } while (statusResponse.data.tasks.completed !== 1);
      const tasks = statusResponse.data.tasks;
      const results = tasks.items[0].results;
      const conversations = results.conversations[0];
      const summaries = conversations.summaries[0];
      return summaries?.text;
    });

  }
}