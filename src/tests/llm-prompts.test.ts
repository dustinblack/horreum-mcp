import { describe, it, expect } from 'vitest';
import { getHorreumSystemPrompt, createUserPrompt } from '../llm/prompts.js';

describe('LLM Prompts', () => {
  describe('getHorreumSystemPrompt', () => {
    it('should return non-empty system prompt', () => {
      const prompt = getHorreumSystemPrompt();
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(100);
      expect(typeof prompt).toBe('string');
    });

    it('should include Horreum data model concepts', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for key Horreum concepts
      expect(prompt).toContain('Horreum');
      expect(prompt).toContain('test');
      expect(prompt).toContain('run');
      expect(prompt).toContain('dataset');
      expect(prompt).toContain('schema');
      expect(prompt).toContain('label');
    });

    it('should include tool information', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for MCP tool references (without horreum_ prefix)
      expect(prompt).toContain('list_tests');
      expect(prompt).toContain('list_runs');
      expect(prompt).toContain('get_schema');
    });

    it('should include natural language time guidance', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for time expression guidance
      expect(prompt).toContain('last week');
      expect(prompt).toContain('yesterday');
      expect(prompt).toContain('time');
    });

    it('should include query strategy guidance', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for strategy guidance
      expect(prompt).toContain('Strategy');
      expect(prompt).toContain('tool');
      expect(prompt).toContain('call');
    });

    it('should include example query patterns', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for example patterns
      expect(prompt).toContain('Example');
      expect(prompt.toLowerCase()).toMatch(/failed|slowest|compare|trends/);
    });

    it('should include best practices', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for best practices
      expect(prompt).toContain('Best');
      expect(prompt).toContain('Practices');
    });
  });

  describe('createUserPrompt', () => {
    it('should format user query correctly', () => {
      const query = 'Show me tests that failed';
      const prompt = createUserPrompt(query);

      expect(prompt).toContain(query);
      expect(prompt).toContain('User Query');
    });

    it('should include instructions for the LLM', () => {
      const query = 'Test query';
      const prompt = createUserPrompt(query);

      expect(prompt).toContain('TOOL_CALL');
      expect(prompt).toContain('EXECUTE');
      expect(prompt).toContain('tool');
    });

    it('should handle multi-line queries', () => {
      const query = 'Line 1\nLine 2\nLine 3';
      const prompt = createUserPrompt(query);

      expect(prompt).toContain('Line 1');
      expect(prompt).toContain('Line 2');
      expect(prompt).toContain('Line 3');
    });

    it('should handle empty query', () => {
      const query = '';
      const prompt = createUserPrompt(query);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle special characters in query', () => {
      const query = 'Test with "quotes" and <tags> and {braces}';
      const prompt = createUserPrompt(query);

      expect(prompt).toContain('"quotes"');
      expect(prompt).toContain('<tags>');
      expect(prompt).toContain('{braces}');
    });

    it('should handle very long queries', () => {
      const query = 'a'.repeat(1000);
      const prompt = createUserPrompt(query);

      expect(prompt).toContain(query);
      expect(prompt.length).toBeGreaterThan(1000);
    });
  });

  describe('Prompt Consistency', () => {
    it('should return same prompt on multiple calls', () => {
      const prompt1 = getHorreumSystemPrompt();
      const prompt2 = getHorreumSystemPrompt();

      expect(prompt1).toBe(prompt2);
    });

    it('should create consistent user prompts for same query', () => {
      const query = 'Test query';
      const prompt1 = createUserPrompt(query);
      const prompt2 = createUserPrompt(query);

      expect(prompt1).toBe(prompt2);
    });
  });

  describe('Prompt Content Quality', () => {
    it('should have reasonable length for system prompt', () => {
      const prompt = getHorreumSystemPrompt();

      // Should be substantial but not excessive
      expect(prompt.length).toBeGreaterThan(1000);
      expect(prompt.length).toBeLessThan(20000);
    });

    it('should be well-formatted with proper line breaks', () => {
      const prompt = getHorreumSystemPrompt();

      // Should contain line breaks for readability
      expect(prompt).toMatch(/\n/);

      // Should not have excessive consecutive line breaks
      expect(prompt).not.toMatch(/\n\n\n\n/);
    });

    it('should use clear section headings', () => {
      const prompt = getHorreumSystemPrompt();

      // Check for section markers (## or similar)
      expect(prompt).toMatch(/##|About|Available|Strategy|Example/);
    });
  });
});
