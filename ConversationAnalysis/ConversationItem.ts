export class ConversationItem {
    text: string;
    id: string;
    role: string;
    participantId: string;

    constructor(text: string, id: string, role: string, participantId: string) {
        this.text = text;
        this.id = id;
        this.role = role;
        this.participantId = participantId;
    }
}

export class Conversation {
    conversationItems: ConversationItem[] = [];
    modality: string = "text";
    id: string;
    language: string ;

    constructor(id: string, language?: string) {
        this.id = id;
        this.language = language || "es";
    }

    addItem(item: ConversationItem) {
        this.conversationItems.push(item);
    }
}

export class ParametersNew {
    summaryAspects: string[];

    constructor(summaryAspects: string[]) {
        this.summaryAspects = summaryAspects;
    }
}

export class Task {
    taskName: string;
    kind: string;
    parameters: ParametersNew;

    constructor(taskName: string, kind: string, parameters: ParametersNew) {
        this.taskName = taskName;
        this.kind = kind;
        this.parameters = parameters;
    }
}

export class AnalysisInput {
    conversations: Conversation[];

    constructor(conversations: Conversation[]) {
        this.conversations = conversations;
    }
}

export class RootObject {
    displayName: string;
    analysisInput: AnalysisInput;
    tasks: Task[];

    constructor(displayName: string, analysisInput: AnalysisInput, tasks: Task[]) {
        this.displayName = displayName;
        this.analysisInput = analysisInput;
        this.tasks = tasks;
    }
}