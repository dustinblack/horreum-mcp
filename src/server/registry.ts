const toolNames = new Set<string>();

export function registerToolName(name: string): void {
  toolNames.add(name);
}

export function getRegisteredToolsCount(): number {
  return toolNames.size;
}
