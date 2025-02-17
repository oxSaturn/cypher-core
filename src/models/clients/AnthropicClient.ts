import Anthropic from '@anthropic-ai/sdk';
import { ModelClient, ModelType } from '../../types/agentSystem';

export class AnthropicClient implements ModelClient {
  private anthropic: Anthropic;
  private _modelName: string;
  private defaultParams: any;
  modelType: ModelType = 'anthropic';

  constructor(
    apiKey: string,
    modelName: string,
    params: any = {}
  ) {
    this.anthropic = new Anthropic({ apiKey });
    this._modelName = modelName;
    this.defaultParams = {
      temperature: 0.8,
      max_tokens: 1000,
      ...params,
    };
  }

  get modelName(): string {
    return this._modelName;
  }

  async chatCompletion(params: any): Promise<any> {
    try {
      const messages = params.messages?.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

      const requestParams = {
        model: this._modelName,
        ...this.defaultParams,
        ...params,
        messages: messages || params.messages,
      };

      const response = await this.anthropic.messages.create(requestParams);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
