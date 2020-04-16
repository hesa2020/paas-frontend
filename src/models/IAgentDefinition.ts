export interface IAgentDefinition {
  schemaVersion: number;
  dockerfileLines?: string[];
  imageName?: string;
  templateId?: string;
}
