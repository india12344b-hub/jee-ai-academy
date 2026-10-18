const CODE_BLOCK_OR_INLINE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*`+)/g;

function containsMathSyntax(expression) {
  const hasMathCommand =
    /\\(?:frac|dfrac|tfrac|sqrt|text|mathrm|mathbf|alpha|beta|gamma|delta|theta|lambda|mu|pi|rho|sigma|phi|omega|infty)\b/i.test(
      expression,
    );
  if (hasMathCommand) return true;

  const trimmedExpression = expression.trim();
  const chemicalElements = trimmedExpression.match(/[A-Z][a-z]?/g) ?? [];
  const isChemicalFormula =
    /^[A-Z][A-Za-z0-9_{}^+-]*$/.test(trimmedExpression) &&
    ((chemicalElements.length > 1 && /\d/.test(trimmedExpression)) ||
      /[+-]$/.test(trimmedExpression));
  if (isChemicalFormula) return false;

  if (/[A-Za-z]\s*[_^=<>]/.test(expression)) return true;

  const hasMathAtom = /(?:\b[A-Za-z]\b|\d|\\[A-Za-z]+)/.test(expression);
  const hasMathOperator =
    /[=<>±×÷*/+]/.test(expression) || /(?:\s-\s|[A-Za-z0-9]-[A-Za-z0-9])/.test(expression);
  return hasMathAtom && hasMathOperator;
}

function protectMatches(text, pattern, tokens) {
  return text.replace(pattern, (match) => {
    const token = `\u0000MATH${tokens.length}\u0000`;
    tokens.push(match);
    return token;
  });
}

function normalizeMathText(text) {
  const tokens = [];
  let normalized = text.replace(
    /\\\[([\s\S]+?)\\\]/g,
    (_, equation) => `\n\n$$\n${equation}\n$$\n\n`,
  );
  normalized = normalized.replace(
    /\\\(([\s\S]+?)\\\)/g,
    (_, equation) => `$${protectMatches(equation, /\$[^$\n]+\$/g, tokens)}$`,
  );
  normalized = normalized.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_, equation) => `\n\n$$\n${equation}\n$$\n\n`,
  );
  normalized = protectMatches(normalized, /\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g, tokens);

  normalized = normalized.replace(/\(([^()\n]{1,180})\)/g, (match, expression) =>
    containsMathSyntax(expression) ? `$${expression.trim()}$` : match,
  );

  return normalized.replace(/\u0000MATH(\d+)\u0000/g, (_, index) => tokens[index]);
}

export function normalizeMathMarkdown(markdown) {
  const code = [];
  const protectedCode = String(markdown).replace(CODE_BLOCK_OR_INLINE, (match) => {
    const token = `\u0000CODE${code.length}\u0000`;
    code.push(match);
    return token;
  });
  const normalized = normalizeMathText(protectedCode);
  return normalized.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => code[index]);
}

const LATEX_WORDS = new Map([
  ['alpha', 'alpha'],
  ['beta', 'beta'],
  ['gamma', 'gamma'],
  ['delta', 'delta'],
  ['epsilon', 'epsilon'],
  ['theta', 'theta'],
  ['lambda', 'lambda'],
  ['mu', 'mu'],
  ['pi', 'pi'],
  ['rho', 'rho'],
  ['sigma', 'sigma'],
  ['phi', 'phi'],
  ['omega', 'omega'],
  ['infty', 'infinity'],
]);

export function mathMarkdownToSpeech(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$/g, (_, bracket, dollar) =>
      mathToSpeech(bracket ?? dollar),
    )
    .replace(/\\\(([\s\S]+?)\\\)|\$([^$\n]+)\$/g, (_, bracket, dollar) =>
      mathToSpeech(bracket ?? dollar),
    )
    .replace(/\(([^()\n]{1,180})\)/g, (match, expression) =>
      containsMathSyntax(expression) ? mathToSpeech(expression) : match,
    )
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\([^)]*\)/g, '$1$2')
    .replace(/(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g, '$2$4')
    .replace(/[*_~`>#|]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mathToSpeech(expression) {
  return expression
    .replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1 divided by $2')
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'square root of $1')
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\(?:cdot|times)/g, ' times ')
    .replace(/\\(?:div)/g, ' divided by ')
    .replace(/\\(?:pm)/g, ' plus or minus ')
    .replace(/\\(?:leq|le)/g, ' less than or equal to ')
    .replace(/\\(?:geq|ge)/g, ' greater than or equal to ')
    .replace(/\\(?:neq|ne)/g, ' not equal to ')
    .replace(/\\(?:approx)/g, ' approximately ')
    .replace(/\\(?:to|rightarrow)/g, ' yields ')
    .replace(/\\([A-Za-z]+)/g, (command) => LATEX_WORDS.get(command.slice(1)) ?? command.slice(1))
    .replace(/_([A-Za-z0-9])/g, ' sub $1 ')
    .replace(/\^\{?2\}?/g, ' squared ')
    .replace(/\^\{?3\}?/g, ' cubed ')
    .replace(/\^\{?([A-Za-z0-9])\}?/g, ' to the power of $1 ')
    .replace(/[{}]/g, ' ')
    .replace(/\s*=\s*/g, ' equals ')
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*-\s*/g, ' minus ')
    .replace(/\s*\/\s*/g, ' over ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function markdownWordCount(markdown) {
  const text = mathMarkdownToSpeech(markdown);
  return text.match(/\b[\p{L}\p{N}]+\b/gu)?.length ?? 0;
}

