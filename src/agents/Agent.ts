import { BaseAgent } from './baseAgent';
import { loadAgentDefinition } from './agentsRegistry';
import { OpenAIClient } from '../models/clients/OpenAiClient';
import { AnthropicClient } from '../models/clients/AnthropicClient';
import { FireworkClient } from '../models/clients/FireworkClient';
import { ModelClient } from '../types/agentSystem';
import * as z from 'zod';

export class Agent {
  private agent: BaseAgent<any>;

  constructor(agentName: string) {
    const agentDef = loadAgentDefinition(agentName);

    let modelClient: ModelClient;
    if (agentDef.client === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not set');
      }
      modelClient = new OpenAIClient(process.env.OPENAI_API_KEY, agentDef.model);
    } else if (agentDef.client === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not set');
      }
      modelClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY, agentDef.model);
    } else if (agentDef.client === 'fireworks') {
      if (!process.env.FIREWORKS_API_KEY) {
        throw new Error('FIREWORKS_API_KEY not set');
      }
      modelClient = new FireworkClient(process.env.FIREWORKS_API_KEY, agentDef.model);
    } else {
      throw new Error(`Unsupported model client: ${agentDef.client}`);
    }

    let outputSchema: z.ZodTypeAny | null = null;
    if (agentDef.output_schema) {
      try {
        outputSchema = jsonSchemaToZod(agentDef.output_schema);
      } catch (error) {
        console.error('Error converting output schema:', error);
        throw new Error('Failed to convert output schema to Zod schema');
      }
    }

    this.agent = new BaseAgent(
      {
        name: agentDef.name,
        description: agentDef.description,
        systemPromptTemplate: agentDef.system_prompt,
        dynamicVariables: agentDef.dynamic_variables || {},
      },
      modelClient,
      outputSchema
    );
  }

  public async run(userMessage?: string, dynamicVars?: { [key: string]: string }): Promise<{success: boolean; output: any; error?: string}> {
    return this.agent.run(userMessage, dynamicVars);
  }
}

function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || !schema.type) return z.any();

  switch (schema.type) {
    case 'object':
      const shape: { [key: string]: z.ZodTypeAny } = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]) => {
          let fieldSchema = jsonSchemaToZod(value as any);
          if ((value as any).description) {
            fieldSchema = fieldSchema.describe((value as any).description);
          }
          shape[key] = fieldSchema;
        });
      }
      let zodObj = z.object(shape);
      if (schema.required && Array.isArray(schema.required)) {
        const required = schema.required as string[];
        required.forEach(field => {
          if (shape[field]) {
            shape[field] = shape[field];
          }
        });
        zodObj = z.object(shape);
      }
      if (schema.description) {
        zodObj = zodObj.describe(schema.description);
      }
      return zodObj;
    case 'string':
      let strSchema = z.string();
      if (schema.description) {
        strSchema = strSchema.describe(schema.description);
      }
      return strSchema;
    case 'number':
      let numSchema = z.number();
      if (schema.description) {
        numSchema = numSchema.describe(schema.description);
      }
      return numSchema;
    case 'boolean':
      let boolSchema = z.boolean();
      if (schema.description) {
        boolSchema = boolSchema.describe(schema.description);
      }
      return boolSchema;
    case 'array':
      let arrSchema = z.array(schema.items ? jsonSchemaToZod(schema.items) : z.any());
      if (schema.description) {
        arrSchema = arrSchema.describe(schema.description);
      }
      return arrSchema;
    default:
      return z.any();
  }
}