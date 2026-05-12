export type JoopoPiCodingAgentSkillSourceAugmentation = never;

declare module "@mariozechner/pi-coding-agent" {
  interface Skill {
    // Joopo relies on the source identifier returned by pi skill loaders.
    source: string;
  }
}
