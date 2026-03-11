export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // entering quote
    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
      continue;
    }

    // exiting quote
    if (char === quote) {
      quote = null;
      continue;
    }

    // split on space only if not inside quote
    if (char === " " && quote === null) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}
