import fs from "node:fs";

export class Persistence {
  constructor(private readonly filePath: string) {}

  append(commandLine: string): void {
    fs.appendFileSync(this.filePath, commandLine + "\n", "utf8");
  }

  loadLines(): string[] {
    if (!fs.existsSync(this.filePath)) return [];
    const content = fs.readFileSync(this.filePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
}