function latexToAsciiMath(latex) {
  let text = latex.replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  text = text.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');
  text = text.replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1');
  text = text.replace(/\\begin\{(?:aligned|align\*?|array)(?:\{[^}]*\})?\}|\\end\{(?:aligned|align\*?|array)\}/g, '');
  text = text.replace(/\\(?:left|right)/g, '');
  text = text.replace(/\\(?:cdot|times)/g, '*');
  text = text.replace(/\\(?:div)/g, '/');
  text = text.replace(/\\(?:pm)/g, '+/-');
  text = text.replace(/\\(?:leq|le)/g, '<=');
  text = text.replace(/\\(?:geq|ge)/g, '>=');
  text = text.replace(/\\(?:neq|ne)/g, '!=');
  text = text.replace(/\\(?:approx)/g, '~');
  text = text.replace(/\\(?:to|rightarrow)/g, '->');
  text = text.replace(/\\(?:infty)/g, 'infinity');
  text = text.replace(/\\([A-Za-z]+)/g, (_, command) => LATEX_WORDS.get(command) ?? command);
  return text
    .replace(/\\\\/g, '\n')
    .replace(/\s*&\s*/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\[,;!]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

export function markdownToPdfLines(markdown) {
  return String(markdown)
    .replace(/```(?:[^\n]*)\n([\s\S]*?)```|~~~(?:[^\n]*)\n([\s\S]*?)~~~/g, (_, backtick, tilde) =>
      `\n${backtick ?? tilde}\n`,
    )
    .replace(/\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$/g, (_, bracket, dollar) =>
      `\n${latexToAsciiMath(bracket ?? dollar)}\n`,
    )
    .replace(/\\\(([\s\S]+?)\\\)|\$([^$\n]+)\$/g, (_, bracket, dollar) =>
      latexToAsciiMath(bracket ?? dollar),
    )
    .replace(/\(([^()\n]{1,180})\)/g, (match, expression) =>
      containsMathSyntax(expression) ? latexToAsciiMath(expression) : match,
    )
    .split('\n')
    .map((line) => {
      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
      if (heading) return { type: 'heading', level: heading[1].length, text: heading[2].trim() };
      const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
      if (bullet) return { type: 'body', text: `- ${bullet[1].trim()}` };
      const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (numbered) return { type: 'body', text: `${numbered[1]}. ${numbered[2].trim()}` };
      return {
        type: 'body',
        text: line
          .replace(/!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\([^)]*\)/g, '$1$2')
          .replace(/(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g, '$2$4')
          .replace(/^\s*>\s?/g, '')
          .replace(/[*_~`]/g, '')
          .trim(),
      };
    })
    .map((line) => ({
      ...line,
      text: line.text
        .replace(/[–—]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/…/g, '...')
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' '),
    }));
}
