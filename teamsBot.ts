import {
  TeamsActivityHandler,
  CardFactory,
  TurnContext,
  AdaptiveCardInvokeValue,
  AdaptiveCardInvokeResponse,
} from "botbuilder";
import rawAnswerCard from "./adaptiveCards/answer.json";
import rawEscalateCard from "./adaptiveCards/escalate.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import {GPTServiceClient} from "./GPTServiceClient";
import { MemoryStorage, ConversationState, UserState } from 'botbuilder';
import {DbService} from "./dbService"
import  {AzureConversationAnalysis} from "./ConversationAnalysis/AzureConversationAnalysis"
import  {ConversationItem, Conversation, RootObject, AnalysisInput, Task, ParametersNew} from "./ConversationAnalysis/ConversationItem"
import { AnswerDataInterface } from "./DataInterface";

// Configura el almacenamiento en memoria
const memoryStorage = new MemoryStorage();
// Crea el estado de la conversación y el estado del usuario
const conversationState = new ConversationState(memoryStorage);

export class TeamsBot extends TeamsActivityHandler {
  
  // record the messageCount
  private messageCount: number = 0;
  private maxRounds: number = Number(process.env.MAX_ROUNDS);
  private gptServiceClient: GPTServiceClient;

  constructor(gptServiceClient: GPTServiceClient) {
    super();
    this.gptServiceClient = gptServiceClient;

    this.onMessage(this.handleMessage.bind(this));
    this.onMembersAdded(this.handleMembersAdded.bind(this));
    this.handleTeamsMessagingExtensionSubmitAction = this.handleExtensionSubmitAction.bind(this);
    this.handleTeamsMessagingExtensionFetchTask = this.handleFetchTask.bind(this);  
    this.handleTeamsMessagingExtensionCardButtonClicked = this.handleCardButtonClicked.bind(this);
  }

  private async handleCardButtonClicked(context, cardData) 
  {
    throw new Error("Method not implemented.");
  }

  private async handleFetchTask(context, action) {
    let summary = await this.getConversationSummary(context);

    let textBck = rawEscalateCard.body.find((item: any) => item.type === 'TextBlock' && item.id === 'summary');
    if (textBck) {
      textBck.text = summary;
    }

    const card = CardFactory.adaptiveCard(rawEscalateCard);

    return {
      task: {
        type: 'continue',
        value: {
          card: card,
          title: 'Escalar',
          height: 250,
          width: 500
        }
      }
    };
  }


  // Invoked when an action is taken on an Adaptive Card. The Adaptive Card sends an event to the Bot and this
  // method handles that event.
  async onAdaptiveCardInvoke(
    context: TurnContext,
    invokeValue: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    // The verb "userlike" is sent from the Adaptive Card defined in adaptiveCards/learn.json
    if (invokeValue.action.verb === "like") {
      await context.sendActivity(
        "like"
      );
      return { statusCode: 200, type: undefined, value: undefined };
    }
    if (invokeValue.action.verb === "unlike") {
      await context.sendActivity(
        "unlike"
      );
      return { statusCode: 200, type: undefined, value: undefined };
    }
    if (invokeValue.action.verb === "escalate") {
      await context.sendActivity(
        "escalar"
      );
      return { statusCode: 200, type: undefined, value: undefined };
    }
  }

  private async handleExtensionSubmitAction(context, action) {
    // Crea la tarea y devuelve una tarjeta con un resumen de la tarea
    let summary = "Se escalo el caso";
    await context.sendActivity(
      summary
    );
    return {
      composeExtension: {
        type: 'result',
        attachmentLayout: 'list',
      }
    };
  }

  private async getConversationSummary(context: any) {
    const conversationData = await conversationState.load(context);
    let conversationId: string = conversationData.conversation_id;
    let summary = "";
    const dbServiceClient = new DbService();
    const data: any[] = await dbServiceClient.queryCosmosDB(conversationId);

    if (data.length > 0) {
      console.log(JSON.stringify(data[0].history));
      let count = 1;
      let conver = new Conversation(conversationId);

      data[0].history.forEach(element => {
        const currentItem = new ConversationItem(element.content, count.toString(), element.role, element.role);
        count++;
        conver.addItem(currentItem);
      });

      const recap = new Task("Conversation Recap", "ConversationalSummarizationTask", new ParametersNew(["recap"]));
      const analysis = new AnalysisInput([conver]);
      const root = new RootObject("Enterprise Chat Recap Task", analysis, [recap]);

      console.log(JSON.stringify(root));
      let conversationAnalysisClient = new AzureConversationAnalysis();
      summary = await conversationAnalysisClient.analyzeConversation(root);
    };
    return summary;
  }

  private async handleMessage(context, next) {
    try {
      switch (context.activity.type) {
        case 'message':
            await this.handleTextMessage(context);
            break;
        case 'invoke':
            if (context.activity.name === 'adaptiveCard/action') {
                await this.handleAdaptiveCardAction(context);
            }
            break;
        default:
            console.log(`Unknown activity type: ${context.activity.type}`);
            break;
    }
        
    } catch (error) {
      console.error('Error handling message:', error);
    }
  
    await next();
  }
  
  private handleAdaptiveCardAction(context: any) {
    throw new Error("Method not implemented.");
  }
   
  private async handleTextMessage(context: any) {
    const text = context.activity.text.trim();
    const command = text.toLowerCase();

    switch (command) {
      case 'nueva conversación':
      case 'nueva conversacion':
      case 'new chat':
      case 'reset':
        await this.handleNewChatCommand(context);
        break;
      default:
        await context.sendActivity({ type: 'typing' });
        await this.handleDefaultCommand(context, text);
        break;
    }
  }

  private async handleNewChatCommand(context) {
    await context.sendActivity(
      `He reiniciado la conversación ¿En qué puedo ayudarte hoy?`
    );
    this.messageCount = 0;
    const conversationData = await conversationState.load(context);
    // Guarda la información en el estado de la conversación
    conversationData.conversation_id = "";
    // Guarda los cambios
    await conversationState.saveChanges(context)

  }
  
  private async handleDefaultCommand(context, text) {
    this.messageCount++;
    // Obtén las propiedades de la conversació
    const conversationData = await conversationState.load(context);
    let conversationId: string = conversationData.conversation_id;

    const removedMentionText = TurnContext.removeRecipientMention(context.activity);
    const txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
    
    const requestData = {
      conversation_id: conversationId,
      question: txt,
    };

    const response = await this.gptServiceClient.callService(requestData);

    // Guarda la información en el estado de la conversación
    conversationData.conversation_id = response.conversation_id;
    // Guarda los cambios
    await conversationState.saveChanges(context);
    let respuesta = response.answer.replace(/<strong>/g,"**").replace(/<\/strong>/g,"**")

    let data: AnswerDataInterface = { answer: respuesta, count: this.messageCount, maxRounds: this.maxRounds };
    const card = AdaptiveCards.declare<AnswerDataInterface>(rawAnswerCard).render(data);
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    // By calling next() you ensure that the next BotHandler is run.
    if(this.messageCount == this.maxRounds)
    {
      await this.handleNewChatCommand(context);
    }
  }  

  private async handleMembersAdded(context, next) {
    const membersAdded = context.activity.membersAdded;
    for (let cnt = 0; cnt < membersAdded.length; cnt++) {
      if (membersAdded[cnt].id) {
        await context.sendActivity(
          `¡Hola! ¿En qué puedo ayudarte hoy?`
        );
        break;
      }
    }
    await next();
  }
}
